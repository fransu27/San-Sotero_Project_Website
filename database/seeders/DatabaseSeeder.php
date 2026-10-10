<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $email = config('barangay.admin_email');
        $admin = User::firstOrNew([
            'email' => is_string($email) && $email !== '' ? $email : 'admin@barangay.test',
        ]);

        if (! $admin->exists) {
            $configured = config('barangay.admin_password');
            $password = is_string($configured) && $configured !== '' ? $configured : Str::password(16);
            $admin->password = $password;
            $this->command?->info("Admin created: {$admin->email} / {$password}  (change it after first login)");
        }

        $admin->forceFill([
            'name' => 'Barangay Admin',
            'role' => 'admin',
            'email_verified_at' => now(),
        ])->save();
    }
}
