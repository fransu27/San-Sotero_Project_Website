<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use App\Models\ComplaintReport;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ModerationController extends Controller
{
    private function photo(?string $path): ?string
    {
        return $path ? '/media/'.ltrim($path, '/') : null;
    }

    public function index(Request $request): Response
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $filters = $request->validate([
            'view' => ['nullable', Rule::in(['queue', 'reviewed', 'all', 'users', 'posts'])],
            'q' => ['nullable', 'string', 'max:100'],
            'user_id' => ['nullable', 'integer', 'min:1'],
        ]);
        $view = $filters['view'] ?? 'queue';

        $query = Complaint::query()
            ->with(['user:id,name,email,avatar_path,profile_restricted,profile_restriction_expires_at', 'attachments', 'events' => fn ($q) => $q->oldest('created_at')->oldest('id')])
            ->when($view === 'queue', fn ($q) => $q->where('approval_status', Complaint::APPROVAL_PENDING)->whereNull('removed_at'))
            ->when($view === 'reviewed', fn ($q) => $q->where(fn ($w) => $w->where('approval_status', Complaint::APPROVAL_APPROVED)->orWhereNotNull('removed_at')))
            ->when(in_array($view, ['users', 'posts'], true), fn ($q) => $q->whereRaw('1 = 0'))
            ->when($filters['q'] ?? null, function ($q, $term) {
                $like = '%'.addcslashes((string) $term, '%_\\').'%';
                $q->where(fn ($w) => $w->where('ticket_code', 'like', $like)
                    ->orWhere('title', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhere('reporter_name', 'like', $like)
                    ->orWhere('reporter_contact', 'like', $like)
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', $like)));
            })
            ->latest();

        $complaints = $query->limit(100)->get()->map(function (Complaint $c) {
            return [
                'id' => $c->id,
                'ticket_code' => $c->ticket_code,
                'title' => $c->title,
                'description' => $c->description,
                'location' => $c->location,
                'category' => $c->category,
                'custom_category' => $c->custom_category,
                'status' => $c->status,
                'approval' => $c->approval_status,
                'visibility' => $c->visibility,
                'anonymous' => (bool) $c->is_anonymous,
                'date' => $c->incident_date?->format('Y-m-d'),
                'created_at' => $c->created_at->toIso8601String(),
                'author' => $c->user->name,
                'author_email' => $c->user->email,
                'intake_channel' => $c->intake_channel ?? 'online',
                'reporter_name' => $c->reporter_name,
                'reporter_contact' => $c->reporter_contact,
                'entered_by_user_id' => $c->entered_by_user_id,
                'image_url' => $this->photo($c->image_path),
                'attachments' => $c->presentAttachments(),
                'removed' => $c->isRemoved(),
                'removed_reason' => $c->removed_reason,
                'events' => $c->events->map(fn ($e) => [
                    'id' => $e->id,
                    'type' => $e->type,
                    'status' => $e->status,
                    'note' => $e->note,
                    'created_at' => $e->created_at->toIso8601String(),
                ])->values()->all(),
            ];
        });

        return Inertia::render('admin/moderation', [
            'complaints' => $complaints,
            'view' => $view,
            'selectedUserId' => isset($filters['user_id']) ? (int) $filters['user_id'] : null,
            'query' => $filters['q'] ?? '',
            'users' => User::query()->where('role', '!=', 'admin')->latest()->limit(100)->get()->map(fn (User $u) => [
                'id' => $u->id, 'name' => $u->name, 'email' => $u->email,
                'status' => $u->effectiveModerationStatus(),
                'expires_at' => $u->restriction_expires_at?->toIso8601String(),
                'reason' => $u->moderation_reason,
                'profile_restricted' => $u->isProfileRestricted(),
                'profile_expires_at' => $u->isProfileRestricted() ? $u->profile_restriction_expires_at?->toIso8601String() : null,
                'profile_reason' => $u->profile_restriction_reason,
                'last_seen_at' => $u->last_seen_at?->toIso8601String(),
            ])->values(),
            'appeals' => DB::table('moderation_appeals')->join('users', 'users.id', '=', 'moderation_appeals.user_id')->select('moderation_appeals.*', 'users.name as resident_name')->where('moderation_appeals.status', 'pending')->latest('moderation_appeals.created_at')->limit(100)->get(),
            'postReports' => ComplaintReport::with(['complaint:id,title,user_id,removed_at', 'reporter:id,name'])
                ->latest()->limit(100)->get()->map(fn (ComplaintReport $r) => [
                    'id' => $r->id, 'complaint_id' => $r->complaint_id,
                    'title' => $r->complaint->title,
                    'author_id' => $r->complaint->user_id,
                    'reporter' => $r->reporter->name,
                    'reason' => $r->reason, 'details' => $r->details, 'status' => $r->status,
                    'admin_note' => $r->admin_note, 'created_at' => $r->created_at?->toIso8601String(),
                ])->values(),
            'counts' => [
                'queue' => Complaint::where('approval_status', Complaint::APPROVAL_PENDING)->whereNull('removed_at')->count(),
                'reviewed' => Complaint::where(fn ($q) => $q->where('approval_status', Complaint::APPROVAL_APPROVED)->orWhereNotNull('removed_at'))->count(),
                'pending_post_reports' => ComplaintReport::where('status', 'pending')->count(),
                'restricted_accounts' => User::where('role', '!=', 'admin')->where('moderation_status', 'restricted')->where(fn ($q) => $q->whereNull('restriction_expires_at')->orWhere('restriction_expires_at', '>', now()))->count(),
                'banned_accounts' => User::where('role', '!=', 'admin')->where(fn ($q) => $q->where('moderation_status', 'banned')->orWhereNotNull('banned_at'))->count(),
                'auto_held_complaints' => Complaint::where('approval_status', Complaint::APPROVAL_PENDING)->whereNull('removed_at')->whereHas('events', fn ($q) => $q->where('note', 'like', '%configured resident-report threshold%'))->count(),
            ],
        ]);
    }
}
