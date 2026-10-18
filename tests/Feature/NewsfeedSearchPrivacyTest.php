<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class NewsfeedSearchPrivacyTest extends TestCase
{
    use RefreshDatabase;

    private function complaint(User $owner, array $extra = []): Complaint
    {
        return Complaint::forceCreate(array_merge([
            'user_id' => $owner->id,
            'ticket_code' => Complaint::newTicketCode(),
            'title' => 'Streetlight outage',
            'description' => 'A light is broken near the main road.',
            'location' => 'Purok 3',
            'category' => 'Infrastructure',
            'status' => 'Pending',
            'incident_date' => now()->toDateString(),
            'visibility' => 'public',
            'is_anonymous' => false,
            'approval_status' => Complaint::APPROVAL_APPROVED,
        ], $extra));
    }

    public function test_resident_newsfeed_search_respects_complaint_visibility_scope(): void
    {
        $resident = User::factory()->create();
        $otherResident = User::factory()->create();

        $ownPrivate = $this->complaint($resident, [
            'title' => 'Private water leak',
            'visibility' => 'private',
            'created_at' => now()->subMinute(),
        ]);
        $public = $this->complaint($otherResident, ['title' => 'Public water leak', 'created_at' => now()]);
        $this->complaint($otherResident, [
            'title' => 'Unapproved water leak',
            'approval_status' => Complaint::APPROVAL_PENDING,
        ]);
        $this->complaint($otherResident, [
            'title' => 'Private water leak belonging to another resident',
            'visibility' => 'private',
        ]);
        $this->complaint($otherResident, [
            'title' => 'Removed water leak',
            'removed_at' => now(),
        ]);

        $this->actingAs($resident)
            ->get(route('newsfeed', ['q' => 'water leak']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('newsfeed')
                ->has('complaints', 2)
                ->where('complaints.0.id', $public->id)
                ->where('complaints.1.id', $ownPrivate->id)
            );
    }

    public function test_newsfeed_search_treats_percent_and_underscore_as_literal_characters(): void
    {
        $resident = User::factory()->create();
        $literal = $this->complaint($resident, ['title' => 'Road 100% blocked']);
        $this->complaint($resident, ['title' => 'Road 1000 blocked']);

        $this->actingAs($resident)
            ->get(route('newsfeed', ['q' => '100%']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('complaints', 1)
                ->where('complaints.0.id', $literal->id)
            );
    }

    public function test_newsfeed_search_rejects_unreasonably_long_terms(): void
    {
        $resident = User::factory()->create();

        $this->actingAs($resident)
            ->get(route('newsfeed', ['q' => str_repeat('a', 101)]))
            ->assertSessionHasErrors('q');
    }

    public function test_newsfeed_filters_combine_several_statuses_and_categories(): void
    {
        $resident = User::factory()->create();
        $other = User::factory()->create();
        $pendingInfra = $this->complaint($other, ['title' => 'A', 'status' => 'Pending', 'category' => 'Infrastructure', 'created_at' => now()->subMinute()]);
        $reviewSanitation = $this->complaint($other, ['title' => 'B', 'status' => 'Under Review', 'category' => 'Sanitation', 'created_at' => now()]);
        $this->complaint($other, ['title' => 'C', 'status' => 'Resolved', 'category' => 'Sanitation']);
        $this->complaint($other, ['title' => 'D', 'status' => 'Pending', 'category' => 'Others']);

        // Pending + Under Review, Infrastructure + Sanitation => only A and B
        $this->actingAs($resident)
            ->get(route('newsfeed', ['status' => 'Pending,Under Review', 'category' => 'Infrastructure,Sanitation']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('complaints', 2)
                ->where('filters.status', ['Pending', 'Under Review'])
                ->where('filters.category', ['Infrastructure', 'Sanitation'])
                ->where('complaints.0.id', $reviewSanitation->id)
                ->where('complaints.1.id', $pendingInfra->id)
            );

        // a single value in the URL still works
        $this->actingAs($resident)
            ->get(route('newsfeed', ['status' => 'Resolved']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('complaints', 1));
    }

    public function test_newsfeed_filters_reject_unknown_values_and_hide_removed_from_residents(): void
    {
        $resident = User::factory()->create();
        $other = User::factory()->create();
        $this->complaint($other, ['removed_at' => now()]);

        $this->actingAs($resident)
            ->get(route('newsfeed', ['status' => 'Pending,Hacked']))
            ->assertSessionHasErrors('status_list.1');

        $this->actingAs($resident)
            ->get(route('newsfeed', ['status' => 'Removed']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('complaints', 0));
    }
}
