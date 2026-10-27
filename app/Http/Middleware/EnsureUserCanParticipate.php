<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

/** Blocks restricted accounts from creating or interacting with community content. */
class EnsureUserCanParticipate
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user && ! $user->isAdmin() && $user->isPostingRestricted()) {
            $message = $user->effectiveModerationStatus() === 'banned'
                ? 'Your account is banned from posting and interacting. Reason: '.($user->moderation_reason ?: $user->ban_reason ?: 'Contact the barangay office.')
                : 'Your account is temporarily restricted'.($user->restriction_expires_at ? ' until '.$user->restriction_expires_at->toDateTimeString() : '').'. Reason: '.($user->moderation_reason ?: $user->restriction_reason ?: 'Contact the barangay office.');

            throw ValidationException::withMessages(['moderation' => $message]);
        }

        return $next($request);
    }
}
