<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $complaint_id
 * @property int $reporter_id
 * @property string $reason
 * @property string|null $details
 * @property string $status
 * @property int|null $reviewed_by
 * @property string|null $admin_note
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Complaint|null $complaint
 * @property-read User|null $reporter
 * @property-read User|null $reviewer
 */
class ComplaintReport extends Model
{
    protected $fillable = [
        'complaint_id',
        'reporter_id',
        'reason',
        'details',
        'status',
        'reviewed_by',
        'admin_note',
    ];

    /**
     * @return BelongsTo<Complaint, $this>
     */
    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
