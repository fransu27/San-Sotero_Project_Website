<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use Illuminate\Http\Request;
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
            'view' => ['nullable', Rule::in(['queue', 'reviewed', 'all'])],
            'q' => ['nullable', 'string', 'max:100'],
        ]);
        $view = $filters['view'] ?? 'queue';

        $query = Complaint::query()
            ->with(['user:id,name,email,avatar_path', 'events' => fn ($q) => $q->oldest('created_at')->oldest('id')])
            ->when($view === 'queue', fn ($q) => $q->where('approval_status', Complaint::APPROVAL_PENDING)->whereNull('removed_at'))
            ->when($view === 'reviewed', fn ($q) => $q->where(fn ($w) => $w->where('approval_status', Complaint::APPROVAL_APPROVED)->orWhereNotNull('removed_at')))
            ->when($filters['q'] ?? null, function ($q, $term) {
                $like = '%'.addcslashes((string) $term, '%_\\').'%';
                $q->where(fn ($w) => $w->where('ticket_code', 'like', $like)
                    ->orWhere('title', 'like', $like)
                    ->orWhere('description', 'like', $like)
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
                'image_url' => $this->photo($c->image_path),
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
            'query' => $filters['q'] ?? '',
            'counts' => [
                'queue' => Complaint::where('approval_status', Complaint::APPROVAL_PENDING)->whereNull('removed_at')->count(),
                'reviewed' => Complaint::where(fn ($q) => $q->where('approval_status', Complaint::APPROVAL_APPROVED)->orWhereNotNull('removed_at'))->count(),
            ],
        ]);
    }
}
