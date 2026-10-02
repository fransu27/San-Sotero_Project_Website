<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Complaint extends Model
{
    public const CATEGORIES = ['Infrastructure', 'Sanitation', 'Peace and Order', 'Others'];

    public const STATUSES = ['Pending', 'Under Review', 'In Progress', 'Resolved', 'Rejected'];

    public const VISIBILITIES = ['public', 'private'];

    public const APPROVAL_PENDING = 'pending';

    public const APPROVAL_APPROVED = 'approved';

    // SECURITY (mass assignment): `status`, `approval_status`, `removed_*` and `edited_at` are deliberately
    // NOT here. A resident cannot POST status=Resolved or approval_status=approved; only the admin-only
    // controller actions set them with forceFill().
    protected $fillable = [
        'user_id', 'title', 'description', 'location', 'category', 'custom_category',
        'incident_date', 'image_path', 'visibility', 'is_anonymous',
    ];

    protected function casts(): array
    {
        return [
            'incident_date' => 'date',
            'removed_at' => 'datetime',
            'edited_at' => 'datetime',
            'is_anonymous' => 'boolean',
        ];
    }

    /** True once the barangay has removed it (the row is kept; see ComplaintController::remove). */
    public function isRemoved(): bool
    {
        return $this->removed_at !== null;
    }

    public function isApproved(): bool
    {
        return $this->approval_status === self::APPROVAL_APPROVED;
    }

    /** Everyone can see it: public + approved by an admin + not removed. */
    public function isPubliclyVisible(): bool
    {
        return $this->visibility === 'public' && $this->isApproved() && ! $this->isRemoved();
    }

    /**
     * THE visibility rule as a query, so the database never even returns rows a person may not see:
     *   admin    -> everything (including private posts and the approval queue)
     *   resident -> their own posts (any state)  +  other people's posts that are public AND approved AND not removed
     * ComplaintPolicy::view() expresses the same rule for a single post; keep the two in sync.
     */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->isAdmin()) {
            return $query;
        }

        return $query->where(fn (Builder $w) => $w
            ->where('user_id', $user->id)
            ->orWhere(fn (Builder $p) => $p
                ->where('visibility', 'public')
                ->where('approval_status', self::APPROVAL_APPROVED)
                ->whereNull('removed_at')));
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(Reaction::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->oldest();
    }

    /** The progress timeline, oldest first. */
    public function events(): HasMany
    {
        return $this->hasMany(ComplaintEvent::class)->oldest('created_at')->oldest('id');
    }

    /** Add a line to the timeline. */
    public function log(string $type, ?User $actor = null, ?string $status = null, ?string $note = null): ComplaintEvent
    {
        return $this->events()->create(['user_id' => $actor?->id, 'type' => $type, 'status' => $status, 'note' => $note]);
    }
}
