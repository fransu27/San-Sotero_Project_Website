<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 1) `attachments`: PDF / Office files attached to an announcement OR a complaint (polymorphic).
 * 2) `announcement_reactions`: like / dislike on announcements (one per person per announcement).
 * 3) `announcement_comments`: comments on announcements.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $t) {
            $t->id();
            $t->morphs('attachable'); // attachable_type + attachable_id (+ index)
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('path');
            $t->string('original_name', 190);
            $t->string('mime', 120);
            $t->unsignedBigInteger('size')->default(0);
            $t->timestamps();
        });

        Schema::create('announcement_reactions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('announcement_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('type', 20); // 'like' | 'dislike'
            $t->timestamps();
            $t->unique(['announcement_id', 'user_id']);
        });

        Schema::create('announcement_comments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('announcement_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->text('body');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcement_comments');
        Schema::dropIfExists('announcement_reactions');
        Schema::dropIfExists('attachments');
    }
};
