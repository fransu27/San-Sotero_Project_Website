<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $user_id
 * @property string $title
 * @property string $description
 * @property string $location
 * @property string $category
 * @property string $status
 * @property CarbonImmutable $incident_date
 * @property string|null $image_path
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property CarbonImmutable|null $removed_at
 * @property string|null $removed_reason
 * @property CarbonImmutable|null $edited_at
 * @property string|null $custom_category
 * @property string $visibility
 * @property bool $is_anonymous
 * @property string $approval_status
 * @property-read float|string|null $ratings_avg_rating
 * @property-read int|null $satisfied_count
 * @property-read int|null $not_satisfied_count
 * @property-read Collection<int, Comment> $comments
 * @property-read int|null $comments_count
 * @property-read Collection<int, ComplaintEvent> $events
 * @property-read int|null $events_count
 * @property-read Collection<int, Reaction> $reactions
 * @property-read int|null $reactions_count
 * @property-read Collection<int, Rating> $ratings
 * @property-read int|null $ratings_count
 * @property-read User $user
 *
 * @method static Builder<static>|Complaint newModelQuery()
 * @method static Builder<static>|Complaint newQuery()
 * @method static Builder<static>|Complaint query()
 * @method static Builder<static>|Complaint visibleTo(\App\Models\User $user)
 * @method static Builder<static>|Complaint whereApprovalStatus($value)
 * @method static Builder<static>|Complaint whereCategory($value)
 * @method static Builder<static>|Complaint whereCreatedAt($value)
 * @method static Builder<static>|Complaint whereCustomCategory($value)
 * @method static Builder<static>|Complaint whereDescription($value)
 * @method static Builder<static>|Complaint whereEditedAt($value)
 * @method static Builder<static>|Complaint whereId($value)
 * @method static Builder<static>|Complaint whereImagePath($value)
 * @method static Builder<static>|Complaint whereIncidentDate($value)
 * @method static Builder<static>|Complaint whereIsAnonymous($value)
 * @method static Builder<static>|Complaint whereLocation($value)
 * @method static Builder<static>|Complaint whereRemovedAt($value)
 * @method static Builder<static>|Complaint whereRemovedReason($value)
 * @method static Builder<static>|Complaint whereStatus($value)
 * @method static Builder<static>|Complaint whereTitle($value)
 * @method static Builder<static>|Complaint whereUpdatedAt($value)
 * @method static Builder<static>|Complaint whereUserId($value)
 * @method static Builder<static>|Complaint whereVisibility($value)
 *
 * @mixin \Eloquent
 */
class Complaint extends Model
{
    public const CATEGORIES = ['Infrastructure', 'Sanitation', 'Peace and Order', 'Others'];

    public const STATUSES = ['Pending', 'Under Review', 'In Progress', 'Resolved', 'Rejected'];

    public const VISIBILITIES = ['public', 'private'];

    /** Statuses after which the community can leave a 1-5 star rating. */
    public const CLOSED_STATUSES = ['Resolved', 'Rejected'];

    public const APPROVAL_PENDING = 'pending';

    public const APPROVAL_APPROVED = 'approved';

    // SECURITY (mass assignment): `status`, `approval_status`, `removed_*` and `edited_at` are deliberately
    // NOT here. A resident cannot POST status=Resolved or approval_status=approved; only the admin-only
    // controller actions set them with forceFill().
    protected $fillable = [
        'user_id', 'title', 'description', 'location', 'category', 'custom_category',
        'incident_date', 'image_path', 'visibility', 'is_anonymous',
    ];

    /**
     * @return array<string, string>
     */
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

    /** Closed out by the barangay (Resolved or Rejected): from here on the community may rate the outcome. */
    public function isClosed(): bool
    {
        return in_array($this->status, self::CLOSED_STATUSES, true);
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
     *
     * @param  Builder<$this>  $query
     * @return Builder<$this>
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

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<Reaction, $this>
     */
    public function reactions(): HasMany
    {
        return $this->hasMany(Reaction::class);
    }

    /**
     * @return HasMany<Rating, $this>
     */
    public function ratings(): HasMany
    {
        return $this->hasMany(Rating::class);
    }

    /**
     * @return HasMany<Comment, $this>
     */
    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->oldest();
    }

    /**
     * The progress timeline, oldest first.
     *
     * @return HasMany<ComplaintEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(ComplaintEvent::class)->oldest('created_at')->oldest('id');
    }

    /** Add a line to the timeline. */
    public function log(string $type, ?User $actor = null, ?string $status = null, ?string $note = null): ComplaintEvent
    {
        /** @var ComplaintEvent $event */
        $event = $this->events()->create([
            'user_id' => $actor?->id,
            'type' => $type,
            'status' => $status,
            'note' => $note,
        ]);

        return $event;
    }
}
