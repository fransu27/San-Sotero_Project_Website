<?php

namespace App\Http\Controllers;

use App\Http\Requests\ComplaintRequest;
use App\Models\Comment;
use App\Models\Complaint;
use App\Models\Rating;
use App\Models\Reaction;
use App\Notifications\CommunityActivityNotification;
use App\Services\ModerationAudit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Complaint lifecycle:
 *
 *   resident files it ──► PUBLIC  : approval = pending  (only the author + admins can see it)
 *                      │           admin approves ──► shows in everyone's feed ──► admin moves the status along
 *                      │           admin declines (= "remove with reason") ──► author sees the reason
 *                      └──► PRIVATE : approval = approved immediately, but only the author + admins can ever see it
 *
 * Every action that touches an EXISTING complaint starts with a policy check (see App\Policies\ComplaintPolicy).
 */
class ComplaintController extends Controller
{
    /**
     * File a complaint.
     * - Input is validated/cleaned by ComplaintRequest.
     * - user_id comes from the session, never from the request body.
     * - approval_status is decided HERE: a public post from a resident must wait for an admin; a private post
     *   is never shown to anyone but staff, so it needs no approval.
     * - The first timeline line ("submitted") is written in the same transaction as the complaint.
     */
    public function store(ComplaintRequest $request): RedirectResponse
    {
        $this->assertPostingAllowed($request);
        $user = $request->user();
        $fields = $request->fields();
        $needsApproval = isset($fields['visibility']) && $fields['visibility'] === 'public' && (! $user || ! $user->isAdmin());

        // Filesystem writes are not rolled back with the database. Track the new photo so a failed
        // transaction does not leave an orphaned upload behind.
        $newImagePath = null;
        try {
            /** @var Complaint $complaint */
            $complaint = DB::transaction(function () use ($request, $user, $fields, $needsApproval, &$newImagePath): Complaint {
                $complaint = new Complaint($fields);
                $complaint->user_id = (int) auth()->id();
                // Human-readable support reference; the unique index is the final collision guard.
                $complaint->ticket_code = Complaint::newTicketCode();

                $newImagePath = $request->file('image')?->store('complaints', 'public');
                if ($request->hasFile('image') && (! is_string($newImagePath) || $newImagePath === '')) {
                    throw ValidationException::withMessages(['image' => 'The photo could not be saved. Please try again.']);
                }
                $complaint->image_path = is_string($newImagePath) ? $newImagePath : null;

                $complaint->forceFill(['approval_status' => $needsApproval ? Complaint::APPROVAL_PENDING : Complaint::APPROVAL_APPROVED])->save();
                $complaint->log('submitted', $user);
                $complaint->syncAttachments($request->file('files', []), [], $user?->id);

                return $complaint;
            });
        } catch (\Throwable $exception) {
            if (is_string($newImagePath) && $newImagePath !== '') {
                Storage::disk('public')->delete($newImagePath);
            }
            throw $exception;
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => $needsApproval
            ? 'Report sent. It will appear in the feed once the barangay approves it.'
            : 'Report saved. Only you and the barangay can see it.']);
        // The composer shows this code on screen right after submitting (see "Report submitted" card).
        Inertia::flash('ticket', ['code' => $complaint->ticket_code, 'needs_approval' => $needsApproval]);

        return back();
    }

    /**
     * Edit a complaint (author or admin).
     * - A resident's edit of a PUBLIC post sends it back to the approval queue, otherwise someone could get a
     *   harmless post approved and then change it to something abusive.
     * - An admin editing somebody else's post can fix the text, but NOT their privacy choices
     *   (visibility / anonymous) — those belong to the author.
     * - Photo: a new upload replaces the old file; remove_image deletes it. edited_at feeds the "Edited" label.
     */
    public function update(ComplaintRequest $request, Complaint $complaint): RedirectResponse
    {
        $this->assertPostingAllowed($request);
        Gate::authorize('update', $complaint);

        $user = $request->user();
        $isAuthor = $user !== null && $complaint->user_id === $user->id;
        $fields = $request->fields();

        if (! $isAuthor) {
            unset($fields['visibility'], $fields['is_anonymous']);
        }

        $sentBackToQueue = false;
        $oldImagePath = $complaint->image_path;
        $newImagePath = null;
        try {
            DB::transaction(function () use ($request, $complaint, $fields, $user, &$sentBackToQueue, &$newImagePath): void {
                if ($request->hasFile('image')) {
                    $newImagePath = $request->file('image')?->store('complaints', 'public');
                    if (! is_string($newImagePath) || $newImagePath === '') {
                        throw ValidationException::withMessages(['image' => 'The photo could not be saved. Your existing photo was kept. Please try again.']);
                    }
                    $fields['image_path'] = $newImagePath;
                } elseif ($request->boolean('remove_image')) {
                    $fields['image_path'] = null;
                }

                $complaint->fill($fields);

                if ($user !== null && ! $user->isAdmin()) {
                    $public = $complaint->visibility === 'public';
                    $sentBackToQueue = $public;
                    $complaint->approval_status = $public ? Complaint::APPROVAL_PENDING : Complaint::APPROVAL_APPROVED;
                }

                $complaint->forceFill(['edited_at' => now()])->save();
                $complaint->syncAttachments($request->file('files', []), (array) $request->input('remove_files', []), $user?->id);
                $complaint->log($sentBackToQueue ? 'resubmitted' : 'edited', $user);
            });
        } catch (\Throwable $exception) {
            if (is_string($newImagePath) && $newImagePath !== '') {
                Storage::disk('public')->delete($newImagePath);
            }
            throw $exception;
        }

        // Only delete the previous photo after the DB commit succeeded. A failed edit must keep
        // the old, still-referenced image available to the resident.
        if ($oldImagePath && ($oldImagePath !== $complaint->image_path)) {
            Storage::disk('public')->delete($oldImagePath);
        }

        if ($sentBackToQueue) {
            Inertia::flash('toast', ['type' => 'success', 'message' => 'Saved. Because it is public, the barangay will review your changes first.']);
        }

        return back();
    }

    /**
     * Approve a post waiting in the moderation queue (admin). Idempotent: approving twice does nothing.
     */
    public function approve(Request $request, Complaint $complaint, ModerationAudit $audit): RedirectResponse
    {
        Gate::authorize('moderate', $complaint);

        $data = $request->validate([
            'note' => ['nullable', 'string', 'min:3', 'max:300'],
        ]);

        if (! $complaint->isApproved() && ! $complaint->isRemoved()) {
            DB::transaction(function () use ($complaint, $request, $data, $audit): void {
                $complaint->forceFill(['approval_status' => Complaint::APPROVAL_APPROVED])->save();
                $note = isset($data['note']) ? trim(strip_tags((string) $data['note'])) : null;
                $complaint->log('approved', $request->user(), null, $note);
                $audit->record($request, 'complaint.approved', $complaint, ['reason' => $note, 'new_approval_status' => Complaint::APPROVAL_APPROVED]);
            });
        }

        return back();
    }

    /**
     * Change the status (admin) and write it to the timeline so the resident can follow along.
     * - Public lifecycle statuses exclude rejection; declining a submission happens in moderation via remove().
     * - A note is optional for ordinary status updates.
     * - A post still waiting for approval can't be moved along (the resident/community haven't seen it yet).
     */
    public function updateStatus(Request $request, Complaint $complaint, ModerationAudit $audit): RedirectResponse
    {
        Gate::authorize('moderate', $complaint);

        /** @var array{status: string, note?: string|null} $data */
        $data = $request->validate([
            'status' => ['required', Rule::in(array_values(array_diff(Complaint::STATUSES, ['Rejected'])))],
            'note' => ['nullable', 'string', 'min:5', 'max:300'],
        ]);

        if (! $complaint->isApproved()) {
            throw ValidationException::withMessages(['status' => 'Approve this report before changing its status.']);
        }

        if ($data['status'] !== $complaint->status) {
            $previousStatusForNotification = $complaint->status;
            DB::transaction(function () use ($complaint, $data, $request, $audit): void {
                $previousStatus = $complaint->status;
                $complaint->forceFill(['status' => $data['status']])->save();
                $note = isset($data['note']) ? trim(strip_tags((string) $data['note'])) : null;
                $complaint->log('status', $request->user(), $data['status'], $note);
                $audit->record($request, 'complaint.status_changed', $complaint, ['reason' => $note, 'previous_status' => $previousStatus, 'new_status' => $data['status']]);
            });
            $complaint->loadMissing('user');
            if ($complaint->user && (int) $complaint->user_id !== (int) $request->user()?->id) {
                $complaint->user->notify(new CommunityActivityNotification('Complaint status updated', 'Your report “'.$complaint->title.'” changed from '.$previousStatusForNotification.' to '.$data['status'].'.', '/my-submissions'));
            }
        }

        return back();
    }

    /**
     * The author permanently deletes THEIR OWN post (row, comments, votes, timeline and photo file).
     * The policy allows only the author — not even an admin — so admins use remove() and leave a paper trail.
     */
    public function destroy(Request $request, Complaint $complaint): RedirectResponse
    {
        Gate::authorize('delete', $complaint);

        $photoPath = $complaint->image_path;
        DB::transaction(static function () use ($complaint): void {
            $complaint->delete(); // comments, votes and events go with it (foreign-key cascade)
        });
        if ($photoPath) {
            Storage::disk('public')->delete($photoPath);
        }

        return back();
    }

    /**
     * Admin "remove" = flag with a time and a written reason; the row stays. This is also how an admin DECLINES
     * a post in the approval queue: the resident sees "Removed by the barangay: <reason>".
     * removed_* are not fillable, so they can only be set here through forceFill().
     */
    public function remove(Request $request, Complaint $complaint, ModerationAudit $audit): RedirectResponse
    {
        Gate::authorize('moderate', $complaint);

        /** @var array{reason: string} $data */
        $data = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:300']]);

        $reason = trim(strip_tags($data['reason']));

        DB::transaction(function () use ($complaint, $reason, $request, $audit): void {
            // A disapproval is a recorded decision, not just a hidden card. Keep the row and reason
            // so the resident can see the outcome in My Submissions and the progress timeline.
            $complaint->forceFill([
                'removed_at' => now(),
                'removed_reason' => $reason,
                // Preserve the real workflow status so restoring a wrongly removed post can put it back.
                'status_before_removal' => $complaint->status,
                'status' => 'Rejected',
            ])->save();

            $complaint->log('status', $request->user(), 'Rejected', $reason);
            $audit->record($request, 'complaint.removed', $complaint, ['reason' => $reason, 'new_status' => 'Rejected']);
        });

        return back();
    }

    /**
     * Admin: undo a removal (e.g. the wrong post was removed). The post comes back exactly as it was before,
     * and a "restored" line is added to the timeline so the decision history stays honest.
     */
    public function restore(Request $request, Complaint $complaint, ModerationAudit $audit): RedirectResponse
    {
        Gate::authorize('moderate', $complaint);

        if ($complaint->isRemoved()) {
            DB::transaction(function () use ($complaint, $request, $audit): void {
                $previousReason = $complaint->removed_reason;
                $previousStatus = $complaint->status_before_removal ?: 'Pending';
                $complaint->forceFill([
                    'removed_at' => null,
                    'removed_reason' => null,
                    'status' => $previousStatus,
                    'status_before_removal' => null,
                ])->save();
                $complaint->log('restored', $request->user(), $previousStatus, 'Restored after removal.');
                $audit->record($request, 'complaint.restored', $complaint, ['previous_reason' => $previousReason, 'restored_status' => $previousStatus]);
            });
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Post restored.']);

        return back();
    }

    /**
     * Comment on a complaint. Allowed on any post the person can see AND that is approved (policy "interact").
     * Text is stored as plain text; React escapes it on display (no XSS).
     */
    public function comment(Request $request, Complaint $complaint): RedirectResponse
    {
        $this->assertPostingAllowed($request);
        Gate::authorize('interact', $complaint);

        /** @var array{body: string} $validated */
        $validated = $request->validate(['body' => ['required', 'string', 'max:1000']]);

        Comment::create([
            'complaint_id' => $complaint->id,
            'user_id' => (int) $request->user()?->id,
            'body' => trim(strip_tags($validated['body'])),
        ]);
        if ($complaint->user && (int) $complaint->user_id !== (int) $request->user()?->id) {
            $complaint->user->notify(new CommunityActivityNotification('Someone commented on your complaint', 'A resident commented on “'.$complaint->title.'”.', '/newsfeed'));
        }

        return back();
    }

    /** A comment author may remove their own comment; other users cannot delete it. */
    public function destroyComment(Request $request, Comment $comment): RedirectResponse
    {
        abort_unless((int) $comment->user_id === (int) $request->user()?->id, 403, 'You can only remove your own comments.');
        $comment->delete();

        return back()->with('success', 'Comment removed.');
    }

    /**
     * Satisfied / Not satisfied. One vote per person per post: the same vote again removes it, the other switches it.
     * The unique (complaint_id, user_id) index makes double-voting impossible even under concurrent clicks.
     */
    public function react(Request $request, Complaint $complaint): RedirectResponse
    {
        $this->assertPostingAllowed($request);
        Gate::authorize('interact', $complaint);

        $user = $request->user();
        if ($user === null) {
            return back();
        }

        /** @var array{type: string} $validated */
        $validated = $request->validate(['type' => ['required', Rule::in(Reaction::TYPES)]]);
        $type = $validated['type'];

        /** @var Reaction|null $existing */
        $existing = Reaction::where(['complaint_id' => $complaint->id, 'user_id' => $user->id])->first();

        if ($existing && $existing->type === $type) {
            $existing->delete();
        } else {
            Reaction::updateOrCreate(['complaint_id' => $complaint->id, 'user_id' => $user->id], ['type' => $type]);
        }

        return back();
    }

    /**
     * 1-5 star community rating, only after the barangay CLOSED the post (Resolved or Rejected).
     * One rating per person per post: a new number replaces the old one, the same number again clears it.
     * The unique (complaint_id, user_id) index makes double-rating impossible even under concurrent clicks.
     */
    public function rate(Request $request, Complaint $complaint): RedirectResponse
    {
        $this->assertPostingAllowed($request);
        Gate::authorize('interact', $complaint);
        abort_unless($complaint->isClosed(), 422, 'You can rate a concern after it is resolved or rejected.');

        $user = $request->user();
        if ($user === null) {
            return back();
        }

        /** @var array{rating: int|string} $validated */
        $validated = $request->validate(['rating' => ['required', 'integer', 'between:'.Rating::MIN.','.Rating::MAX]]);
        $stars = (int) $validated['rating'];

        /** @var Rating|null $existing */
        $existing = Rating::where(['complaint_id' => $complaint->id, 'user_id' => $user->id])->first();

        if ($existing && $existing->rating === $stars) {
            $existing->delete();
        } else {
            Rating::updateOrCreate(['complaint_id' => $complaint->id, 'user_id' => $user->id], ['rating' => $stars]);
        }

        return back();
    }

    private function assertPostingAllowed(Request $request): void
    {
        $user = $request->user();
        if ($user && ! $user->isAdmin() && $user->isPostingRestricted()) {
            $message = $user->effectiveModerationStatus() === 'banned'
                ? 'Your account is banned from posting and interacting. Reason: '.($user->moderation_reason ?: 'No reason provided.')
                : 'Your account is temporarily restricted until '.($user->restriction_expires_at?->toDateTimeString() ?? 'further notice').'. Reason: '.($user->moderation_reason ?: 'No reason provided.');
            throw ValidationException::withMessages(['moderation' => $message]);
        }
    }
}
