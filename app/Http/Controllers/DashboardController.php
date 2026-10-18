<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Complaint;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private function photo(?string $path): ?string
    {
        return $path ? '/media/'.ltrim($path, '/') : null;
    }

    /**
     * Announcements with everything the card needs: files, reactions and comments.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function announcementsFor(User $viewer, int $limit): Collection
    {
        /** @var Collection<int, array<string, mixed>> */
        return Announcement::with([
            'user:id,name,avatar_path',
            'attachments',
            'comments.user:id,name,role,avatar_path',
            'reactions' => fn ($q) => $q
                ->where('user_id', $viewer->id)
                ->select('id', 'announcement_id', 'type'),
        ])
            ->withCount([
                'reactions as likes_count' => fn ($q) => $q->where('type', 'like'),
                'reactions as dislikes_count' => fn ($q) => $q->where('type', 'dislike'),
            ])
            ->latest()
            ->limit($limit)
            ->get()
            ->map(function (Announcement $a): array {
                /** @var Announcement&object{likes_count?: int, dislikes_count?: int} $a */
                return [
                    'id' => $a->id,
                    'title' => $a->title,
                    'body' => $a->body,
                    'pinned' => $a->pinned,
                    'translations' => $a->translations,
                    'image_url' => $this->photo($a->image_path),
                    'edited' => $a->edited_at !== null,
                    'author' => $a->user->name,
                    'author_avatar' => $a->user->avatarUrl(),
                    'time' => $a->created_at?->diffForHumans(),
                    'ts' => $a->created_at?->timestamp,
                    'attachments' => $a->presentAttachments(),
                    'likes' => (int) ($a->likes_count ?? 0),
                    'dislikes' => (int) ($a->dislikes_count ?? 0),
                    'my_vote' => $a->reactions->first()?->type,
                    'comments' => $a->comments->map(fn ($m) => [
                        'id' => $m->id,
                        'body' => $m->body,
                        'staff' => $m->user->isAdmin(),
                        'author' => $m->user->name,
                        'avatar' => $m->user->avatarUrl(),
                    ])->values()->all(),
                ];
            });
    }

    /**
     * Role-scoped analytics dashboard, separate from the newsfeed.
     */
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
            'day' => $this->periodStats(
                $scope,
                $now->copy()->startOfDay(),
                $now->copy()->startOfDay()->addDay()
            ),
            'week' => $this->periodStats(
                $scope,
                $now->copy()->startOfWeek(Carbon::MONDAY),
                $now->copy()->startOfWeek(Carbon::MONDAY)->addWeek()
            ),
            'month' => $this->periodStats(
                $scope,
                $now->copy()->startOfMonth(),
                $now->copy()->startOfMonth()->addMonth()
            ),
            'year' => $this->periodStats(
                $scope,
                $now->copy()->startOfYear(),
                $now->copy()->startOfYear()->addYear()
            ),
        ];

        $statusCounts = (clone $scope)
            ->whereNull('removed_at')
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        // Build complete chart buckets in the application timezone.
        $yearStart = $now->copy()->startOfYear();
        $yearEnd = $yearStart->copy()->addYear();

        $yearReports = (clone $scope)
            ->where('created_at', '>=', $yearStart)
            ->where('created_at', '<', $yearEnd)
            ->orderByDesc('created_at')
            ->limit(2000)
            ->get([
                'id',
                'ticket_code',
                'title',
                'description',
                'category',
                'custom_category',
                'location',
                'status',
                'approval_status',
                'created_at',
            ]);

        $makeBuckets = function (string $period) use ($now, $yearReports): array {
            $buckets = [];

            if ($period === 'day') {
                for ($hour = 0; $hour < 24; $hour++) {
                    $start = $now->copy()->startOfDay()->addHours($hour);
                    $end = $start->copy()->addHour();

                    $buckets[] = [
                        'key' => $start->toDateTimeString(),
                        'label' => $start->format('H:00'),
                        'start' => $start->timestamp,
                        'end' => $end->timestamp,
                        'total' => 0,
                    ];
                }
            } elseif ($period === 'week') {
                $monday = $now->copy()->startOfWeek(Carbon::MONDAY);

                for ($i = 0; $i < 7; $i++) {
                    $start = $monday->copy()->addDays($i);

                    $buckets[] = [
                        'key' => $start->toDateString(),
                        'label' => $start->format('D j'),
                        'start' => $start->timestamp,
                        'end' => $start->copy()->addDay()->timestamp,
                        'total' => 0,
                    ];
                }
            } elseif ($period === 'month') {
                $monthStart = $now->copy()->startOfMonth();

                for ($day = 1; $day <= $now->daysInMonth; $day++) {
                    $start = $monthStart->copy()->addDays($day - 1);

                    $buckets[] = [
                        'key' => $start->toDateString(),
                        'label' => (string) $day,
                        'start' => $start->timestamp,
                        'end' => $start->copy()->addDay()->timestamp,
                        'total' => 0,
                    ];
                }
            } else {
                $year = $now->copy()->startOfYear();

                for ($month = 0; $month < 12; $month++) {
                    $start = $year->copy()->addMonths($month);

                    $buckets[] = [
                        'key' => $start->format('Y-m'),
                        'label' => $start->format('M'),
                        'start' => $start->timestamp,
                        'end' => $start->copy()->addMonth()->timestamp,
                        'total' => 0,
                    ];
                }
            }

            foreach ($yearReports as $report) {
                $created = $report->created_at;

                if ($period === 'day' && $created->toDateString() !== $now->toDateString()) {
                    continue;
                }

                if (
                    $period === 'week'
                    && ! $created->betweenIncluded(
                        $now->copy()->startOfWeek(Carbon::MONDAY),
                        $now->copy()->endOfWeek(Carbon::SUNDAY)
                    )
                ) {
                    continue;
                }

                if ($period === 'month' && $created->format('Y-m') !== $now->format('Y-m')) {
                    continue;
                }

                $index = $period === 'day'
                    ? (int) $created->format('G')
                    : ($period === 'week'
                        ? (int) $created->dayOfWeekIso - 1
                        : ($period === 'month'
                            ? (int) $created->format('j') - 1
                            : (int) $created->format('n') - 1));

                if (isset($buckets[$index])) {
                    $buckets[$index]['total']++;
                }
            }

            return $buckets;
        };

        $series = [
            'day' => $makeBuckets('day'),
            'week' => $makeBuckets('week'),
            'month' => $makeBuckets('month'),
            'year' => $makeBuckets('year'),
        ];

        $reports = $yearReports->map(fn (Complaint $c) => [
            'id' => $c->id,
            'ticket_code' => $c->ticket_code,
            'title' => $c->title,
            'description' => $c->description,
            'category' => $c->custom_category ?: $c->category,
            'location' => $c->location,
            'status' => $c->status,
            'approval' => $c->approval_status,
            'ts' => $c->created_at?->timestamp,
            'created_at' => $c->created_at?->format('Y-m-d H:i:s'),
        ])->values();

        return Inertia::render('dashboard', [
            'isAdmin' => $user->isAdmin(),
            'analytics' => $analytics,
            'statusCounts' => $statusCounts,
            'series' => $series,
            'reports' => $reports,
        ]);
    }

    /** Dedicated announcements page; all admin posts appear here whether pinned or not. */
    public function announcements(Request $request): Response
    {
        $user = $request->user();

        if ($user === null) {
            abort(401);
        }

        return Inertia::render('announcements', [
            'isAdmin' => $user->isAdmin(),
            'announcements' => $this->announcementsFor($user, 100),
        ]);
    }

    /**
     * @param  Builder<Complaint>  $query
     */
    private function withFeedData(Builder $query, User $user): void
    {
        $query
            ->with([
                'user:id,name,avatar_path',
                'comments.user:id,name,role,avatar_path',
                'events.user:id,role',
                'attachments',
            ])
            ->withCount([
                'reactions as satisfied_count' => fn ($q) => $q->where('type', 'satisfied'),
                'reactions as not_satisfied_count' => fn ($q) => $q->where('type', 'not_satisfied'),
            ])
            ->withCount('ratings')
            ->withAvg('ratings', 'rating')
            ->with([
                'reactions' => fn ($q) => $q
                    ->where('user_id', $user->id)
                    ->select('id', 'complaint_id', 'type'),
            ])
            ->with([
                'ratings' => fn ($q) => $q
                    ->where('user_id', $user->id)
                    ->select('id', 'complaint_id', 'rating'),
            ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function reportPayload(Complaint $complaint, User $viewer): array
    {
        $query = Complaint::query()->whereKey($complaint->getKey());
        $this->withFeedData($query, $viewer);

        return $this->present($query->firstOrFail(), $viewer);
    }

    public function newsfeed(Request $request): Response
    {
        $user = $request->user();

        if ($user === null) {
            abort(401);
        }

        $isAdmin = $user->isAdmin();

        $split = fn ($value): array => is_string($value)
            ? collect(explode(',', $value))->map(fn ($v) => trim($v))->filter()->unique()->values()->all()
            : [];

        $request->merge([
            'status_list' => $split($request->query('status')),
            'category_list' => $split($request->query('category')),
        ]);

        /** @var array{q?: string|null, category_list?: list<string>, status_list?: list<string>, sort?: 'new'|'best'|'hot'|null} $filters */
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:200'],
            'category_list' => ['array', 'max:'.count(Complaint::CATEGORIES)],
            'category_list.*' => [Rule::in(Complaint::CATEGORIES)],
            'status' => ['nullable', 'string', 'max:200'],
            'status_list' => ['array', 'max:'.(count(Complaint::STATUSES) + 1)],
            'status_list.*' => [Rule::in([...Complaint::STATUSES, 'Removed'])],
            'sort' => ['nullable', Rule::in(['new', 'best', 'hot'])],
        ]);

        $categoryList = $filters['category_list'] ?? [];
        $statusList = $filters['status_list'] ?? [];
        $wantsRemoved = in_array('Removed', $statusList, true) && $isAdmin;
        $liveStatuses = array_values(array_diff($statusList, ['Removed']));

        $visible = fn () => Complaint::visibleTo($user);

        $sort = $filters['sort'] ?? 'new';

        $feed = $visible()
            ->when(
                $statusList !== [],
                fn ($q) => $q->where(function ($w) use ($liveStatuses, $wantsRemoved) {
                    if ($liveStatuses !== []) {
                        $w->orWhere(fn ($live) => $live
                            ->whereIn('status', $liveStatuses)
                            ->where('approval_status', Complaint::APPROVAL_APPROVED)
                            ->whereNull('removed_at'));
                    }

                    if ($wantsRemoved) {
                        $w->orWhereNotNull('removed_at');
                    }

                    if ($liveStatuses === [] && ! $wantsRemoved) {
                        $w->whereRaw('1 = 0');
                    }
                }),
                fn ($q) => $q
                    ->where('approval_status', Complaint::APPROVAL_APPROVED)
                    ->whereNull('removed_at'),
            )
            ->when($categoryList !== [], fn ($q) => $q->whereIn('category', $categoryList))
            ->when($filters['q'] ?? null, function ($q, $term) {
                // Escape LIKE wildcards so they are searched literally.
                $escapedTerm = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], (string) $term);
                $like = '%'.$escapedTerm.'%';

                $q->where(fn ($w) => $w
                    ->whereRaw("title LIKE ? ESCAPE '!'", [$like])
                    ->orWhereRaw("description LIKE ? ESCAPE '!'", [$like])
                    ->orWhereRaw("location LIKE ? ESCAPE '!'", [$like])
                    ->orWhereRaw("custom_category LIKE ? ESCAPE '!'", [$like]));
            })
            ->tap(fn ($q) => $this->withFeedData($q, $user))
            ->when($sort === 'best', fn ($q) => $q
                ->orderByDesc('ratings_avg_rating')
                ->orderByDesc('satisfied_count'))
            ->when($sort === 'hot', fn ($q) => $q
                ->orderByRaw('(satisfied_count + ratings_count) DESC')
                ->orderByDesc('created_at'))
            ->when($sort === 'new', fn ($q) => $q->latest())
            ->limit(50)
            ->get()
            ->map(fn (Complaint $c) => $this->present($c, $user));

        $counts = $visible()
            ->where('approval_status', Complaint::APPROVAL_APPROVED)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $counts['Removed'] = $visible()->whereNotNull('removed_at')->count();

        $statusIds = $visible()
            ->where('approval_status', Complaint::APPROVAL_APPROVED)
            ->whereNull('removed_at')
            ->where('user_id', '!=', $user->id)
            ->latest('id')
            ->limit(400)
            ->get(['id', 'status'])
            ->groupBy('status')
            ->map(fn ($rows) => $rows->pluck('id')->take(100)->values()->all());

        $analyticsScope = Complaint::query();

        if (! $isAdmin) {
            $analyticsScope->where('user_id', $user->id);
        }

        $now = now();

        $analytics = [
            'week' => $this->periodStats(
                $analyticsScope,
                $now->copy()->startOfWeek(Carbon::MONDAY),
                $now->copy()->startOfWeek(Carbon::MONDAY)->addWeek()
            ),
            'month' => $this->periodStats(
                $analyticsScope,
                $now->copy()->startOfMonth(),
                $now->copy()->startOfMonth()->addMonth()
            ),
            'year' => $this->periodStats(
                $analyticsScope,
                $now->copy()->startOfYear(),
                $now->copy()->startOfYear()->addYear()
            ),
        ];

        return Inertia::render('newsfeed', [
            'isAdmin' => $isAdmin,
            'counts' => $counts,
            'statusIds' => $statusIds,
            'analytics' => $analytics,
            'complaints' => $feed,
            'announcements' => $this->announcementsFor($user, 20),
            'filters' => [
                'q' => $filters['q'] ?? '',
                'category' => $categoryList,
                'status' => $statusList,
                'sort' => $sort,
            ],
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
     * @return array<string, mixed>
     */
    private function present(Complaint $c, User $viewer): array
    {
        /** @var Complaint&object{
         *    satisfied_count?: int,
         *    not_satisfied_count?: int,
         *    ratings_count?: int,
         *    ratings_avg_rating?: float|string|null
         * } $c
         */
        $isAdmin = $viewer->isAdmin();
        $isOwner = $c->user_id === $viewer->id;
        $hide = $c->isRemoved() && ! $isAdmin;
        $maskAuthor = $c->is_anonymous && ! $isOwner && ! $isAdmin;

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
            'attachments' => $hide ? [] : $c->presentAttachments(),
            'satisfied' => (int) ($c->satisfied_count ?? 0),
            'not_satisfied' => (int) ($c->not_satisfied_count ?? 0),
            'my_vote' => $c->reactions->first()?->type,
            'closed' => $c->isClosed(),
            'rating_avg' => $c->ratings_count > 0 ? round((float) $c->ratings_avg_rating, 1) : null,
            'rating_count' => (int) $c->ratings_count,
            'my_rating' => $c->ratings->first()?->rating,
            'author_avatar' => $maskAuthor ? null : $c->user->avatarUrl(),
            'comments' => $hide ? [] : $c->comments->map(fn ($m) => [
                'id' => $m->id,
                'body' => $m->body,
                'staff' => $m->user->isAdmin(),
                'author' => ($maskAuthor && $m->user_id === $c->user_id) ? null : $m->user->name,
                'avatar' => ($maskAuthor && $m->user_id === $c->user_id) ? null : $m->user->avatarUrl(),
            ]),
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
