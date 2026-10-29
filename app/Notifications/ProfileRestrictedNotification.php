<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ProfileRestrictedNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly string $reason, public readonly ?string $until = null) {}

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
            ->line('An administrator restricted your profile picture because it did not meet the community profile guidelines.')
            ->line('Reason: '.$this->reason)
            ->line('Your profile picture now shows the anonymous placeholder and cannot be changed'.($this->until ? ' until '.$this->until : ' until the restriction is lifted').'.')
            ->line('You can still post, comment and react as usual. You may contact the barangay office if you believe this was a mistake.');
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Profile picture restricted',
            'message' => 'Your profile picture was restricted'.($this->until ? ' until '.$this->until : '').'. Reason: '.$this->reason,
            'reason' => $this->reason,
        ];
    }
}
