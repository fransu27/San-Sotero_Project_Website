<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Satisfied / Not satisfied" votes on complaints (one vote per person per post), plus an
 * `edited_at` stamp on complaints and announcements so the feed can show "Edited".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaint_reactions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('complaint_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('type', 20); // 'satisfied' | 'not_satisfied'
            $t->timestamps();
            $t->unique(['complaint_id', 'user_id']);
        });

        Schema::table('complaints', fn (Blueprint $t) => $t->timestamp('edited_at')->nullable());
        Schema::table('announcements', fn (Blueprint $t) => $t->timestamp('edited_at')->nullable());
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_reactions');
        Schema::table('complaints', fn (Blueprint $t) => $t->dropColumn('edited_at'));
        Schema::table('announcements', fn (Blueprint $t) => $t->dropColumn('edited_at'));
    }
};
