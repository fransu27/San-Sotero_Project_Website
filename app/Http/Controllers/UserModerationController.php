<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use App\Models\ComplaintReport;
use App\Models\User;
use App\Notifications\AccountModerationNotification;
use App\Notifications\ModerationQueueNotification;
use App\Notifications\ProfileRestrictedNotification;
use App\Services\ModerationAudit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UserModerationController extends Controller
{
    public function reportPost(
        Request $request,
        Complaint $complaint,
        ModerationAudit $audit
    ): RedirectResponse {
        $user = $request->user();

        abort_unless($user !== null, 401);
        abort_if(
            $user->isAdmin(),
            403,
            'Administrators cannot report posts through the resident reporting flow.'
        );
        abort_if(
            $complaint->user_id === $user->id,
            422,
            'You cannot report your own post.'
        );
        abort_unless($complaint->isPubliclyVisible(), 404);

        $data = $request->validate([
            'reason' => [
                'required',
                Rule::in([
                    'Misinformation',
                    'Harassment or hate',
                    'Inappropriate content',
                    'Spam or scam',
                    'Privacy concern',
                    'Other',
                ]),
            ],
            'details' => ['nullable', 'string', 'max:1000'],
        ]);

        $created = false;
        $autoHeld = false;
        $count = 0;

        DB::transaction(function () use (
            $complaint,
            $user,
            $data,
            $request,
            $audit,
            &$created,
            &$autoHeld,
            &$count
        ): void {
            $locked = Complaint::whereKey($complaint->id)
                ->lockForUpdate()
                ->firstOrFail();

            abort_unless($locked->isPubliclyVisible(), 404);

            $report = ComplaintReport::firstOrCreate(
                [
                    'complaint_id' => $locked->id,
                    'reporter_id' => $user->id,
                ],
                [
                    'reason' => $data['reason'],
                    'details' => isset($data['details'])
                        ? trim(strip_tags($data['details']))
                        : null,
                    'status' => 'pending',
                ]
            );

            $created = $report->wasRecentlyCreated;

            if (! $created) {
                return;
            }

            $audit->record($request, 'complaint.reported', $report, [
                'complaint_id' => $locked->id,
                'reason' => $data['reason'],
            ]);

            $count = ComplaintReport::where('complaint_id', $locked->id)
                ->where('status', 'pending')
                ->count();

            $threshold = max(
                1,
                (int) config('moderation.auto_hold_threshold', 6)
            );

            if (
                $count >= $threshold
                && $locked->isApproved()
                && ! $locked->isRemoved()
            ) {
                $locked->forceFill([
                    'approval_status' => Complaint::APPROVAL_PENDING,
                ])->save();

                $locked->log(
                    'status',
                    $user,
                    null,
                    'Automatically placed on hold after reaching the configured resident-report threshold.'
                );

                $audit->record($request, 'complaint.auto_held', $locked, [
                    'reason' => 'Configured resident-report threshold reached.',
                    'report_count' => $count,
                    'threshold' => $threshold,
                ]);

                $autoHeld = true;
            }
        });

        if ($autoHeld) {
            User::where('role', 'admin')
                ->get()
                ->each(
                    fn (User $admin) => $admin->notify(
                        new ModerationQueueNotification($complaint->id, $count)
                    )
                );
        }

        return back()->with(
            'success',
            $created
                ? 'Thank you. Your report has been sent to the moderation queue.'
                : 'You have already reported this post.'
        );
    }

    /**
     * Calculate the expiry for an action with an optional duration.
     *
     * @param  array<string, mixed>  $data
     */
    private function expiryFrom(array $data): ?Carbon
    {
        if (! isset($data['duration']) && ! isset($data['days'])) {
            return null;
        }

        $amount = (int) ($data['duration'] ?? $data['days']);

        $expiry = isset($data['duration'])
            ? match ($data['unit'] ?? 'days') {
                'seconds' => now()->addSeconds($amount),
                'minutes' => now()->addMinutes($amount),
                'hours' => now()->addHours($amount),
                default => now()->addDays($amount),
            }
        : now()->addDays($amount);

        return Carbon::instance($expiry);
    }

    public function moderateUser(
        Request $request,
        User $user,
        ModerationAudit $audit
    ): RedirectResponse {
        abort_unless($request->user()?->isAdmin(), 403);

        abort_if(
            $user->isAdmin() || $user->is($request->user()),
            422,
            'Administrator accounts cannot be moderated here.'
        );

        $data = $request->validate([
            'action' => [
                'required',
                Rule::in([
                    'activate',
                    'restrict',
                    'ban',
                    'profile_restrict',
                    'profile_restore',
                ]),
            ],
            'reason' => ['required', 'string', 'min:5', 'max:300'],
            'duration' => [
                Rule::requiredIf(
                    fn () => $request->input('action') === 'restrict'
                        && ! $request->filled('days')
                ),
                'nullable',
                'integer',
                'min:1',
                'max:31536000',
            ],
            'unit' => [
                'nullable',
                Rule::in(['seconds', 'minutes', 'hours', 'days']),
            ],
            'days' => [
                Rule::requiredIf(
                    fn () => $request->input('action') === 'restrict'
                        && ! $request->filled('duration')
                ),
                'nullable',
                'integer',
                'min:1',
                'max:365',
            ],
        ]);

        $reason = trim(strip_tags($data['reason']));
        $action = $data['action'];

        $before = [
            'moderation_status' => $user->moderation_status,
            'profile_restricted' => (bool) $user->profile_restricted,
            'banned_at' => $user->banned_at?->toIso8601String(),
        ];

        DB::transaction(function () use (
            $user,
            $data,
            $reason,
            $action,
            $request,
            $audit,
            $before
        ): void {
            if (
                $action === 'profile_restrict'
                || $action === 'profile_restore'
            ) {
                $restricted = $action === 'profile_restrict';

                $user->forceFill([
                    'profile_restricted' => $restricted,
                    'profile_restriction_reason' => $restricted
                        ? $reason
                        : null,
                    'profile_restriction_expires_at' => $restricted
                        ? $this->expiryFrom($data)
                        : null,
                ])->save();

                // Only the profile picture is affected. The original file is
                // kept for restoration. Account status remains independent.
            } else {
                $status = match ($action) {
                    'restrict' => 'restricted',
                    'ban' => 'banned',
                    default => 'active',
                };

                $user->forceFill([
                    'moderation_status' => $status,
                    'restriction_expires_at' => $status === 'restricted'
                        ? $this->expiryFrom($data)
                        : null,
                    'moderation_reason' => $status === 'active'
                        ? null
                        : $reason,
                    'banned_at' => $status === 'banned' ? now() : null,
                    'ban_reason' => $status === 'banned' ? $reason : null,
                ])->save();
            }

            DB::table('user_moderation_events')->insert([
                'target_user_id' => $user->id,
                'actor_user_id' => $request->user()->id,
                'action' => $action,
                'reason' => $reason,
                'expires_at' => $action === 'restrict'
                    ? $user->restriction_expires_at
                    : (
                        $action === 'profile_restrict'
                            ? $user->profile_restriction_expires_at
                            : null
                    ),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $audit->record($request, 'user.'.$action, $user, [
                'reason' => $reason,
                'before' => $before,
                'after' => [
                    'moderation_status' => $user->moderation_status,
                    'profile_restricted' => (bool) $user->profile_restricted,
                    'profile_restriction_expires_at' => $user
                        ->profile_restriction_expires_at
                        ?->toIso8601String(),
                    'restriction_expires_at' => $user
                        ->restriction_expires_at
                        ?->toIso8601String(),
                    'banned_at' => $user->banned_at?->toIso8601String(),
                ],
            ]);
        });

        if ($action === 'profile_restrict') {
            $user->notify(
                new ProfileRestrictedNotification(
                    $reason,
                    $user->profile_restriction_expires_at
                        ?->toDayDateTimeString()
                )
            );
        } elseif (in_array($action, ['restrict', 'ban', 'activate'], true)) {
            $user->notify(
                new AccountModerationNotification(
                    $action,
                    $reason,
                    $user->restriction_expires_at?->toIso8601String()
                )
            );
        } elseif ($action === 'profile_restore') {
            $user->notify(
                new AccountModerationNotification(
                    'profile_restore',
                    $reason,
                    null
                )
            );
        }

        return back()->with(
            'success',
            'User moderation action saved and recorded.'
        );
    }

    public function appeal(Request $request): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user !== null, 401);
        abort_if($user->isAdmin(), 403);

        $data = $request->validate([
            'message' => ['required', 'string', 'min:20', 'max:2000'],
            'appeal_type' => [
                'required',
                Rule::in(['account', 'profile']),
            ],
        ]);

        if (
            $data['appeal_type'] === 'account'
            && ! $user->isPostingRestricted()
        ) {
            return back()->withErrors([
                'appeal' => 'There is no active account restriction to appeal.',
            ]);
        }

        if (
            $data['appeal_type'] === 'profile'
            && ! $user->isProfileRestricted()
        ) {
            return back()->withErrors([
                'appeal' => 'There is no active profile restriction to appeal.',
            ]);
        }

        $exists = DB::table('moderation_appeals')
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->exists();

        if ($exists) {
            return back()->withErrors([
                'appeal' => 'You already have an appeal awaiting review.',
            ]);
        }

        DB::table('moderation_appeals')->insert([
            'user_id' => $user->id,
            'appeal_type' => $data['appeal_type'],
            'message' => trim(strip_tags($data['message'])),
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return back()->with(
            'success',
            'Your appeal has been submitted for administrator review.'
        );
    }

    public function reviewAppeal(
        Request $request,
        int $appeal,
        ModerationAudit $audit
    ): RedirectResponse {
        abort_unless($request->user()?->isAdmin(), 403);

        $data = $request->validate([
            'decision' => [
                'required',
                Rule::in(['accepted', 'declined']),
            ],
            'admin_response' => [
                'required',
                'string',
                'min:5',
                'max:1000',
            ],
        ]);

        $row = DB::table('moderation_appeals')
            ->where('id', $appeal)
            ->first();

        abort_unless($row !== null, 404);
        abort_if(
            $row->status !== 'pending',
            422,
            'This appeal has already been reviewed.'
        );

        DB::transaction(function () use (
            $row,
            $data,
            $request,
            $audit
        ): void {
            DB::table('moderation_appeals')
                ->where('id', $row->id)
                ->update([
                    'status' => $data['decision'],
                    'admin_response' => trim(
                        strip_tags($data['admin_response'])
                    ),
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                    'updated_at' => now(),
                ]);

            /** @var User|null $target */
            $target = User::query()->find($row->user_id);

            if (
                $data['decision'] === 'accepted'
                && $target instanceof User
            ) {
                if ($row->appeal_type === 'profile') {
                    $target->forceFill([
                        'profile_restricted' => false,
                        'profile_restriction_reason' => null,
                        'profile_restriction_expires_at' => null,
                    ])->save();
                } else {
                    $target->forceFill([
                        'moderation_status' => 'active',
                        'moderation_reason' => null,
                        'restriction_reason' => null,
                        'restriction_expires_at' => null,
                        'banned_at' => null,
                        'ban_reason' => null,
                    ])->save();
                }
            }

            $audit->record(
                $request,
                'user.appeal_'.$data['decision'],
                $target instanceof User ? $target : null,
                [
                    'appeal_id' => $row->id,
                    'appeal_type' => $row->appeal_type,
                    'response' => trim(
                        strip_tags($data['admin_response'])
                    ),
                ]
            );
        });

        return back()->with('success', 'Appeal decision saved.');
    }

    public function reviewReport(
        Request $request,
        ComplaintReport $report,
        ModerationAudit $audit
    ): RedirectResponse {
        abort_unless($request->user()?->isAdmin(), 403);

        $data = $request->validate([
            'status' => [
                'required',
                Rule::in(['reviewed', 'dismissed', 'actioned']),
            ],
            'admin_note' => [
                'required',
                'string',
                'min:5',
                'max:1000',
            ],
        ]);

        $note = trim(strip_tags($data['admin_note']));

        DB::transaction(function () use (
            $report,
            $data,
            $note,
            $request,
            $audit
        ): void {
            $report->forceFill([
                'status' => $data['status'],
                'admin_note' => $note,
                'reviewed_by' => $request->user()->id,
            ])->save();

            $audit->record(
                $request,
                'complaint.report_reviewed',
                $report,
                [
                    'status' => $data['status'],
                    'reason' => $note,
                ]
            );

            if (
                $data['status'] === 'actioned'
                && $report->complaint
            ) {
                $complaint = $report->complaint;

                $complaint->forceFill([
                    'removed_at' => now(),
                    'removed_reason' => $note,
                    'status' => 'Rejected',
                ])->save();

                $complaint->log('status', $request->user(), 'Rejected', $note);

                $audit->record(
                    $request,
                    'complaint.report_actioned',
                    $complaint,
                    [
                        'reason' => $note,
                        'new_status' => 'Rejected',
                    ]
                );
            }
        });

        return back()->with(
            'success',
            $data['status'] === 'actioned'
                ? 'Report reviewed and post removed with the recorded reason.'
                : 'Post report reviewed.'
        );
    }
}
