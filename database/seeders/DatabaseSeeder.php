<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Creates the ONE barangay admin account.
     * SECURITY: no password is hardcoded in the repo. Set ADMIN_EMAIL / ADMIN_PASSWORD in .env,
     * or a random 16-char password is generated and printed once. `role` is not mass-assignable,
     * so we set it with forceFill() here (the only place an admin can be created).
     * Re-running the seeder never resets an existing admin's password.
     */
    public function run(): void
    {
        $admin = User::firstOrNew(['email' => env('ADMIN_EMAIL', 'admin@barangay.test')]);

        if (! $admin->exists) {
            $password = env('ADMIN_PASSWORD') ?: Str::password(16);
            $admin->password = $password; // hashed automatically by the model cast
            $this->command?->info("Admin created: {$admin->email} / {$password}  (change it after first login)");
        }

        $admin->forceFill(['name' => 'Barangay Admin', 'role' => 'admin', 'email_verified_at' => now()])->save();
    }
}
