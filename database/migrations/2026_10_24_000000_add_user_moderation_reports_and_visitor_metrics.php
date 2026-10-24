
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add only user moderation fields that do not already exist.
        if (! Schema::hasColumn('users', 'moderation_status')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('moderation_status', 20)
                    ->default('active')
                    ->index();
            });
        }

        if (! Schema::hasColumn('users', 'restriction_expires_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->timestamp('restriction_expires_at')
                    ->nullable()
                    ->index();
            });
        }

        if (! Schema::hasColumn('users', 'moderation_reason')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('moderation_reason', 300)->nullable();
            });
        }

        if (! Schema::hasColumn('users', 'profile_restricted')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('profile_restricted')
                    ->default(false);
            });
        }

        if (! Schema::hasColumn('users', 'profile_restriction_reason')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('profile_restriction_reason', 300)
                    ->nullable();
            });
        }

        // complaint_reports is managed by the October 20 migration.

        // Record user moderation actions.
        if (! Schema::hasTable('user_moderation_events')) {
            Schema::create('user_moderation_events', function (Blueprint $table) {
                $table->id();

                $table->foreignId('target_user_id')
                    ->constrained('users')
                    ->cascadeOnDelete();

                $table->foreignId('actor_user_id')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->string('action', 30);
                $table->text('reason');
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();

                $table->index(['target_user_id', 'created_at']);
            });
        }

        // Track website visits.
        if (! Schema::hasTable('site_visits')) {
            Schema::create('site_visits', function (Blueprint $table) {
                $table->id();

                $table->string('visitor_key', 64)->index();

                $table->foreignId('user_id')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->string('path', 255)->nullable();
                $table->timestamp('visited_at')->index();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('site_visits');
        Schema::dropIfExists('user_moderation_events');

        // Do not drop user columns here: some existed before this
        // migration and may be required by other application code.
    }
};
