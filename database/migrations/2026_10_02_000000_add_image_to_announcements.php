<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Lets the admin attach one photo to an announcement (e.g. a poster or schedule). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', fn (Blueprint $t) => $t->string('image_path')->nullable()->after('body'));
    }

    public function down(): void
    {
        Schema::table('announcements', fn (Blueprint $t) => $t->dropColumn('image_path'));
    }
};
