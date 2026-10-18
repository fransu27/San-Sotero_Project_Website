<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Public status lookup reveals only minimal status metadata after ticket + private PIN verification. */
class PublicTrackingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('track-complaint', ['result' => null]);
    }

    public function lookup(Request $request): Response
    {
        $data = $request->validate([
            'ticket_code' => ['required', 'string', 'max:40'],
            'pin' => ['required', 'digits:6'],
        ]);

        $complaint = Complaint::query()
            ->where('ticket_code', strtoupper(trim($data['ticket_code'])))
            ->whereNotNull('tracking_pin_hash')
            ->first();

        if (! $complaint || ! Hash::check($data['pin'], $complaint->tracking_pin_hash)) {
            throw ValidationException::withMessages([
                'ticket_code' => 'The reference or PIN is incorrect. Please check your receipt and try again.',
            ]);
        }

        return Inertia::render('track-complaint', [
            'result' => [
                'ticket_code' => $complaint->ticket_code,
                'status' => $complaint->status,
                'submitted_at' => $complaint->created_at?->toIso8601String(),
                'updated_at' => $complaint->updated_at?->toIso8601String(),
                'events' => $complaint->events()->reorder()->latest('created_at')->latest('id')->limit(20)->get(['type', 'status', 'created_at'])->reverse()->values()->map(fn ($event) => [
                    'type' => $event->type,
                    'status' => $event->status,
                    'created_at' => $event->created_at?->toIso8601String(),
                ]),
            ],
        ]);
    }
}
