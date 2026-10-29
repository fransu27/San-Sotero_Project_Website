<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountStatusController extends Controller
{
    public function show(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user !== null && ! $user->isAdmin(), 403);

        return Inertia::render('account-status', [
            'status' => $user->effectiveModerationStatus(),
            'reason' => $user->moderation_reason ?: $user->ban_reason ?: $user->restriction_reason ?: 'Please contact the barangay office for more information.',
            'expiresAt' => $user->restriction_expires_at?->toIso8601String(),
        ]);
    }
}
