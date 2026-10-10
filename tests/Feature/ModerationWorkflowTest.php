<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModerationWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => 'admin'])->save();

        return $user;
    }

    private function pendingComplaint(User $author): Complaint
    {
        return Complaint::forceCreate([
            'user_id' => $author->id,
            'ticket_code' => 'SS-2610-'.strtoupper(substr(bin2hex(random_bytes(4)), 0, 6)),
            'title' => 'Broken streetlight',
            'description' => 'The light has been broken for several nights.',
            'location' => 'Purok 2',
            'category' => 'Infrastructure',
            'status' => 'Pending',
            'incident_date' => '2026-10-01',
            'visibility' => 'public',
            'is_anonymous' => false,
            'approval_status' => 'pending',
        ]);
    }

    public function test_only_admins_can_open_the_moderation_page(): void
    {
        $resident = User::factory()->create();

        $this->actingAs($resident)
            ->get(route('admin.moderation'))
            ->assertForbidden();
    }

    public function test_admin_moderation_page_includes_pending_submission_and_ticket(): void
    {
        $admin = $this->admin();
        $complaint = $this->pendingComplaint(User::factory()->create());

        $this->actingAs($admin)
            ->get(route('admin.moderation'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/moderation')
                ->where('complaints.0.id', $complaint->id)
                ->where('complaints.0.ticket_code', $complaint->ticket_code)
                ->where('complaints.0.title', 'Broken streetlight'));
    }

    public function test_admin_can_approve_with_an_optional_decision_note(): void
    {
        $admin = $this->admin();
        $complaint = $this->pendingComplaint(User::factory()->create());

        $this->actingAs($admin)
            ->patch(route('complaints.approve', $complaint), ['note' => 'Location and details verified.'])
            ->assertRedirect();

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'approval_status' => 'approved',
        ]);
        $this->assertDatabaseHas('complaint_events', [
            'complaint_id' => $complaint->id,
            'type' => 'approved',
            'note' => 'Location and details verified.',
        ]);
    }

    public function test_admin_rejection_records_status_reason_and_removal(): void
    {
        $admin = $this->admin();
        $complaint = $this->pendingComplaint(User::factory()->create());

        $this->actingAs($admin)
            ->patch(route('complaints.remove', $complaint), ['reason' => 'Insufficient details to verify this concern.'])
            ->assertRedirect();

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'Rejected',
            'removed_reason' => 'Insufficient details to verify this concern.',
        ]);
        $this->assertDatabaseHas('complaint_events', [
            'complaint_id' => $complaint->id,
            'type' => 'status',
            'status' => 'Rejected',
            'note' => 'Insufficient details to verify this concern.',
        ]);
    }

    public function test_rejection_requires_a_reason(): void
    {
        $admin = $this->admin();
        $complaint = $this->pendingComplaint(User::factory()->create());

        $this->actingAs($admin)
            ->patch(route('complaints.remove', $complaint), ['reason' => 'no'])
            ->assertSessionHasErrors('reason');

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'approval_status' => 'pending',
            'removed_at' => null,
        ]);
    }
}
