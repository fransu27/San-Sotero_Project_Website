<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A 1-5 star community rating on a closed (Resolved / Rejected) complaint. One per person per post.
 *
 * @property int $id
 * @property int $complaint_id
 * @property int $user_id
 * @property int $rating
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 */
class Rating extends Model
{
    public const MIN = 1;

    public const MAX = 5;

    protected $table = 'complaint_ratings';

    protected $fillable = ['complaint_id', 'user_id', 'rating'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['rating' => 'integer'];
    }
}
