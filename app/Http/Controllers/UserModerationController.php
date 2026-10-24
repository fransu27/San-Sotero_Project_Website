<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use App\Models\ComplaintReport;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UserModerationController extends Controller
{
    public function reportPost(Request $request, Complaint $complaint): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401);
        abort_if($user->isAdmin(), 403, 'Administrators cannot report posts through the resident reporting flow.');
        abort_if($complaint->user_id === $user->id, 422, 'You cannot report your own post.');
        abort_unless($complaint->isPubliclyVisible(), 404);

        $data = $request->validate([
            'reason' => ['required', Rule::in(['Misinformation', 'Harassment or hate', 'Inappropriate content', 'Spam or scam', 'Privacy concern', 'Other'])],
            'details' => ['nullable', 'string', 'max:1000'],
        ]);

        $existing = ComplaintReport::where('complaint_id', $complaint->id)
            ->where('reporter_id', $user->id)->where('status', 'pending')->exists();
        if (! $existing) {
            ComplaintReport::create([
                'complaint_id' => $complaint->id,
                'reporter_id' => $user->id,
                'reason' => $data['reason'],
                'details' => isset($data['details']) ? trim(strip_tags($data['details'])) : null,
            ]);
        }
        return back()->with('success', 'Post report sent to the barangay administrators.');
    }

    public function moderateUser(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);
        abort_if($user->isAdmin(), 422, 'Administrator accounts cannot be moderated here.');
        $data = $request->validate([
            'action' => ['required', Rule::in(['activate', 'restrict', 'ban', 'profile_restrict', 'profile_restore'])],
            'reason' => ['required', 'string', 'min:5', 'max:300'],
            'days' => ['nullable', 'integer', 'min:1', 'max:365'],
        ]);
        $reason = trim(strip_tags($data['reason']));
        $action = $data['action'];

        if ($action === 'profile_restrict' || $action === 'profile_restore') {
            $user->forceFill([
                'profile_restricted' => $action === 'profile_restrict',
                'profile_restriction_reason' => $action === 'profile_restrict' ? $reason : null,
            ])->save();
        } else {
            $status = match ($action) { 'restrict' => 'restricted', 'ban' => 'banned', default => 'active' };
            $user->forceFill([
                'moderation_status' => $status,
                'restriction_expires_at' => $status === 'restricted' ? now()->addDays((int) ($data['days'] ?? 7)) : null,
                'moderation_reason' => $status === 'active' ? null : $reason,
            ])->save();
        }
        DB::table('user_moderation_events')->insert([
            'target_user_id' => $user->id,
            'actor_user_id' => $request->user()->id,
            'action' => $action,
            'reason' => $reason,
            'expires_at' => $user->restriction_expires_at,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return back()->with('success', 'User moderation action saved.');
    }

    public function reviewReport(Request $request, ComplaintReport $report): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);
        $data = $request->validate([
            'status' => ['required', Rule::in(['reviewed', 'dismissed', 'actioned'])],
            'admin_note' => ['required', 'string', 'min:5', 'max:1000'],
        ]);
        $note = trim(strip_tags($data['admin_note']));
        DB::transaction(function () use ($report, $data, $note, $request): void {
            $report->forceFill([
                'status' => $data['status'],
                'admin_note' => $note,
                'reviewed_by' => $request->user()->id,
            ])->save();

            if ($data['status'] === 'actioned' && $report->complaint) {
                $complaint = $report->complaint;
                $complaint->forceFill([
                    'removed_at' => now(),
                    'removed_reason' => $note,
                    'status' => 'Rejected',
                ])->save();
                $complaint->log('status', $request->user(), 'Rejected', $note);
            }
        });
        return back()->with('success', $data['status'] === 'actioned' ? 'Report reviewed and post removed with the recorded reason.' : 'Post report reviewed.');
    }
}
