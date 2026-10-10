<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Complaint;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /** Photos go through MediaController (/media/...), so they load on any host or port without `storage:link`. */
    private function photo(?string $path): ?string
    {
        return $path ? '/media/'.ltrim($path, '/') : null;
    }

    /**
     * The newsfeed.
     *
     * WHO SEES WHAT (single rule, enforced in the SQL by Complaint::visibleTo):
     *   admin    -> every post, including private ones and the approval queue
     *   resident -> their own posts + other people's posts that are PUBLIC, APPROVED and not removed
     *
     * Filters (?q= ?category= ?status=) come from the sidebar / search bar. Two special "statuses":
     *   Removed  -> posts the barangay removed        Approval -> the moderation queue (posts awaiting approval)
     *
     * SECURITY
     *  - Scoping happens in the query, not in React. Filters are validated against fixed lists; the search
     *    text is bound as a parameter (no SQL injection) with LIKE wildcards escaped.
     *  - Only hand-picked fields are returned (no emails / roles / hashes).
     *  - ANONYMITY is applied here on the server: for anyone except the author and admins, the author's name is
     *    sent as null (and so are the names on the author's own comments). The browser never receives it, so
     *    dev-tools can't reveal it.
     *  - For a resident, the content of a removed post is blanked here, not just hidden in React.
     */
    /** Role-scoped analytics dashboard, separate from the newsfeed. */
    public function dashboard(Request $request): Response
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }
        $scope = Complaint::query();
        if (! $user->isAdmin()) {
            $scope->where('user_id', $user->id);
        }
        $now = now();
        $analytics = [
            'day' => $this->periodStats($scope, $now->copy()->startOfDay(), $now->copy()->startOfDay()->addDay()),
            'week' => $this->periodStats($scope, $now->copy()->startOfWeek(Carbon::MONDAY), $now->copy()->startOfWeek(Carbon::MONDAY)->addWeek()),
            'month' => $this->periodStats($scope, $now->copy()->startOfMonth(), $now->copy()->startOfMonth()->addMonth()),
            'year' => $this->periodStats($scope, $now->copy()->startOfYear(), $now->copy()->startOfYear()->addYear()),
        ];
        $statusCounts = (clone $scope)->whereNull('removed_at')->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');
        // Build complete chart buckets in the application timezone. The browser receives a zero-filled
        // bucket for every hour/day/month so empty periods remain visible and selectable.
        $yearStart = $now->copy()->startOfYear();
        $yearEnd = $yearStart->copy()->addYear();
        $yearReports = (clone $scope)->where('created_at', '>=', $yearStart)->where('created_at', '<', $yearEnd)
            ->orderByDesc('created_at')->limit(2000)->get(['id', 'ticket_code', 'title', 'description', 'category', 'custom_category', 'location', 'status', 'approval_status', 'created_at']);
        $makeBuckets = function (string $period) use ($now, $yearReports): array {
            $buckets = [];
            if ($period === 'day') {
                for ($hour = 0; $hour < 24; $hour++) {
                    $start = $now->copy()->startOfDay()->addHours($hour);
                    $end = $start->copy()->addHour();
                    $buckets[] = ['key' => $start->toDateTimeString(), 'label' => $start->format('H:00'), 'start' => $start->timestamp, 'end' => $end->timestamp, 'total' => 0];
                }
            } elseif ($period === 'week') {
                $monday = $now->copy()->startOfWeek(Carbon::MONDAY);
                for ($i = 0; $i < 7; $i++) {
                    $start = $monday->copy()->addDays($i);
                    $buckets[] = ['key' => $start->toDateString(), 'label' => $start->format('D j'), 'start' => $start->timestamp, 'end' => $start->copy()->addDay()->timestamp, 'total' => 0];
                }
            } elseif ($period === 'month') {
                $monthStart = $now->copy()->startOfMonth();
                for ($day = 1; $day <= $now->daysInMonth; $day++) {
                    $start = $monthStart->copy()->addDays($day - 1);
                    $buckets[] = ['key' => $start->toDateString(), 'label' => (string) $day, 'start' => $start->timestamp, 'end' => $start->copy()->addDay()->timestamp, 'total' => 0];
                }
            } else {
                $year = $now->copy()->startOfYear();
                for ($month = 0; $month < 12; $month++) {
                    $start = $year->copy()->addMonths($month);
                    $buckets[] = ['key' => $start->format('Y-m'), 'label' => $start->format('M'), 'start' => $start->timestamp, 'end' => $start->copy()->addMonth()->timestamp, 'total' => 0];
                }
            }
            foreach ($yearReports as $report) {
                $created = $report->created_at;
                if ($period === 'day' && $created->toDateString() !== $now->toDateString()) {
                    continue;
                }
                if ($period === 'week' && ! $created->betweenIncluded($now->copy()->startOfWeek(Carbon::MONDAY), $now->copy()->endOfWeek(Carbon::SUNDAY))) {
                    continue;
                }
                if ($period === 'month' && $created->format('Y-m') !== $now->format('Y-m')) {
                    continue;
                }
                $index = $period === 'day' ? (int) $created->format('G') : ($period === 'week' ? (int) $created->dayOfWeekIso - 1 : ($period === 'month' ? (int) $created->format('j') - 1 : (int) $created->format('n') - 1));
                if (isset($buckets[$index])) {
                    $buckets[$index]['total']++;
                }
            }

            return $buckets;
        };
        $series = ['day' => $makeBuckets('day'), 'week' => $makeBuckets('week'), 'month' => $makeBuckets('month'), 'year' => $makeBuckets('year')];
        $reports = $yearReports->map(fn (Complaint $c) => [
            'id' => $c->id, 'ticket_code' => $c->ticket_code, 'title' => $c->title,
            'description' => $c->description, 'category' => $c->custom_category ?: $c->category,
            'location' => $c->location, 'status' => $c->status, 'approval' => $c->approval_status,
            'ts' => $c->created_at?->timestamp, 'created_at' => $c->created_at?->format('Y-m-d H:i:s'),
        ])->values();

        return Inertia::render('dashboard', ['isAdmin' => $user->isAdmin(), 'analytics' => $analytics, 'statusCounts' => $statusCounts, 'series' => $series, 'reports' => $reports]);
    }

    public function newsfeed(Request $request): Response
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $isAdmin = $user->isAdmin();

        /** @var array{q?: string|null, category?: string|null, status?: string|null, sort?: 'new'|'best'|'hot'|null} $filters */
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', Rule::in(Complaint::CATEGORIES)],
            'status' => ['nullable', Rule::in([...Complaint::STATUSES, 'Removed'])],
            'sort' => ['nullable', Rule::in(['new', 'best', 'hot'])],
        ]);

        $visible = fn () => Complaint::visibleTo($user);

        $sort = $filters['sort'] ?? 'new';
        $feed = $visible()
            ->when(($filters['status'] ?? null) === 'Removed' && $isAdmin, fn ($q) => $q->whereNotNull('removed_at'), fn ($q) => $q->where('approval_status', Complaint::APPROVAL_APPROVED)->whereNull('removed_at'))
            ->when($filters['category'] ?? null, fn ($q, $v) => $q->where('category', $v))
            ->when($filters['status'] ?? null, fn ($q, $v) => match ($v) {
                'Removed' => $q->whereNotNull('removed_at'),
                default => $q->where('status', $v)->where('approval_status', Complaint::APPROVAL_APPROVED)->whereNull('removed_at'),
            })
            ->when($filters['q'] ?? null, function ($q, $term) {
                $like = '\%'.addcslashes((string) $term, '%_\\').'%';
                $q->where(fn ($w) => $w->where('title', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhere('location', 'like', $like)
                    ->orWhere('custom_category', 'like', $like));
            })
            ->with(['user:id,name,avatar_path', 'comments.user:id,name,role,avatar_path', 'events.user:id,role'])
            ->withCount([
                'reactions as satisfied_count' => fn ($q) => $q->where('type', 'satisfied'),
                'reactions as not_satisfied_count' => fn ($q) => $q->where('type', 'not_satisfied'),
            ])
            ->withCount('ratings')
            ->withAvg('ratings', 'rating')
            ->with(['reactions' => fn ($q) => $q->where('user_id', $user->id)->select('id', 'complaint_id', 'type')])
            ->with(['ratings' => fn ($q) => $q->where('user_id', $user->id)->select('id', 'complaint_id', 'rating')])
            ->when($sort === 'best', fn ($q) => $q->orderByDesc('ratings_avg_rating')->orderByDesc('satisfied_count'))
            ->when($sort === 'hot', fn ($q) => $q->orderByRaw('(satisfied_count + ratings_count) DESC')->orderByDesc('created_at'))
            ->when($sort === 'new', fn ($q) => $q->latest())
            ->limit(50)->get()
            ->map(fn (Complaint $c) => $this->present($c, $user));

        // Sidebar numbers use the SAME visibility scope as the feed, so a count always matches what the click shows.
        $counts = $visible()->where('approval_status', Complaint::APPROVAL_APPROVED)
            ->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $counts['Removed'] = $visible()->whereNotNull('removed_at')->count();
        // Pending submissions are intentionally managed only on the dedicated moderation page.

        // Period analytics are based on submission creation date. Residents only see their own records;
        // administrators see all records. The week always starts Monday and ends before the following Monday.
        $analyticsScope = Complaint::query();
        if (! $isAdmin) {
            $analyticsScope->where('user_id', $user->id);
        }
        $now = now();
        $analytics = [
            'week' => $this->periodStats($analyticsScope, $now->copy()->startOfWeek(Carbon::MONDAY), $now->copy()->startOfWeek(Carbon::MONDAY)->addWeek()),
            'month' => $this->periodStats($analyticsScope, $now->copy()->startOfMonth(), $now->copy()->startOfMonth()->addMonth()),
            'year' => $this->periodStats($analyticsScope, $now->copy()->startOfYear(), $now->copy()->startOfYear()->addYear()),
        ];

        return Inertia::render('newsfeed', [
            'isAdmin' => $isAdmin,
            'counts' => $counts,
            'analytics' => $analytics,
            'complaints' => $feed,
            'announcements' => Announcement::with('user:id,name,avatar_path')->latest()->limit(20)->get()
                ->map(fn (Announcement $a) => [
                    'id' => $a->id,
                    'title' => $a->title,
                    'body' => $a->body,
                    'pinned' => $a->pinned,
                    'translations' => $a->translations, // {"tl": {...}, "ceb": {...}} or null
                    'image_url' => $this->photo($a->image_path),
                    'edited' => $a->edited_at !== null,
                    'author' => $a->user->name,
                    'author_avatar' => $a->user->avatarUrl(),
                    'time' => $a->created_at?->diffForHumans(),
                    'ts' => $a->created_at?->timestamp,
                ]),
            'filters' => ['q' => $filters['q'] ?? '', 'category' => $filters['category'] ?? null, 'status' => $filters['status'] ?? null, 'sort' => $sort],
            'categories' => Complaint::CATEGORIES,
            'statuses' => Complaint::STATUSES,
        ]);
    }

    /**
     * @param  Builder<Complaint>  $scope
     * @return array{total:int, awaiting:int, approved:int, rejected:int, in_progress:int, resolved:int}
     */
    private function periodStats(Builder $scope, \DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $row = (clone $scope)
            ->where('created_at', '>=', $start)
            ->where('created_at', '<', $end)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(CASE WHEN approval_status = ? THEN 1 ELSE 0 END) as awaiting', [Complaint::APPROVAL_PENDING])
            ->selectRaw('SUM(CASE WHEN approval_status = ? AND status != ? AND removed_at IS NULL THEN 1 ELSE 0 END) as approved', [Complaint::APPROVAL_APPROVED, 'Rejected'])
            ->selectRaw('SUM(CASE WHEN status = ? OR removed_at IS NOT NULL THEN 1 ELSE 0 END) as rejected', ['Rejected'])
            ->selectRaw('SUM(CASE WHEN status = ? AND approval_status = ? AND removed_at IS NULL THEN 1 ELSE 0 END) as in_progress', ['In Progress', Complaint::APPROVAL_APPROVED])
            ->selectRaw('SUM(CASE WHEN status = ? AND approval_status = ? AND removed_at IS NULL THEN 1 ELSE 0 END) as resolved', ['Resolved', Complaint::APPROVAL_APPROVED])
            ->first();

        return [
            'total' => (int) ($row->total ?? 0),
            'awaiting' => (int) ($row->awaiting ?? 0),
            'approved' => (int) ($row->approved ?? 0),
            'rejected' => (int) ($row->rejected ?? 0),
            'in_progress' => (int) ($row->in_progress ?? 0),
            'resolved' => (int) ($row->resolved ?? 0),
        ];
    }

    /**
     * Turn one complaint into the array the browser gets, applying every privacy rule for THIS viewer.
     *
     * @return array<string, mixed>
     */
    private function present(Complaint $c, User $viewer): array
    {
        /** @var Complaint&object{satisfied_count?: int, not_satisfied_count?: int, ratings_count?: int, ratings_avg_rating?: float|string|null} $c */ $isAdmin = $viewer->isAdmin();
        $isOwner = $c->user_id === $viewer->id;
        $hide = $c->isRemoved() && ! $isAdmin;               // residents don't get the content of a removed post
        $maskAuthor = $c->is_anonymous && ! $isOwner && ! $isAdmin; // strangers never receive an anonymous author's name

        return [
            'id' => $c->id,
            'title' => $c->title,
            'description' => $hide ? '' : $c->description,
            'location' => $c->location,
            'category' => $c->category,
            'custom_category' => $c->custom_category,
            'status' => $c->status,
            'approval' => $c->approval_status,
            'visibility' => $c->visibility,
            'anonymous' => $c->is_anonymous,
            'date' => $c->incident_date->format('Y-m-d'),
            'ts' => $c->created_at?->timestamp,
            'edited' => $c->edited_at !== null,
            'author' => $maskAuthor ? null : $c->user->name,
            'mine' => $isOwner,
            'removed' => $c->isRemoved(),
            'removed_reason' => $c->removed_reason,
            'image_url' => $hide ? null : $this->photo($c->image_path),
            'satisfied' => (int) ($c->satisfied_count ?? 0),
            'not_satisfied' => (int) ($c->not_satisfied_count ?? 0),
            'my_vote' => $c->reactions->first()?->type,
            // Community star rating (1-5), open once the post is Resolved or Rejected.
            'closed' => $c->isClosed(),
            'rating_avg' => $c->ratings_count > 0 ? round((float) $c->ratings_avg_rating, 1) : null,
            'rating_count' => (int) $c->ratings_count,
            'my_rating' => $c->ratings->first()?->rating,
            // Anonymous authors never give their picture away either.
            'author_avatar' => $maskAuthor ? null : $c->user->avatarUrl(),
            'comments' => $hide ? [] : $c->comments->map(fn ($m) => [
                'id' => $m->id,
                'body' => $m->body,
                'staff' => $m->user->isAdmin(),
                // the author's own comments on an anonymous post must not give the name away either
                'author' => ($maskAuthor && $m->user_id === $c->user_id) ? null : $m->user->name,
                'avatar' => ($maskAuthor && $m->user_id === $c->user_id) ? null : $m->user->avatarUrl(),
            ]),
            // The timeline never includes WHO (only "the barangay" vs "the resident"), so no names leak.
            'events' => $hide ? [] : $c->events->map(fn ($e) => [
                'id' => $e->id,
                'type' => $e->type,
                'status' => $e->status,
                'note' => $e->note,
                'ts' => $e->created_at->timestamp,
                'staff' => (bool) $e->user?->isAdmin(),
            ]),
        ];
    }
}
