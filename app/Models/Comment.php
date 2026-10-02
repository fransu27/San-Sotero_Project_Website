<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Comment extends Model
{
    protected $fillable = ['complaint_id', 'user_id', 'body']; // whitelist (mass-assignment safety)

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
