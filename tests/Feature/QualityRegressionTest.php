<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class QualityRegressionTest extends TestCase
{
    use RefreshDatabase;

    private function complaint(User $owner, array $extra = []): Complaint
    {
        return Complaint::forceCreate(array_merge([
            'user_id' => $owner->id,
            'ticket_code' => Complaint::newTicketCode(),
            'title' => 'Blocked drainage',
            'description' => 'Water cannot drain from the road.',
            'location' => 'Purok 2',
            'category' => 'Sanitation',
            'status' => 'Pending',
            'incident_date' => now()->toDateString(),
            'visibility' => 'private',
            'approval_status' => Complaint::APPROVAL_APPROVED,
        ], $extra));
    }

    public function test_resident_cannot_change_report_status_or_restore_removed_report(): void
    {
        $resident = User::factory()->create();
        $complaint = $this->complaint($resident, ['removed_at' => now(), 'removed_reason' => 'Needs review.']);

        $this->actingAs($resident)
            ->patch(route('complaints.status', $complaint), ['status' => 'Resolved'])
            ->assertForbidden();

        $this->actingAs($resident)
            ->patch(route('complaints.restore', $complaint))
            ->assertForbidden();

        $this->assertSame('Pending', $complaint->fresh()->status);
        $this->assertNotNull($complaint->fresh()->removed_at);
    }

    public function test_admin_can_restore_a_removed_report_and_both_histories_record_it(): void
    {
        $resident = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $complaint = $this->complaint($resident, [
            'visibility' => 'public',
            'status' => 'In Progress',
        ]);

        $this->actingAs($admin)
            ->patch(route('complaints.remove', $complaint), ['reason' => 'Removed by mistake.'])
            ->assertRedirect();

        $this->assertSame('Rejected', $complaint->fresh()->status);
        $this->assertSame('In Progress', $complaint->fresh()->status_before_removal);

        $this->actingAs($admin)
            ->patch(route('complaints.restore', $complaint))
            ->assertRedirect();

        $this->assertNull($complaint->fresh()->removed_at);
        $this->assertSame('In Progress', $complaint->fresh()->status);
        $this->assertNull($complaint->fresh()->status_before_removal);
        $this->assertDatabaseHas('complaint_events', [
            'complaint_id' => $complaint->id,
            'type' => 'restored',
        ]);
        $this->assertDatabaseHas('activity_logs', [
            'actor_id' => $admin->id,
            'action' => 'complaint.restored',
            'subject_id' => $complaint->id,
        ]);
    }

    public function test_tracking_requires_ticket_code_and_private_pin_and_never_returns_private_details(): void
    {
        $owner = User::factory()->create();
        $complaint = $this->complaint($owner, [
            'tracking_pin_hash' => Hash::make('123456'),
            'reporter_name' => 'Confidential resident',
            'reporter_contact' => '09990000000',
        ]);

        $this->post(route('complaints.track.lookup'), [
            'ticket_code' => $complaint->ticket_code,
            'pin' => '000000',
        ])->assertSessionHasErrors('ticket_code');

        $this->post(route('complaints.track.lookup'), [
            'ticket_code' => $complaint->ticket_code,
            'pin' => '123456',
        ])->assertOk()->assertDontSee('Confidential resident')->assertDontSee('09990000000');
    }

    public function test_passwords_are_stored_as_hashes_not_plain_text(): void
    {
        $plainText = 'SanSotero-Test-Password-2026!';
        $user = User::factory()->create(['password' => $plainText]);

        $this->assertNotSame($plainText, $user->fresh()->password);
        $this->assertTrue(Hash::check($plainText, $user->fresh()->password));
    }
}
