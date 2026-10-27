<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Lets a profile-picture restriction end by itself (null = until an administrator restores it). */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'profile_restriction_expires_at')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->timestamp('profile_restriction_expires_at')->nullable()->after('profile_restriction_reason');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'profile_restriction_expires_at')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn('profile_restriction_expires_at');
            });
        }
    }
};
