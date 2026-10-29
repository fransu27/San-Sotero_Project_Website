<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'terms_accepted_at')) {
                $table->timestamp('terms_accepted_at')->nullable();
            }
            if (! Schema::hasColumn('users', 'is_primary_admin')) {
                $table->boolean('is_primary_admin')->default(false);
            }
        });

        // Preserve the original admin account as the protected owner/admin.
        $primaryExists = DB::table('users')->where('is_primary_admin', true)->exists();
        if (! $primaryExists) {
            $firstAdmin = DB::table('users')->where('role', 'admin')->orderBy('id')->value('id');
            if ($firstAdmin) {
                DB::table('users')->where('id', $firstAdmin)->update(['is_primary_admin' => true]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'terms_accepted_at')) {
                $table->dropColumn('terms_accepted_at');
            }
            if (Schema::hasColumn('users', 'is_primary_admin')) {
                $table->dropColumn('is_primary_admin');
            }
        });
    }
};
