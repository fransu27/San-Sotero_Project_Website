<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One like / dislike by one person on one announcement (unique per pair). */
class AnnouncementReaction extends Model
{
    public const TYPES = ['like', 'dislike'];

    protected $fillable = ['announcement_id', 'user_id', 'type'];
}
