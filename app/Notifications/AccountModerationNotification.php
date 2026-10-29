<?php

namespace App\Notifications;

use App\Models\User;
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

    /**
     * Get the notification delivery channels.
     *
     * @return array<int, string>
     */
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

        $name = $notifiable instanceof User
            ? $notifiable->name
            : 'resident';

        $mail = (new MailMessage)
            ->subject($subject)
            ->greeting('Hello '.$name.',')
            ->line($subject.'.')
            ->line('Reason: '.$this->reason);

        if ($this->expiresAt) {
            $mail->line('Restriction expires: '.$this->expiresAt);
        }

        return $mail->line(
            'If you believe this action was made in error, please contact the barangay office.'
        );
    }

    /**
     * Get the notification data for database storage.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Account moderation update',
            'action' => $this->action,
            'reason' => $this->reason,
            'expires_at' => $this->expiresAt,
        ];
    }
}
