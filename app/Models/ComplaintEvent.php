<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One line of a complaint's progress timeline. Append-only: there is no update endpoint.
 *
 * type: submitted | approved | status | edited | resubmitted  (the UI translates these; only `note` is free text from staff)
 *
 * @property int $id
 * @property int $complaint_id
 * @property int|null $user_id
 * @property string $type
 * @property string|null $status
 * @property string|null $note
 * @property CarbonImmutable $created_at
 * @property-read User|null $user
 *
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent whereComplaintId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent whereNote($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent whereUserId($value)
 *
 * @mixin \Eloquent
 */
class ComplaintEvent extends Model
{
    public const UPDATED_AT = null; // the table only has created_at

    protected $fillable = ['complaint_id', 'user_id', 'type', 'status', 'note'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

<<<<<<< HEAD
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
=======
    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
>>>>>>> 203efdfdb230bac433b5f827dd07c5930c31825d
}
