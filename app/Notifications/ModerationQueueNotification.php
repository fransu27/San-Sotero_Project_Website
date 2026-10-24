<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ModerationQueueNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly int $complaintId, public readonly int $reportCount) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return ['title' => 'Post auto-held', 'message' => 'Complaint #'.$this->complaintId.' reached '.$this->reportCount.' reports and was returned to the moderation queue.', 'complaint_id' => $this->complaintId];
    }
}
