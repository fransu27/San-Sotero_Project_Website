<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Registration now collects a mobile number and date of birth.
 * Both are nullable so the existing admin account (created by the seeder) keeps working.
 * `phone` is unique: one mobile number = one resident account.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->string('phone', 20)->nullable()->unique()->after('email');
            $t->date('birthdate')->nullable()->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->dropUnique(['phone']);
            $t->dropColumn(['phone', 'birthdate']);
        });
    }
};
