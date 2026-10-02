<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds a `role` to users plus the complaints / comments / announcements tables.
 * SECURITY: `role` defaults to 'resident', so public registration can never create an admin.
 * Foreign keys cascade so deleting a user removes their data (no orphaned private reports).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->string('role', 20)->default('resident')->after('email'));

        Schema::create('complaints', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('title', 150);
            $t->text('description');
            $t->string('location', 150);
            $t->string('category', 30);
            $t->string('status', 20)->default('Pending')->index();
            $t->date('incident_date');
            $t->string('image_path')->nullable();
            $t->timestamps();
        });

        Schema::create('comments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('complaint_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->text('body');
            $t->timestamps();
        });

        Schema::create('announcements', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('title', 120);
            $t->text('body');
            $t->boolean('pinned')->default(false)->index();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('comments');
        Schema::dropIfExists('complaints');
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('role'));
    }
};
