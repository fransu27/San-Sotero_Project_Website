<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'profile_visibility')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->string('profile_visibility', 16)->default('public')->index();
            });
        }

        if (! Schema::hasTable('moderation_appeals')) {
            Schema::create('moderation_appeals', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('appeal_type', 24)->default('account');
                $table->text('message');
                $table->string('status', 24)->default('pending')->index();
                $table->text('admin_response')->nullable();
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamps();
                $table->index(['user_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('moderation_appeals');
        if (Schema::hasColumn('users', 'profile_visibility')) {
            Schema::table('users', fn (Blueprint $table) => $table->dropColumn('profile_visibility'));
        }
    }
};
