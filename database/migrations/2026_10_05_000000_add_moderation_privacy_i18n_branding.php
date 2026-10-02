<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One migration for the "structural update":
 *
 *  complaints         + custom_category  (free text when category = "Others")
 *                     + visibility       ('public' | 'private')
 *                     + is_anonymous     (hide the author's name from other residents)
 *                     + approval_status  ('pending' | 'approved')  <- the moderation queue
 *  complaint_events   the progress timeline shown on each post
 *  users              + locale ('en'|'tl'|'ceb', null = never chosen) and + anonymous_default
 *  announcements      + translations (JSON: {"tl": {"title","body"}, "ceb": {...}})
 *  site_settings      key/value store (barangay name, location photo) editable by an admin
 *
 * DATA SAFETY: every complaint that already exists was private (owner + admin only) and already visible
 * to the admin, so the column DEFAULTS are the safe ones: visibility = 'private', approval = 'approved'.
 * Nothing filed before this update is suddenly exposed to other residents. The application code always
 * sets these columns explicitly for new posts.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $t) {
            $t->string('custom_category', 60)->nullable();
            $t->string('visibility', 10)->default('private')->index();
            $t->boolean('is_anonymous')->default(false);
            $t->string('approval_status', 10)->default('approved')->index();
        });

        Schema::create('complaint_events', function (Blueprint $t) {
            $t->id();
            $t->foreignId('complaint_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); // who did it (null if the account was deleted)
            $t->string('type', 20);            // submitted | approved | status | edited
            $t->string('status', 20)->nullable(); // the new status, for type = status
            $t->string('note', 300)->nullable();  // optional message from the barangay
            $t->timestamp('created_at')->useCurrent();
            $t->index(['complaint_id', 'created_at']);
        });

        Schema::table('users', function (Blueprint $t) {
            $t->string('locale', 5)->nullable();
            $t->boolean('anonymous_default')->default(false);
        });

        Schema::table('announcements', fn (Blueprint $t) => $t->json('translations')->nullable());

        Schema::create('site_settings', function (Blueprint $t) {
            $t->id();
            $t->string('key', 60)->unique();
            $t->text('value')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings');
        Schema::table('announcements', fn (Blueprint $t) => $t->dropColumn('translations'));
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['locale', 'anonymous_default']));
        Schema::dropIfExists('complaint_events');
        Schema::table('complaints', function (Blueprint $t) {
            $t->dropIndex(['visibility']);
            $t->dropIndex(['approval_status']);
            $t->dropColumn(['custom_category', 'visibility', 'is_anonymous', 'approval_status']);
        });
    }
};
