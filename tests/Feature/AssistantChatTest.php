<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssistantChatTest extends TestCase
{
    use RefreshDatabase;

    private function complaint(User $owner, array $extra = []): Complaint
    {
        return Complaint::forceCreate(array_merge([
            'user_id' => $owner->id,
            'ticket_code' => Complaint::newTicketCode(),
            'title' => 'Flooded road',
            'description' => 'Water on the road.',
            'location' => 'Purok 2',
            'category' => 'Infrastructure',
            'status' => 'Resolved',
            'incident_date' => now()->toDateString(),
            'visibility' => 'public',
            'is_anonymous' => false,
            'approval_status' => Complaint::APPROVAL_APPROVED,
        ], $extra));
    }

    public function test_ticket_codes_are_only_sent_to_the_owner_and_admins(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $report = $this->complaint($owner);

        $codeFor = fn (User $viewer) => $this->actingAs($viewer)
            ->postJson(route('assistant.chat'), ['message' => 'best reports'])
            ->assertOk()
            ->json('items.0');

        $this->assertSame($report->ticket_code, $codeFor($owner)['ticket_code']);
        $this->assertSame($report->ticket_code, $codeFor($admin)['ticket_code']);

        $seenByOther = $codeFor($other);
        $this->assertSame($report->id, $seenByOther['id']);
        $this->assertNull($seenByOther['ticket_code']);
    }

    public function test_someone_else_cannot_look_a_report_up_by_its_ticket_code(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $report = $this->complaint($owner);

        $this->actingAs($other)
            ->postJson(route('assistant.chat'), ['message' => $report->ticket_code])
            ->assertOk()
            ->assertJsonMissingPath('items');

        $this->actingAs($owner)
            ->postJson(route('assistant.chat'), ['message' => $report->ticket_code])
            ->assertOk()
            ->assertJsonPath('items.0.id', $report->id);
    }

    public function test_popout_data_follows_the_view_policy_and_never_contains_the_ticket_code(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $public = $this->complaint($owner);
        $private = $this->complaint($owner, ['visibility' => 'private']);

        $this->actingAs($other)
            ->getJson(route('assistant.report', $public))
            ->assertOk()
            ->assertJsonPath('complaint.id', $public->id)
            ->assertJsonMissingPath('complaint.ticket_code');

        $this->actingAs($other)->getJson(route('assistant.report', $private))->assertForbidden();
        $this->actingAs($owner)->getJson(route('assistant.report', $private))->assertOk();
    }
}
