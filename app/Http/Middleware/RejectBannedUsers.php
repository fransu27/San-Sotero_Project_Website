<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RejectBannedUsers
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user && ! $user->isAdmin()) {
            $status = $user->effectiveModerationStatus();
            if ($status === 'banned' && ! in_array($request->route()?->getName(), ['account.status', 'account.appeals.store', 'logout'], true)) {
                return redirect()->route('account.status');
            }
        }

        return $next($request);
    }
}
