<?php

use App\Models\Complaint;
use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Reports filed BEFORE ticket codes existed have ticket_code = NULL. Give each one a code, so every report can be found
 * by its reference. Additive and safe to re-run: it only touches rows that are still NULL, uses the report's own
 * month in the code, and writes with the query builder so updated_at and model events are not touched.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('complaints')->whereNull('ticket_code')->orderBy('id')->chunkById(100, function ($rows): void {
            foreach ($rows as $row) {
                DB::table('complaints')->where('id', $row->id)->whereNull('ticket_code')->update([
                    'ticket_code' => Complaint::newTicketCode($row->created_at ? Carbon::parse($row->created_at) : null),
                ]);
            }
        });
    }

    public function down(): void
    {
        // Codes are never removed: a code a resident may already have copied must stay valid.
    }
};
