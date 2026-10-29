<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $notifications = $user->notifications()
            ->latest()
            ->paginate(20)
            ->through(function ($notification): array {
                $data = $notification->data ?? [];
                $title = (string) data_get($data, 'title', 'Notification');
                $message = (string) data_get($data, 'message', 'There is an update to your San Sotero account.');

                if ($message === 'There is an update to your San Sotero account.') {
                    $action = (string) data_get($data, 'action', '');
                    $reason = (string) data_get($data, 'reason', '');
                    if ($action !== '') {
                        $message = match ($action) {
                            'restrict' => 'Your account has been temporarily restricted.',
                            'ban' => 'Your account has been banned.',
                            'activate' => 'Your account restriction has been removed.',
                            default => 'Your account moderation status has been updated.',
                        };
                    }
                    if ($reason !== '') {
                        $message .= ' Reason: '.$reason;
                    }
                }

                return [
                    'id' => (string) $notification->id,
                    'title' => Str::limit($title, 120),
                    'message' => Str::limit($message, 500),
                    'created_at' => $notification->created_at?->toIso8601String(),
                    'read_at' => $notification->read_at?->toIso8601String(),
                ];
            });

        return Inertia::render('notifications', [
            'notifications' => $notifications,
            'unreadCount' => $user->unreadNotifications()->count(),
        ]);
    }

    public function markRead(Request $request, string $notification): RedirectResponse
    {
        $item = $request->user()->notifications()->whereKey($notification)->firstOrFail();
        $item->markAsRead();

        return back();
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return back();
    }
}
