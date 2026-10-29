<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AssistedWalkInIntakeTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => 'admin'])->save();

        return $user;
    }

    public function test_resident_cannot_open_or_submit_staff_walk_in_intake(): void
    {
        $resident = User::factory()->create();

        $this->actingAs($resident)->get(route('admin.walk-in.create'))->assertForbidden();
        $this->actingAs($resident)->post(route('admin.walk-in.store'), [])->assertForbidden();
    }

    public function test_admin_can_record_walk_in_complaint_and_receives_one_time_tracking_credentials(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.walk-in.store'), [
            'reporter_name' => 'Sample Resident',
            'reporter_contact' => '09170000000',
            'title' => 'Broken streetlight',
            'description' => 'The streetlight near the barangay hall has not worked for several nights.',
            'location' => 'Purok 2',
            'category' => 'Infrastructure',
            'incident_date' => now()->toDateString(),
        ])->assertRedirect(route('admin.walk-in.create'))
            ->assertSessionHas('walk_in_receipt', function (array $receipt): bool {
                return str_starts_with($receipt['ticket_code'], 'SS-')
                    && preg_match('/^\d{6}$/', $receipt['pin']) === 1
                    && $receipt['reporter_name'] === 'Sample Resident';
            });

        $complaint = Complaint::query()->where('intake_channel', 'walk_in')->firstOrFail();
        $this->assertSame($admin->id, $complaint->entered_by_user_id);
        $this->assertSame($admin->id, $complaint->user_id);
        $this->assertSame('private', $complaint->visibility);
        $this->assertSame('approved', $complaint->approval_status);
        $this->assertNotNull($complaint->tracking_pin_hash);
        $this->assertDatabaseHas('complaint_events', ['complaint_id' => $complaint->id, 'type' => 'submitted']);
    }

    public function test_walk_in_evidence_combined_size_is_limited_to_ten_megabytes(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.walk-in.store'), [
            'reporter_name' => 'Sample Resident',
            'title' => 'Large evidence test',
            'description' => 'A test concern with evidence over the combined limit.',
            'location' => 'Purok 2',
            'category' => 'Infrastructure',
            'incident_date' => now()->toDateString(),
            'files' => [
                UploadedFile::fake()->create('first.pdf', 6000, 'application/pdf'),
                UploadedFile::fake()->create('second.pdf', 6000, 'application/pdf'),
            ],
        ])->assertSessionHasErrors('files');

        $this->assertDatabaseCount('complaints', 0);
    }

    public function test_tracking_requires_reference_and_pin_and_returns_only_minimal_status_data(): void
    {
        $admin = $this->admin();
        $complaint = Complaint::forceCreate([
            'user_id' => $admin->id,
            'ticket_code' => 'SS-2610-ABC234',
            'title' => 'Private sensitive concern',
            'description' => 'This private description must not be returned to the public tracker.',
            'location' => 'Private address',
            'category' => 'Infrastructure',
            'status' => 'Under Review',
            'incident_date' => now()->toDateString(),
            'visibility' => 'private',
            'is_anonymous' => false,
            'approval_status' => 'approved',
            'intake_channel' => 'walk_in',
            'reporter_name' => 'Private Resident',
            'tracking_pin_hash' => Hash::make('482615'),
        ]);

        $this->from(route('complaints.track'))->post(route('complaints.track.lookup'), ['ticket_code' => $complaint->ticket_code, 'pin' => '000000'])->assertSessionHasErrors('ticket_code');
        $this->post(route('complaints.track.lookup'), ['ticket_code' => $complaint->ticket_code, 'pin' => '482615'])
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('track-complaint')
                ->where('result.ticket_code', $complaint->ticket_code)
                ->where('result.status', 'Under Review')
                ->missing('result.description')
                ->missing('result.location')
                ->missing('result.reporter_name'));
    }
}
