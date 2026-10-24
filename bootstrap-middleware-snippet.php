<?php
// Merge into the existing ->withMiddleware callback in bootstrap/app.php.
// Add imports at the top:
use App\Http\Middleware\TrackUserActivity;
use App\Http\Middleware\RejectBannedUsers;

// Append both to the existing $middleware->web(append: [...]) array.
// Suggested order (existing entries are retained):
// TrackUserActivity::class,
// RejectBannedUsers::class,
