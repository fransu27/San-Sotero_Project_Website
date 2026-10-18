<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Complaint;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PublicCommunityFeedTest extends TestCase
{
    use RefreshDatabase;

    private function complaint(User $owner, array $extra = []): Complaint
    {
        return Complaint::forceCreate(array_merge([
            'user_id' => $owner->id,
            'ticket_code' => Complaint::newTicketCode(),
            'title' => 'Public streetlight concern',
            'description' => 'A streetlight needs repair.',
            'location' => 'Purok 3',
            'category' => 'Infrastructure',
            'status' => 'In Progress',
            'incident_date' => now()->toDateString(),
            'visibility' => 'public',
            'is_anonymous' => false,
            'approval_status' => Complaint::APPROVAL_APPROVED,
        ], $extra));
    }

    public function test_guest_feed_only_returns_public_approved_non_removed_reports_without_resident_details(): void
    {
        $owner = User::factory()->create(['name' => 'Resident Secret Name']);
        $public = $this->complaint($owner);
        $this->complaint($owner, [
            'title' => 'Private concern must stay hidden',
            'visibility' => 'private',
        ]);
        $this->complaint($owner, [
            'title' => 'Unapproved concern must stay hidden',
            'approval_status' => Complaint::APPROVAL_PENDING,
        ]);
        $this->complaint($owner, [
            'title' => 'Removed concern must stay hidden',
            'removed_at' => now(),
        ]);
        Announcement::create([
            'user_id' => $owner->id,
            'title' => 'Community notice',
            'body' => 'A public barangay announcement.',
            'pinned' => true,
        ]);

        $this->get(route('community.preview'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public-newsfeed')
                ->has('complaints', 1)
                ->where('complaints.0.id', $public->id)
                ->where('complaints.0.title', 'Public streetlight concern')
                ->missing('complaints.0.user')
                ->missing('complaints.0.author')
                ->has('announcements', 1)
                ->where('announcements.0.title', 'Community notice')
            )
            ->assertDontSee('Resident Secret Name')
            ->assertDontSee('Private concern must stay hidden')
            ->assertDontSee('Unapproved concern must stay hidden')
            ->assertDontSee('Removed concern must stay hidden');
    }

    public function test_guest_can_see_photo_of_public_approved_report_only_through_the_guarded_route(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('complaints/public-photo.jpg', 'fake-image-bytes');
        Storage::disk('public')->put('complaints/private-photo.jpg', 'fake-image-bytes');
        Storage::disk('public')->put('complaints/pending-photo.jpg', 'fake-image-bytes');
        Storage::disk('public')->put('complaints/removed-photo.jpg', 'fake-image-bytes');

        $owner = User::factory()->create();
        $public = $this->complaint($owner, ['image_path' => 'complaints/public-photo.jpg']);
        $this->complaint($owner, ['title' => 'Private', 'visibility' => 'private', 'image_path' => 'complaints/private-photo.jpg']);
        $this->complaint($owner, ['title' => 'Pending', 'approval_status' => Complaint::APPROVAL_PENDING, 'image_path' => 'complaints/pending-photo.jpg']);
        $this->complaint($owner, ['title' => 'Removed', 'removed_at' => now(), 'image_path' => 'complaints/removed-photo.jpg']);

        // The feed gives guests the guarded URL, never the raw storage path.
        $this->get(route('community.preview'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('complaints', 1)
                ->where('complaints.0.id', $public->id)
                ->where('complaints.0.image_url', route('community.photo', ['file' => 'public-photo.jpg'], false))
            );

        $this->get(route('community.photo', ['file' => 'public-photo.jpg']))
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        foreach (['private-photo.jpg', 'pending-photo.jpg', 'removed-photo.jpg', 'missing.jpg'] as $file) {
            $this->get(route('community.photo', ['file' => $file]))->assertNotFound();
        }
    }

    public function test_guest_can_see_announcement_photo_only_through_the_guarded_route(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('announcements/notice.jpg', 'fake-image-bytes');
        Storage::disk('public')->put('announcements/unrelated.jpg', 'fake-image-bytes'); // on disk, but not an announcement's photo

        $admin = User::factory()->create();
        Announcement::create([
            'user_id' => $admin->id,
            'title' => 'Free assistance',
            'body' => 'Details at the barangay hall.',
            'image_path' => 'announcements/notice.jpg',
        ]);

        $this->get(route('community.preview'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('announcements.0.image_url', route('community.announcement-photo', ['file' => 'notice.jpg'], false))
            );

        $this->get(route('community.announcement-photo', ['file' => 'notice.jpg']))
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        foreach (['unrelated.jpg', 'missing.jpg'] as $file) {
            $this->get(route('community.announcement-photo', ['file' => $file]))->assertNotFound();
        }
    }
}
