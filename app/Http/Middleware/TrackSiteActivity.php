<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class TrackSiteActivity
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        if ($request->isMethod('GET') && ! $request->expectsJson() && ! $request->ajax() && ! str_starts_with($request->path(), 'media/')) {
            $key = $request->session()->get('site_visitor_key');
            if (! is_string($key) || strlen($key) < 32) {
                $key = bin2hex(random_bytes(24));
                $request->session()->put('site_visitor_key', $key);
            }
            $user = $request->user();
            if ($user) {
                User::whereKey($user->id)->update(['last_seen_at' => now()]);
            }
            // Store page visits; dashboard aggregates unique visitor keys and recent activity.
            DB::table('site_visits')->insert([
                'visitor_key' => hash('sha256', $key),
                'user_id' => $user?->id,
                'path' => substr('/'.$request->path(), 0, 255),
                'visited_at' => now(),
            ]);
        }
        return $response;
    }
}
