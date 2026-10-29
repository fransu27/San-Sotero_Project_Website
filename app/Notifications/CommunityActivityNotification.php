<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class CommunityActivityNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $title,
        public readonly string $message,
        public readonly string $url = '/newsfeed',
    ) {}

    /**
     * Get the notification delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the notification data for database storage.
     *
     * @return array{title: string, message: string, url: string}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'url' => $this->url,
        ];
    }
}
