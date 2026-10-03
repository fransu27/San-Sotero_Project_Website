<?php

namespace App\Http\Controllers;

use App\Http\Requests\ComplaintRequest;
use App\Models\Comment;
use App\Models\Complaint;
use App\Models\Reaction;
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
 *                    │              admin approves ──► shows in everyone's feed ──► admin moves the status along
 *                    │              admin declines (= "remove with reason") ──► author sees the reason
 *                    └──► PRIVATE : approval = approved immediately, but only the author + admins can ever see it
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
        $user = $request->user();
        $fields = $request->fields();
        $needsApproval = isset($fields['visibility']) && $fields['visibility'] === 'public' && (! $user || ! $user->isAdmin());

        /** @var Complaint $complaint */
        $complaint = DB::transaction(function () use ($request, $user, $fields, $needsApproval): Complaint {
            $complaint = new Complaint($fields);
            $complaint->user_id = (int) auth()->id();

            $path = $request->file('image')?->store('complaints');
            $complaint->image_path = ($path !== false && $path !== null) ? $path : null;

            // random filename
            $complaint->forceFill(['approval_status' => $needsApproval ? Complaint::APPROVAL_PENDING : Complaint::APPROVAL_APPROVED])->save();
            $complaint->log('submitted', $user);

            return $complaint;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => $needsApproval
            ? 'Report sent. It will appear in the feed once the barangay approves it.'
            : 'Report saved. Only you and the barangay can see it.']);

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
        Gate::authorize('update', $complaint);

        $user = $request->user();
        $isAuthor = $user !== null && $complaint->user_id === $user->id;
        $fields = $request->fields();

        if (! $isAuthor) {
            unset($fields['visibility'], $fields['is_anonymous']);
        }

        $sentBackToQueue = false;

        DB::transaction(function () use ($request, $complaint, $fields, $user, &$sentBackToQueue): void {
            if ($request->hasFile('image')) {
                $this->deletePhoto($complaint);
                $path = $request->file('image')?->store('complaints', 'public');
                $fields['image_path'] = ($path !== false && $path !== null) ? $path : null;
            } elseif ($request->boolean('remove_image')) {
                $this->deletePhoto($complaint);
                $fields['image_path'] = null;
            }

            $complaint->fill($fields);

            if ($user !== null && ! $user->isAdmin()) {
                $public = $complaint->visibility === 'public';
                $sentBackToQueue = $public;
                $complaint->approval_status = $public ? Complaint::APPROVAL_PENDING : Complaint::APPROVAL_APPROVED;
            }

            $complaint->forceFill(['edited_at' => now()])->save();
            $complaint->log($sentBackToQueue ? 'resubmitted' : 'edited', $user); // 'resubmitted' = back in the approval queue
        });

        if ($sentBackToQueue) {
            Inertia::flash('toast', ['type' => 'success', 'message' => 'Saved. Because it is public, the barangay will review your changes first.']);
        }

        return back();
    }

    /**
     * Approve a post waiting in the moderation queue (admin). Idempotent: approving twice does nothing.
     */
    public function approve(Request $request, Complaint $complaint): RedirectResponse
    {
        Gate::authorize('moderate', $complaint);

        if (! $complaint->isApproved()) {
            DB::transaction(function () use ($complaint, $request): void {
                $complaint->forceFill(['approval_status' => Complaint::APPROVAL_APPROVED])->save();
                $complaint->log('approved', $request->user());
            });
        }

        return back();
    }

    /**
     * Change the status (admin) and write it to the timeline so the resident can follow along.
     * - Only the five allowed statuses are accepted.
     * - A note is optional, except for "Rejected": the resident is owed a reason.
     * - A post still waiting for approval can't be moved along (the resident/community haven't seen it yet).
     */
    public function updateStatus(Request $request, Complaint $complaint): RedirectResponse
    {
        Gate::authorize('moderate', $complaint);

        /** @var array{status: string, note?: string|null} $data */
        $data = $request->validate([
            'status' => ['required', Rule::in(Complaint::STATUSES)],
            'note' => ['nullable', 'string', 'min:5', 'max:300', 'required_if:status,Rejected'],
        ], ['note.required_if' => 'Please give the resident a reason for rejecting this report.']);

        if (! $complaint->isApproved()) {
            throw ValidationException::withMessages(['status' => 'Approve this report before changing its status.']);
        }

        if ($data['status'] !== $complaint->status) {
            DB::transaction(function () use ($complaint, $data, $request): void {
                $complaint->forceFill(['status' => $data['status']])->save();
                $note = isset($data['note']) ? trim(strip_tags((string) $data['note'])) : null;
                $complaint->log('status', $request->user(), $data['status'], $note);
            });
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

        $this->deletePhoto($complaint);
        $complaint->delete(); // comments, votes and events go with it (foreign-key cascade)

        return back();
    }

    /**
     * Admin "remove" = flag with a time and a written reason; the row stays. This is also how an admin DECLINES
     * a post in the approval queue: the resident sees "Removed by the barangay: <reason>".
     * removed_* are not fillable, so they can only be set here through forceFill().
     */
    public function remove(Request $request, Complaint $complaint): RedirectResponse
    {
        Gate::authorize('moderate', $complaint);

        /** @var array{reason: string} $data */
        $data = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:300']]);

        $reason = trim(strip_tags($data['reason']));

        DB::transaction(function () use ($complaint, $reason, $request) {
            $wasWaiting = ! $complaint->isApproved();

            $complaint->forceFill(['removed_at' => now(), 'removed_reason' => $reason])->save();

            // Rejecting a post that was still in the queue = status "Rejected" + the reason on its timeline,
            // so the resident sees WHY on their own post.
            if ($wasWaiting) {
                $complaint->forceFill(['status' => 'Rejected'])->save();
                $complaint->log('status', $request->user(), 'Rejected', $reason);
            }
        });

        return back();
    }

    /** Admin: undo a removal. */
    public function restore(Complaint $complaint): RedirectResponse
    {
        Gate::authorize('moderate', $complaint);

        $complaint->forceFill(['removed_at' => null, 'removed_reason' => null])->save();

        return back();
    }

    /**
     * Comment on a complaint. Allowed on any post the person can see AND that is approved (policy "interact").
     * Text is stored as plain text; React escapes it on display (no XSS).
     */
    public function comment(Request $request, Complaint $complaint): RedirectResponse
    {
        Gate::authorize('interact', $complaint);

        /** @var array{body: string} $validated */
        $validated = $request->validate(['body' => ['required', 'string', 'max:1000']]);

        Comment::create([
            'complaint_id' => $complaint->id,
            'user_id' => (int) $request->user()?->id,
            'body' => trim(strip_tags($validated['body'])),
        ]);

        return back();
    }

    /**
     * Satisfied / Not satisfied. One vote per person per post: the same vote again removes it, the other switches it.
     * The unique (complaint_id, user_id) index makes double-voting impossible even under concurrent clicks.
     */
    public function react(Request $request, Complaint $complaint): RedirectResponse
    {
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

    /** Delete the photo file so no orphan files pile up on disk. */
    private function deletePhoto(Complaint $complaint): void
    {
        if ($complaint->image_path) {
            Storage::disk('public')->delete($complaint->image_path);
        }
    }
}
