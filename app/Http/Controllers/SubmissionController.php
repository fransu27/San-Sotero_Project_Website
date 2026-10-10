<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SubmissionController extends Controller
{
    public const FILTERS = ['awaiting', 'approved', 'under_review', 'in_progress', 'resolved', 'rejected', 'removed'];

    public const SORTS = ['new', 'reacted'];

    public function index(Request $request): Response
    {
        $user = $request->user();

        if ($user === null) {
            abort(401);
        }

        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'ticket' => ['nullable', 'string', 'max:40'],
            'status' => ['nullable', Rule::in(self::FILTERS)],
            'sort' => ['nullable', Rule::in(self::SORTS)],
        ]);

        $sort = $filters['sort'] ?? 'new';

        $own = fn (): Builder => Complaint::query()->where('user_id', $user->id);

        $page = $own()
            ->when($filters['ticket'] ?? null, fn (Builder $q, string $ticket) => $q->where('ticket_code', $ticket))
            ->when($filters['status'] ?? null, fn (Builder $q, string $f) => $this->applyFilter($q, $f))
            ->when($filters['q'] ?? null, function (Builder $q, string $term): void {
                $like = '%'.addcslashes(trim($term), '%_\\').'%';

                $q->where(fn (Builder $w) => $w->where('ticket_code', 'like', $like)
                    ->orWhere('title', 'like', $like));
            })
            ->with('events.user:id,role')
            ->withCount(['reactions', 'comments'])
            ->when($sort === 'reacted', fn (Builder $q) => $q->orderByDesc('reactions_count'))
            ->latest()
            ->latest('id')
            ->paginate(10)
            ->withQueryString();

        $counts = ['all' => $own()->count()];

        foreach (self::FILTERS as $f) {
            $counts[$f] = $this->applyFilter($own(), $f)->count();
        }

        return Inertia::render('submissions', [
            'rows' => $page->getCollection()
                ->map(fn (Complaint $c) => $this->row($c))
                ->values()
                ->all(),
            'pagination' => [
                'page' => $page->currentPage(),
                'last' => $page->lastPage(),
                'total' => $page->total(),
            ],
            'tally' => $counts,
            'filters' => [
                'q' => $filters['q'] ?? '',
                'ticket' => $filters['ticket'] ?? '',
                'status' => $filters['status'] ?? null,
                'sort' => $sort,
            ],
        ]);
    }

    /**
     * @param  Builder<Complaint>  $q
     * @return Builder<Complaint>
     */
    private function applyFilter(Builder $q, string $filter): Builder
    {
        $live = fn (Builder $b): Builder => $b
            ->where('approval_status', Complaint::APPROVAL_APPROVED)
            ->whereNull('removed_at');

        $result = match ($filter) {
            'awaiting' => $q->where('approval_status', Complaint::APPROVAL_PENDING)->whereNull('removed_at'),
            'approved' => $live($q)->where('status', '!=', 'Rejected'),
            'under_review' => $live($q)->where('status', 'Under Review'),
            'in_progress' => $live($q)->where('status', 'In Progress'),
            'resolved' => $live($q)->where('status', 'Resolved'),
            'rejected' => $q->where('status', 'Rejected')->whereNull('removed_at'),
            'removed' => $q->whereNotNull('removed_at'),
            default => $q,
        };

        // @phpstan-ignore return.type
        return $result;
    }

    /** @return array<string, mixed> */
    private function row(Complaint $c): array
    {
        $removed = $c->isRemoved();

        $staffNote = $c->events->filter(fn ($e) => $e->note && $e->user?->isAdmin())->last()?->note;

        return [
            'id' => $c->id,
            'ticket_code' => $c->ticket_code,
            'title' => $c->title,
            'excerpt' => Str::limit($c->description, 180),
            'description' => $c->description,
            'category' => $c->category,
            'custom_category' => $c->custom_category,
            'location' => $c->location,
            'ts' => $c->created_at?->timestamp,
            'date' => $c->incident_date->format('Y-m-d'),
            'approval' => $c->approval_status,
            'status' => $c->status,
            'visibility' => $c->visibility,
            'anonymous' => $c->is_anonymous,
            'removed' => $removed,
            'feedback' => $c->removed_reason ?: $staffNote,
            'image_url' => ($c->image_path && ! $removed) ? '/media/'.ltrim($c->image_path, '/') : null,
            'reactions' => (int) $c->reactions_count,
            'comments' => (int) $c->comments_count,
            'events' => $c->events->map(fn ($e) => [
                'id' => $e->id,
                'type' => $e->type,
                'status' => $e->status,
                'note' => $e->note,
                'ts' => $e->created_at->timestamp,
                'staff' => (bool) $e->user?->isAdmin(),
            ])->values()->all(),
        ];
    }
}
