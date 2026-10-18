<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Fortify\Features;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->skipUnlessFortifyHas(Features::registration());
    }

    public function test_registration_screen_can_be_rendered()
    {
        $response = $this->get(route('register'));

        $response->assertOk();
    }

    public function test_new_users_can_register()
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
            'phone' => '09171234567',
            'birthdate' => '1990-01-01',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_users_under_18_cannot_register(): void
    {
        $response = $this->from('/register')->post('/register', [
            'name' => 'Test User',
            'email' => 'underage@example.com',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
            'phone' => '09171234567',
            'birthdate' => now()->subYears(18)->addDay()->toDateString(),
        ]);

        $response->assertRedirect('/register');
        $response->assertSessionHasErrors('birthdate');
        $this->assertGuest();
    }

    public function test_users_who_are_exactly_18_can_register(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'eighteen@example.com',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
            'phone' => '09171234567',
            'birthdate' => now()->subYears(18)->toDateString(),
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_registration_rejects_numeric_or_symbolic_names(): void
    {
        foreach (['Juan123', 'Juan@DelaCruz'] as $name) {
            $response = $this->from('/register')->post('/register', [
                'name' => $name,
                'email' => 'invalid-name-'.md5($name).'@example.com',
                'password' => 'Password123',
                'password_confirmation' => 'Password123',
                'phone' => '09171234567',
                'birthdate' => '1990-01-01',
            ]);

            $response->assertRedirect('/register');
            $response->assertSessionHasErrors('name');
            $this->assertGuest();
        }
    }
}
