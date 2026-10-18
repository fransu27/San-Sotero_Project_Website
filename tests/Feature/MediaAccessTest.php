<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaAccessTest extends TestCase
{
    use RefreshDatabase;

    private function complaint(User $owner, array $extra = []): Complaint
    {
        return Complaint::forceCreate(array_merge([
            'user_id' => $owner->id,
            'ticket_code' => Complaint::newTicketCode(),
            'title' => 'Streetlight out',
            'description' => 'The streetlight is not working.',
            'location' => 'Purok 3',
            'category' => 'Infrastructure',
            'status' => 'Pending',
            'incident_date' => now()->toDateString(),
            'visibility' => 'public',
            'is_anonymous' => false,
            'approval_status' => Complaint::APPROVAL_APPROVED,
            'image_path' => 'complaints/report-photo.jpg',
        ], $extra));
    }

    public function test_guests_cannot_request_complaint_media(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('complaints/report-photo.jpg', 'test image bytes');
        $complaint = $this->complaint(User::factory()->create());

        $this->get('/media/'.$complaint->image_path)->assertRedirect(route('login'));
    }

    public function test_owner_and_admin_can_view_complaint_media_but_an_unrelated_resident_cannot_view_private_media(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('complaints/report-photo.jpg', 'test image bytes');
        $owner = User::factory()->create();
        $otherResident = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $complaint = $this->complaint($owner, ['visibility' => 'private']);
        $url = '/media/'.$complaint->image_path;

        $this->actingAs($owner)->get($url)->assertOk();
        $this->actingAs($otherResident)->get($url)->assertForbidden();
        $this->actingAs($admin)->get($url)->assertOk();
    }

    public function test_approved_public_complaint_media_is_available_to_signed_in_residents(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('complaints/report-photo.jpg', 'test image bytes');
        $complaint = $this->complaint(User::factory()->create(), ['visibility' => 'public']);

        $this->actingAs(User::factory()->create())
            ->get('/media/'.$complaint->image_path)
            ->assertOk();
    }

    public function test_removed_complaint_media_is_not_served_to_residents_even_to_its_owner(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('complaints/report-photo.jpg', 'test image bytes');
        $owner = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $complaint = $this->complaint($owner, ['removed_at' => now(), 'removed_reason' => 'Needs review.']);
        $url = '/media/'.$complaint->image_path;

        $this->actingAs($owner)->get($url)->assertForbidden();
        $this->actingAs($admin)->get($url)->assertOk();
    }
}
