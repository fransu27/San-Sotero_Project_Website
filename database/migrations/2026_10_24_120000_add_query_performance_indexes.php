<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Add compound indexes for the portal's common feed, dashboard, and timeline queries. */
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table): void {
            $table->index(['user_id', 'created_at'], 'complaints_user_created_idx');
            $table->index(['visibility', 'approval_status', 'removed_at', 'created_at'], 'complaints_feed_visibility_idx');
            $table->index(['status', 'created_at'], 'complaints_status_created_idx');
        });

        Schema::table('comments', function (Blueprint $table): void {
            $table->index(['complaint_id', 'created_at'], 'comments_complaint_created_idx');
        });

        Schema::table('activity_logs', function (Blueprint $table): void {
            $table->index(['actor_id', 'created_at'], 'activity_logs_actor_created_idx');
        });
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table): void {
            $table->dropIndex('activity_logs_actor_created_idx');
        });
        Schema::table('comments', function (Blueprint $table): void {
            $table->dropIndex('comments_complaint_created_idx');
        });
        Schema::table('complaints', function (Blueprint $table): void {
            $table->dropIndex('complaints_user_created_idx');
            $table->dropIndex('complaints_feed_visibility_idx');
            $table->dropIndex('complaints_status_created_idx');
        });
    }
};
