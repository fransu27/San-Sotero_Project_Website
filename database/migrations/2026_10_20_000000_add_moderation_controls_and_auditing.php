
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('restricted_at')->nullable()->index();
            $table->text('restriction_reason')->nullable();
            $table->timestamp('banned_at')->nullable()->index();
            $table->text('ban_reason')->nullable();
            $table->timestamp('last_seen_at')->nullable()->index();
        });

        // Create complaint_reports only once, using the columns
        // expected by ComplaintReport.php and the moderation controllers.
        Schema::create('complaint_reports', function (Blueprint $table) {
            $table->id();

            $table->foreignId('complaint_id')
                ->constrained('complaints')
                ->cascadeOnDelete();

            $table->foreignId('reporter_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('reason', 60);
            $table->text('details')->nullable();

            $table->string('status', 20)
                ->default('pending')
                ->index();

            $table->foreignId('reviewed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->text('admin_note')->nullable();
            $table->timestamps();

            $table->unique(['complaint_id', 'reporter_id']);

            $table->index([
                'complaint_id',
                'status',
            ]);
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('actor_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('action', 80)->index();
            $table->string('subject_type', 120)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            $table->timestamp('created_at')
                ->useCurrent()
                ->index();

            $table->index(['subject_type', 'subject_id']);
        });

        // Create notifications only if another migration has not
        // already created the table.
        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('type');
                $table->morphs('notifiable');
                $table->text('data');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('complaint_reports');

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['restricted_at']);
            $table->dropIndex(['banned_at']);
            $table->dropIndex(['last_seen_at']);

            $table->dropColumn([
                'restricted_at',
                'restriction_reason',
                'banned_at',
                'ban_reason',
                'last_seen_at',
            ]);
        });
    }
};
