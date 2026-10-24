<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ProfileRestrictedNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly string $reason) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        /** @var User $notifiable */
        return (new MailMessage)
            ->subject('Your San Sotero profile has been restricted')
            ->greeting('Hello '.$notifiable->name.',')
            ->line('An administrator restricted your profile because it did not meet the community profile guidelines.')
            ->line('Reason: '.$this->reason)
            ->line('Your profile photo and biography/preferences were reset. You may contact the barangay office if you believe this was a mistake.');
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Profile restricted',
            'message' => 'Your profile was restricted. Reason: '.$this->reason,
            'reason' => $this->reason,
        ];
    }
}
