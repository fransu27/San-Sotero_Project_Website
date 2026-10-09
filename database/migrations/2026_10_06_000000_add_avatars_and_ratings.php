<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * - users.avatar_path        the profile picture (stored on the public disk under avatars/, null = initials badge)
 * - complaint_ratings        1-5 star community rating on a post once the barangay has closed it
 *                            (Resolved or Rejected). One rating per person per post; the unique index makes
 *                            double-rating impossible even under concurrent clicks.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->string('avatar_path')->nullable());

        Schema::create('complaint_ratings', function (Blueprint $t) {
            $t->id();
            $t->foreignId('complaint_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->unsignedTinyInteger('rating'); // 1..5
            $t->timestamps();
            $t->unique(['complaint_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_ratings');
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('avatar_path'));
    }
};
