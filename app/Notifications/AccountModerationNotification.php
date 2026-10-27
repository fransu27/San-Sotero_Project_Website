<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccountModerationNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $action,
        public readonly string $reason,
        public readonly ?string $expiresAt = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $subject = match ($this->action) {
            'restrict' => 'Your San Sotero account has been temporarily restricted',
            'ban' => 'Your San Sotero account has been banned',
            'activate' => 'Your San Sotero account restriction has been removed',
            default => 'Your San Sotero profile restriction has been updated',
        };
        $mail = (new MailMessage)->subject($subject)->greeting('Hello '.$notifiable->name.',')->line($subject.'.')->line('Reason: '.$this->reason);
        if ($this->expiresAt) $mail->line('Restriction expires: '.$this->expiresAt);
        return $mail->line('If you believe this action was made in error, please contact the barangay office.');
    }

    public function toArray(object $notifiable): array
    {
        return ['title' => 'Account moderation update', 'action' => $this->action, 'reason' => $this->reason, 'expires_at' => $this->expiresAt];
    }
}
