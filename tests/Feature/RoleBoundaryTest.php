<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleBoundaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_cannot_open_administrator_directory(): void
    {
        $resident = User::factory()->create(['role' => 'resident']);

        $this->actingAs($resident)->get(route('admin.residents'))->assertForbidden();
    }

    public function test_administrator_cannot_open_resident_my_submissions_page(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->get(route('submissions.index'))->assertForbidden();
    }

    public function test_delegated_administrator_cannot_assign_or_remove_roles(): void
    {
        $delegatedAdmin = User::factory()->create(['role' => 'admin', 'is_primary_admin' => false]);
        $resident = User::factory()->create(['role' => 'resident']);

        $this->actingAs($delegatedAdmin)
            ->patch(route('admin.residents.role', $resident), ['role' => 'admin'])
            ->assertForbidden();

        $this->assertSame('resident', $resident->fresh()->role);
    }

    public function test_primary_administrator_cannot_be_demoted(): void
    {
        $primaryAdmin = User::factory()->create(['role' => 'admin', 'is_primary_admin' => true]);

        $this->actingAs($primaryAdmin)
            ->patch(route('admin.residents.role', $primaryAdmin), ['role' => 'resident'])
            ->assertStatus(422);

        $this->assertSame('admin', $primaryAdmin->fresh()->role);
        $this->assertTrue((bool) $primaryAdmin->fresh()->is_primary_admin);
    }
}
