<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RatingTest extends TestCase
{
    use RefreshDatabase;

    private function complaint(User $author, string $status = 'Resolved', string $visibility = 'public'): Complaint
    {
        return Complaint::forceCreate([
            'user_id' => $author->id, 'title' => 'Streetlight out', 'description' => 'Dark at night.', 'location' => 'Purok 3',
            'category' => 'Infrastructure', 'status' => $status, 'incident_date' => '2026-10-01',
            'visibility' => $visibility, 'approval_status' => 'approved',
        ]);
    }

    public function test_a_resident_can_rate_a_resolved_post_and_change_it(): void
    {
        $author = User::factory()->create();
        $voter = User::factory()->create();
        $c = $this->complaint($author);

        $this->actingAs($voter)->post(route('complaints.rate', $c), ['rating' => 4])->assertRedirect();
        $this->assertDatabaseHas('complaint_ratings', ['complaint_id' => $c->id, 'user_id' => $voter->id, 'rating' => 4]);

        $this->actingAs($voter)->post(route('complaints.rate', $c), ['rating' => 2]);
        $this->assertDatabaseCount('complaint_ratings', 1);
        $this->assertDatabaseHas('complaint_ratings', ['complaint_id' => $c->id, 'user_id' => $voter->id, 'rating' => 2]);

        // the same number again clears it
        $this->actingAs($voter)->post(route('complaints.rate', $c), ['rating' => 2]);
        $this->assertDatabaseCount('complaint_ratings', 0);
    }

    public function test_rejected_posts_can_be_rated_too(): void
    {
        $author = User::factory()->create();
        $c = $this->complaint($author, 'Rejected');

        $this->actingAs($author)->post(route('complaints.rate', $c), ['rating' => 1])->assertRedirect();
        $this->assertDatabaseHas('complaint_ratings', ['complaint_id' => $c->id, 'rating' => 1]);
    }

    public function test_open_posts_cannot_be_rated(): void
    {
        $author = User::factory()->create();
        $c = $this->complaint($author, 'In Progress');

        $this->actingAs(User::factory()->create())->post(route('complaints.rate', $c), ['rating' => 5])->assertStatus(422);
        $this->assertDatabaseCount('complaint_ratings', 0);
    }

    public function test_rating_must_be_between_one_and_five(): void
    {
        $c = $this->complaint(User::factory()->create());
        $voter = User::factory()->create();

        foreach ([0, 6, -1, 'abc', null] as $bad) {
            $this->actingAs($voter)->post(route('complaints.rate', $c), ['rating' => $bad])->assertSessionHasErrors('rating');
        }
        $this->assertDatabaseCount('complaint_ratings', 0);
    }

    public function test_a_private_post_cannot_be_rated_by_strangers(): void
    {
        $c = $this->complaint(User::factory()->create(), 'Resolved', 'private');

        $this->actingAs(User::factory()->create())->post(route('complaints.rate', $c), ['rating' => 5])->assertForbidden();
    }

    public function test_guests_cannot_rate(): void
    {
        $c = $this->complaint(User::factory()->create());

        $this->post(route('complaints.rate', $c), ['rating' => 5])->assertRedirect(route('login'));
    }
}
