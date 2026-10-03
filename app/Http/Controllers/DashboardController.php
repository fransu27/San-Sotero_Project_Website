<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Complaint;
use App\Models\User;
use Illuminate\Http\Request;
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
    public function index(Request $request): Response
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $isAdmin = $user->isAdmin();

        /** @var array{q?: string|null, category?: string|null, status?: string|null} $filters */
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', Rule::in(Complaint::CATEGORIES)],
            'status' => ['nullable', Rule::in([...Complaint::STATUSES, 'Removed', 'Approval'])],
        ]);

        $visible = fn () => Complaint::visibleTo($user);

        $feed = $visible()
            ->when($filters['category'] ?? null, fn ($q, $v) => $q->where('category', $v))
            ->when($filters['status'] ?? null, fn ($q, $v) => match ($v) {
                'Removed' => $q->whereNotNull('removed_at'),
                'Approval' => $q->where('approval_status', Complaint::APPROVAL_PENDING),
                default => $q->where('status', $v)->where('approval_status', Complaint::APPROVAL_APPROVED),
            })
            ->when($filters['q'] ?? null, function ($q, $term) {
                $like = '\%'.addcslashes((string) $term, '%_\\').'%';
                $q->where(fn ($w) => $w->where('title', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhere('location', 'like', $like)
                    ->orWhere('custom_category', 'like', $like));
            })
            ->with(['user:id,name', 'comments.user:id,name,role', 'events.user:id,role'])
            ->withCount([
                'reactions as satisfied_count' => fn ($q) => $q->where('type', 'satisfied'),
                'reactions as not_satisfied_count' => fn ($q) => $q->where('type', 'not_satisfied'),
            ])
            ->with(['reactions' => fn ($q) => $q->where('user_id', $user->id)->select('id', 'complaint_id', 'type')])
            ->latest()->limit(50)->get()
            ->map(fn (Complaint $c) => $this->present($c, $user));

        // Sidebar numbers use the SAME visibility scope as the feed, so a count always matches what the click shows.
        $counts = $visible()->where('approval_status', Complaint::APPROVAL_APPROVED)
            ->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $counts['Removed'] = $visible()->whereNotNull('removed_at')->count();
        $counts['Approval'] = $visible()->where('approval_status', Complaint::APPROVAL_PENDING)->count();

        return Inertia::render('dashboard', [
            'isAdmin' => $isAdmin,
            'counts' => $counts,
            'complaints' => $feed,
            'announcements' => Announcement::with('user:id,name')->latest()->limit(20)->get()
                ->map(fn (Announcement $a) => [
                    'id' => $a->id,
                    'title' => $a->title,
                    'body' => $a->body,
                    'pinned' => $a->pinned,
                    'translations' => $a->translations, // {"tl": {...}, "ceb": {...}} or null
                    'image_url' => $this->photo($a->image_path),
                    'edited' => $a->edited_at !== null,
                    'author' => $a->user->name,
                    'time' => $a->created_at?->diffForHumans(),
                    'ts' => $a->created_at?->timestamp,
                ]),
            'filters' => ['q' => $filters['q'] ?? '', 'category' => $filters['category'] ?? null, 'status' => $filters['status'] ?? null],
            'categories' => Complaint::CATEGORIES,
            'statuses' => Complaint::STATUSES,
        ]);
    }

    /**
     * Turn one complaint into the array the browser gets, applying every privacy rule for THIS viewer.
     *
     * @return array<string, mixed>
     */
    private function present(Complaint $c, User $viewer): array
    {
        /** @var Complaint&object{satisfied_count?: int, not_satisfied_count?: int} $c */ $isAdmin = $viewer->isAdmin();
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
            'comments' => $hide ? [] : $c->comments->map(fn ($m) => [
                'id' => $m->id,
                'body' => $m->body,
                'staff' => $m->user->isAdmin(),
                // the author's own comments on an anonymous post must not give the name away either
                'author' => ($maskAuthor && $m->user_id === $c->user_id) ? null : $m->user->name,
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
