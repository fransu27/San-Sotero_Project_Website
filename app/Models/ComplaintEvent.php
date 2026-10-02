<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One line of a complaint's progress timeline. Append-only: there is no update endpoint.
 * type: submitted | approved | status | edited | resubmitted  (the UI translates these; only `note` is free text from staff)
 */
class ComplaintEvent extends Model
{
    public const UPDATED_AT = null; // the table only has created_at

    protected $fillable = ['complaint_id', 'user_id', 'type', 'status', 'note'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
