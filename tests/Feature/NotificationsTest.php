<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ModerationQueueNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class NotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_only_sees_their_own_notifications(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $user->notify(new ModerationQueueNotification(12, 3));
        $otherUser->notify(new ModerationQueueNotification(99, 4));

        $this->actingAs($user)
            ->get(route('notifications.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('notifications')
                ->where('unreadCount', 1)
                ->has('notifications.data', 1)
                ->where('notifications.data.0.title', 'Post auto-held')
                ->where('notifications.data.0.message', 'Complaint #12 reached 3 reports and was returned to the moderation queue.')
            );
    }

    public function test_user_can_mark_one_notification_as_read(): void
    {
        $user = User::factory()->create();
        $user->notify(new ModerationQueueNotification(12, 3));
        $notification = $user->notifications()->firstOrFail();

        $this->actingAs($user)
            ->patch(route('notifications.read', ['notification' => $notification->id]))
            ->assertRedirect();

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_user_cannot_mark_another_users_notification_as_read(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $otherUser->notify(new ModerationQueueNotification(12, 3));
        $notification = $otherUser->notifications()->firstOrFail();

        $this->actingAs($user)
            ->patch(route('notifications.read', ['notification' => $notification->id]))
            ->assertNotFound();
    }

    public function test_user_can_mark_all_their_unread_notifications_as_read(): void
    {
        $user = User::factory()->create();
        $user->notify(new ModerationQueueNotification(12, 3));
        $user->notify(new ModerationQueueNotification(13, 4));

        $this->actingAs($user)
            ->patch(route('notifications.read-all'))
            ->assertRedirect();

        $this->assertSame(0, $user->fresh()->unreadNotifications()->count());
    }
}
