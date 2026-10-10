<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SubmissionsTest extends TestCase
{
    use RefreshDatabase;

    private function report(User $owner, array $extra = []): Complaint
    {
        return Complaint::forceCreate(array_merge([
            'user_id' => $owner->id, 'title' => 'Streetlight out', 'description' => 'Dark at night.', 'location' => 'Purok 3',
            'category' => 'Infrastructure', 'status' => 'Pending', 'incident_date' => '2026-10-01',
            'visibility' => 'public', 'approval_status' => 'approved', 'ticket_code' => Complaint::newTicketCode(),
        ], $extra));
    }

    private function payload(array $extra = []): array
    {
        return array_merge([
            'title' => 'Broken drainage', 'description' => 'Water floods the road.', 'location' => 'Purok 7',
            'category' => 'Infrastructure', 'incident_date' => now()->toDateString(), 'visibility' => 'public',
        ], $extra);
    }

    public function test_guests_are_sent_to_login(): void
    {
        $this->get(route('submissions.index'))->assertRedirect(route('login'));
    }

    public function test_a_resident_only_sees_their_own_submissions_even_private_ones(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $mine = $this->report($me, ['title' => 'Mine private', 'visibility' => 'private']);
        $theirs = $this->report($other, ['title' => 'Theirs public']);

        $this->actingAs($me)->get(route('submissions.index'))->assertInertia(fn (Assert $page) => $page
            ->component('submissions')
            ->has('rows', 1)
            ->where('rows.0.id', $mine->id)
            ->where('tally.all', 1));

        // Searching for someone else's ticket code finds nothing: the query is scoped to the signed-in user in SQL.
        $this->actingAs($me)->get(route('submissions.index', ['q' => $theirs->ticket_code]))
            ->assertInertia(fn (Assert $page) => $page->has('rows', 0));
    }

    public function test_search_by_ticket_code_and_filter_by_status(): void
    {
        $me = User::factory()->create();
        $waiting = $this->report($me, ['approval_status' => 'pending', 'title' => 'Waiting one']);
        $this->report($me, ['status' => 'Resolved', 'title' => 'Done one']);
        $this->report($me, ['status' => 'Rejected', 'title' => 'Rejected one']);

        $this->actingAs($me)->get(route('submissions.index', ['q' => strtolower($waiting->ticket_code)]))
            ->assertInertia(fn (Assert $page) => $page->has('rows', 1)->where('rows.0.id', $waiting->id));

        $this->actingAs($me)->get(route('submissions.index', ['status' => 'resolved']))
            ->assertInertia(fn (Assert $page) => $page->has('rows', 1)->where('rows.0.title', 'Done one')->where('tally.awaiting', 1)->where('tally.rejected', 1));

        $this->actingAs($me)->get(route('submissions.index', ['status' => 'rejected']))
            ->assertInertia(fn (Assert $page) => $page->has('rows', 1)->where('rows.0.title', 'Rejected one'));
    }

    public function test_unknown_filter_or_sort_values_are_rejected(): void
    {
        $me = User::factory()->create();

        $this->actingAs($me)->get(route('submissions.index', ['status' => 'DROP TABLE']))->assertSessionHasErrors('status');
        $this->actingAs($me)->get(route('submissions.index', ['sort' => 'hacked']))->assertSessionHasErrors('sort');
    }

    public function test_every_new_submission_gets_a_unique_ticket_code_and_the_browser_is_told(): void
    {
        $me = User::factory()->create();

        $this->actingAs($me)->post(route('complaints.store'), $this->payload())->assertSessionHasNoErrors();
        $this->actingAs($me)->post(route('complaints.store'), $this->payload(['title' => 'Second report']))->assertSessionHasNoErrors();

        $codes = Complaint::pluck('ticket_code');
        $this->assertCount(2, $codes);
        $this->assertCount(2, $codes->unique());
        $codes->each(fn ($code) => $this->assertMatchesRegularExpression('/^SS-\d{4}-[A-Z2-9]{6}$/', $code));
    }

    public function test_a_ticket_code_stays_the_same_after_an_edit(): void
    {
        $me = User::factory()->create();
        $c = $this->report($me);
        $before = $c->ticket_code;

        $this->actingAs($me)->patch(route('complaints.update', $c), $this->payload(['title' => 'Edited title']))->assertSessionHasNoErrors();

        $this->assertSame($before, $c->fresh()->ticket_code);
        $this->assertSame('Edited title', $c->fresh()->title);
    }

    public function test_the_latest_staff_note_is_shown_to_the_author(): void
    {
        $me = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $c = $this->report($me, ['status' => 'Rejected']);
        $c->log('status', $admin, 'Rejected', 'Duplicate of ticket SS-0000-AAAAAA');

        $this->actingAs($me)->get(route('submissions.index'))->assertInertia(fn (Assert $page) => $page
            ->where('rows.0.events.0.note', 'Duplicate of ticket SS-0000-AAAAAA')
            ->where('rows.0.feedback', 'Duplicate of ticket SS-0000-AAAAAA'));
    }
}
