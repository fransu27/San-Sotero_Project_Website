<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
<<<<<<< HEAD
 * @mixin IdeHelperComment
=======
>>>>>>> 203efdfdb230bac433b5f827dd07c5930c31825d
 * @property int $id
 * @property int $complaint_id
 * @property int $user_id
 * @property string $body
<<<<<<< HEAD
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \App\Models\User $user
=======
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read User $user
 *
>>>>>>> 203efdfdb230bac433b5f827dd07c5930c31825d
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereBody($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereComplaintId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereUserId($value)
<<<<<<< HEAD
=======
 *
>>>>>>> 203efdfdb230bac433b5f827dd07c5930c31825d
 * @mixin \Eloquent
 */
class Comment extends Model
{
    protected $fillable = ['complaint_id', 'user_id', 'body']; // whitelist (mass-assignment safety)

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
