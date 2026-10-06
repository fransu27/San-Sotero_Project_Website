<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AvatarTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_upload_change_and_remove_their_picture(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('profile.avatar.update'), ['avatar' => UploadedFile::fake()->image('me.jpg', 300, 300)])
            ->assertRedirect(route('profile.edit'));

        $first = $user->refresh()->avatar_path;
        $this->assertNotNull($first);
        $this->assertStringStartsWith('avatars/', $first);
        Storage::disk('public')->assertExists($first);

        // changing it deletes the old file
        $this->actingAs($user)->post(route('profile.avatar.update'), ['avatar' => UploadedFile::fake()->image('new.png', 200, 200)]);
        $second = $user->refresh()->avatar_path;
        $this->assertNotSame($first, $second);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);

        $this->actingAs($user)->delete(route('profile.avatar.destroy'))->assertRedirect(route('profile.edit'));
        $this->assertNull($user->refresh()->avatar_path);
        Storage::disk('public')->assertMissing($second);
    }

    public function test_only_small_real_images_are_accepted(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        foreach ([
            UploadedFile::fake()->create('evil.svg', 5, 'image/svg+xml'),
            UploadedFile::fake()->create('doc.pdf', 5, 'application/pdf'),
            UploadedFile::fake()->image('huge.jpg', 300, 300)->size(3000),
            UploadedFile::fake()->image('tiny.jpg', 20, 20),
        ] as $bad) {
            $this->actingAs($user)->post(route('profile.avatar.update'), ['avatar' => $bad])->assertSessionHasErrors('avatar');
        }
        $this->assertNull($user->refresh()->avatar_path);
    }

    public function test_pictures_are_served_to_signed_in_users_only(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $this->actingAs($user)->post(route('profile.avatar.update'), ['avatar' => UploadedFile::fake()->image('me.jpg', 300, 300)]);
        $url = $user->refresh()->avatarUrl();

        $this->actingAs(User::factory()->create())->get((string) $url)->assertOk();
        $this->assertNull(User::factory()->create()->avatarUrl());

        auth()->logout();
        $this->get((string) $url)->assertRedirect(route('login'));
        $this->actingAs(User::factory()->create())->get('/media/avatars/not-a-real-file.jpg')->assertNotFound();
    }
}
