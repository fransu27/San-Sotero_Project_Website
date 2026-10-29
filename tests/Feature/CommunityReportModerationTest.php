<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\ComplaintReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommunityReportModerationTest extends TestCase
{
    use RefreshDatabase;

    private function publicComplaint(User $author): Complaint
    {
        return Complaint::forceCreate([
            'user_id' => $author->id,
            'ticket_code' => 'SS-2610-'.strtoupper(substr(bin2hex(random_bytes(4)), 0, 6)),
            'title' => 'Broken streetlight',
            'description' => 'A streetlight is broken.',
            'location' => 'Purok 1',
            'category' => 'Infrastructure',
            'status' => 'Pending',
            'incident_date' => now()->toDateString(),
            'visibility' => 'public',
            'is_anonymous' => false,
            'approval_status' => 'approved',
        ]);
    }

    public function test_configured_report_threshold_returns_public_complaint_to_moderation_queue(): void
    {
        config(['moderation.auto_hold_threshold' => 1]);
        $author = User::factory()->create();
        $reporter = User::factory()->create();
        $complaint = $this->publicComplaint($author);

        $this->actingAs($reporter)->post(route('complaints.report', $complaint), [
            'reason' => 'Spam or scam',
            'details' => 'Please review this report.',
        ])->assertRedirect()->assertSessionHas('success');

        $this->assertDatabaseHas('complaint_reports', [
            'complaint_id' => $complaint->id,
            'reporter_id' => $reporter->id,
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'approval_status' => 'pending',
        ]);
        $this->assertDatabaseHas('activity_logs', [
            'action' => 'complaint.auto_held',
            'subject_id' => $complaint->id,
        ]);
    }

    public function test_resident_cannot_submit_duplicate_complaint_reports(): void
    {
        config(['moderation.auto_hold_threshold' => 6]);
        $author = User::factory()->create();
        $reporter = User::factory()->create();
        $complaint = $this->publicComplaint($author);

        $payload = ['reason' => 'Other', 'details' => 'Please review.'];
        $this->actingAs($reporter)->post(route('complaints.report', $complaint), $payload)->assertRedirect();
        $this->post(route('complaints.report', $complaint), $payload)->assertRedirect();

        $this->assertSame(1, ComplaintReport::where('complaint_id', $complaint->id)->where('reporter_id', $reporter->id)->count());
    }
}
