<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_dashboard_exposes_week_month_and_year_analytics_scoped_to_the_resident(): void
    {
        $resident = User::factory()->create();
        $otherResident = User::factory()->create();

        Complaint::create([
            'user_id' => $resident->id,
            'title' => 'My concern',
            'description' => 'A test concern description.',
            'location' => 'Main road',
            'category' => 'Others',
            'incident_date' => now()->toDateString(),
            'visibility' => 'private',
            'is_anonymous' => false,
        ]);
        Complaint::create([
            'user_id' => $otherResident->id,
            'title' => 'Another resident concern',
            'description' => 'This must not be counted for the resident.',
            'location' => 'Side road',
            'category' => 'Others',
            'incident_date' => now()->toDateString(),
            'visibility' => 'private',
            'is_anonymous' => false,
        ]);

        $this->actingAs($resident)->get(route('dashboard'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('analytics.week')
            ->where('analytics.week.total', 1)
            ->where('analytics.month.total', 1)
            ->where('analytics.year.total', 1)
            ->where('analytics.week.awaiting', 0)
            ->where('analytics.week.approved', 1)
            ->has('series.day', 24)
            ->has('series.month')
            ->has('series.year', 12)
            ->where('series.year.0.label', 'Jan')
            ->where('series.year.11.label', 'Dec')
            ->has('reports', 1)
        );
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();
    }
}
