<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->string('intake_channel', 20)->default('online')->index();
            $table->string('reporter_name', 120)->nullable();
            $table->text('reporter_contact')->nullable();
            $table->foreignId('entered_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('tracking_pin_hash')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->dropConstrainedForeignId('entered_by_user_id');
            $table->dropColumn(['intake_channel', 'reporter_name', 'reporter_contact', 'tracking_pin_hash']);
        });
    }
};
