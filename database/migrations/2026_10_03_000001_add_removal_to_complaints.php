<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Soft removal" by the barangay: the row stays in the database (and visible to the admin),
 * but is flagged with a time and a written reason. NULL removed_at = normal post.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $t) {
            $t->timestamp('removed_at')->nullable()->index();
            $t->string('removed_reason', 300)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('complaints', fn (Blueprint $t) => $t->dropColumn(['removed_at', 'removed_reason']));
    }
};
