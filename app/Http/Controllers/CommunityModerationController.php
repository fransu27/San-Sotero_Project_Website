<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Complaint;
use App\Models\ComplaintReport;
use App\Models\User;
use App\Notifications\ModerationQueueNotification;
use App\Notifications\ProfileRestrictedNotification;
use App\Services\ModerationAudit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CommunityModerationController extends Controller
{
    public function report(Request $request, Complaint $complaint): RedirectResponse
    {
        abort_unless($complaint->isPubliclyVisible(), 404);
        abort_if($request->user()->id === $complaint->user_id, 403, 'You cannot report your own post.');
        $data = $request->validate([
            'reason' => ['required', Rule::in(['misinformation', 'inappropriate_content', 'spam', 'harassment', 'false_complaint'])],
            'details' => ['nullable', 'string', 'max:1000'],
        ]);
        $report = ComplaintReport::firstOrCreate(
            [
                'complaint_id' => $complaint->id,
                'reporter_id' => $request->user()->id,
            ],
            [
                'reason' => $data['reason'],
                'details' => $data['details'] ?? null,
                'status' => 'pending',
            ]
        );
        if ($report->wasRecentlyCreated) {
            $threshold = max(1, (int) config('moderation.auto_hold_threshold', 6));
            $count = ComplaintReport::where('complaint_id', $complaint->id)->where('status', 'open')->count();
            if ($count >= $threshold && $complaint->isApproved() && ! $complaint->isRemoved()) {
                DB::transaction(function () use ($complaint, $count, $request) {
                    $locked = Complaint::whereKey($complaint->id)->lockForUpdate()->firstOrFail();
                    if ($locked->isApproved() && ! $locked->isRemoved()) {
                        $locked->forceFill(['approval_status' => Complaint::APPROVAL_PENDING])->save();
                        $locked->log('status', $request->user(), null, 'Automatically placed on hold after multiple resident reports ('.$count.').');
                    }
                });
                User::where('role', 'admin')->get()->each(fn (User $admin) => $admin->notify(new ModerationQueueNotification($complaint->id, $count)));
            }
        }

        return back()->with('success', 'Thank you. Your report has been sent to the moderation queue.');
    }

    public function permalink(Complaint $complaint): Response
    {
        abort_unless($complaint->isPubliclyVisible(), 404);

        return Inertia::render('public-newsfeed', ['permalinkComplaintId' => $complaint->id]);
    }

    public function restrictUser(Request $request, User $user, ModerationAudit $audit): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        abort_if($user->isAdmin(), 422, 'Administrator accounts cannot be restricted through this action.');
        $data = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:1000']]);
        DB::transaction(function () use ($user, $data, $request, $audit) {
            // Profile restriction only swaps the picture for the anonymous placeholder and freezes it; the original file and
            // other profile data stay intact (restored when the restriction ends) and posting is unaffected.
            $user->forceFill([
                'profile_restricted' => true, 'profile_restriction_reason' => $data['reason'], 'profile_restriction_expires_at' => null,
            ])->save();
            $audit->record($request, 'user.profile_restricted', $user, ['reason' => $data['reason']]);
        });
        $user->notify(new ProfileRestrictedNotification($data['reason']));

        return back()->with('success', 'Profile picture restricted and resident notified.');
    }

    public function banUser(Request $request, User $user, ModerationAudit $audit): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        abort_if($user->isAdmin() || $user->is($request->user()), 422, 'You cannot ban this account.');
        $data = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:1000']]);
        $user->forceFill(['banned_at' => now(), 'ban_reason' => $data['reason']])->save();
        $audit->record($request, 'user.banned', $user, ['reason' => $data['reason']]);

        return back()->with('success', 'Account banned. Ensure your authentication middleware rejects banned users on subsequent requests.');
    }

    public function takeDown(Request $request, Complaint $complaint, ModerationAudit $audit): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $data = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:1000']]);
        $complaint->forceFill(['removed_at' => now(), 'removed_reason' => $data['reason']])->save();
        $complaint->log('removed', $request->user(), null, $data['reason']);
        $audit->record($request, 'complaint.taken_down', $complaint, ['reason' => $data['reason']]);

        return back()->with('success', 'Post taken down.');
    }

    public function queue(Request $request): Response
    {
        abort_unless($request->user()->isAdmin(), 403);
        $reports = ComplaintReport::with([
            'reporter:id,name,email',
            'complaint:id,title,user_id,approval_status,visibility,removed_at',
        ])
            ->where('status', 'open')->latest()->paginate(30)->withQueryString();
        $users = User::query()->where('role', '!=', 'admin')->latest('id')->paginate(30, ['id', 'name', 'email', 'role', 'avatar_path', 'restricted_at', 'banned_at', 'last_seen_at', 'created_at'], 'users_page');

        return Inertia::render('admin/community-moderation', [
            'reports' => $reports,
            'users' => $users,
            'metrics' => [
                'open_reports' => ComplaintReport::where('status', 'open')->count(),
                'visitors_today' => ActivityLog::where('action', 'visitor.page_view')->whereDate('created_at', today())->count(),
                'online_users' => User::where('last_seen_at', '>=', now()->subMinutes((int) config('moderation.online_window_minutes', 5)))->count(),
            ],
            'threshold' => (int) config('moderation.auto_hold_threshold', 6),
        ]);
    }
}
