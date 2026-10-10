<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "My Submissions": the signed-in person's OWN reports with ticket code, dates, approval state, status and the latest
 * explanation from the barangay, plus the full timeline.
 *
 * SECURITY
 *  - Every query starts with where('user_id', <you>) in SQL, so another resident's report (private or not) can never
 *    appear, whatever the URL or filters say. The page holds no id lookups, so there is nothing to tamper with (no IDOR).
 *  - `q`, `status` and `sort` are validated (status/sort against fixed lists) and bound as parameters: no SQL injection.
 *  - Only the author is ever the viewer, so anonymous reports show their own author nothing to hide; the timeline never
 *    contains staff names, only "the barangay".
 *  - Photos are served by MediaController, which re-checks ComplaintPolicy for every request.
 */
class SubmissionController extends Controller
{
    /** Filter chips (the number of reports for each is shown on the chip). */
    public const FILTERS = ['awaiting', 'approved', 'under_review', 'in_progress', 'resolved', 'rejected', 'removed'];

    public const SORTS = ['new', 'reacted'];

    public function index(Request $request): Response
    {
        $user = $request->user();

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
            ->when($filters['q'] ?? null, function (Builder $q, string $term) {
                $like = '%'.addcslashes(trim($term), '%_\\').'%';
                $q->where(fn (Builder $w) => $w->where('ticket_code', 'like', $like)->orWhere('title', 'like', $like));
            })
            ->with('events.user:id,role')
            ->withCount(['reactions', 'comments'])
            ->when($sort === 'reacted', fn (Builder $q) => $q->orderByDesc('reactions_count'))
            ->latest()->latest('id')
            ->paginate(10)
            ->withQueryString();

        $counts = ['all' => $own()->count()];
        foreach (self::FILTERS as $f) {
            $counts[$f] = $this->applyFilter($own(), $f)->count();
        }

        return Inertia::render('submissions', [
            'rows' => $page->getCollection()->map(fn (Complaint $c) => $this->row($c))->values(),
            'pagination' => ['page' => $page->currentPage(), 'last' => $page->lastPage(), 'total' => $page->total()],
            'tally' => $counts,
            'filters' => ['q' => $filters['q'] ?? '', 'ticket' => $filters['ticket'] ?? '', 'status' => $filters['status'] ?? null, 'sort' => $sort],
        ]);
    }

    /** One filter chip = one SQL condition. "approved" = the barangay accepted it (whatever its progress is now). */
    private function applyFilter(Builder $q, string $filter): Builder
    {
        $live = fn (Builder $b): Builder => $b->where('approval_status', Complaint::APPROVAL_APPROVED)->whereNull('removed_at');

        return match ($filter) {
            'awaiting' => $q->where('approval_status', Complaint::APPROVAL_PENDING)->whereNull('removed_at'),
            'approved' => $live($q)->where('status', '!=', 'Rejected'),
            'under_review' => $live($q)->where('status', 'Under Review'),
            'in_progress' => $live($q)->where('status', 'In Progress'),
            'resolved' => $live($q)->where('status', 'Resolved'),
            'rejected' => $q->where('status', 'Rejected')->whereNull('removed_at'),
            'removed' => $q->whereNotNull('removed_at'),
            default => $q,
        };
    }

    /** @return array<string, mixed> */
    private function row(Complaint $c): array
    {
        $removed = $c->isRemoved();
        // The explanation the resident should read: the removal/rejection reason, else the newest note a staff member wrote.
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
            // MediaController refuses a removed post's photo to non-admins, so don't offer a link that would break.
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
            ])->values(),
        ];
    }
}
