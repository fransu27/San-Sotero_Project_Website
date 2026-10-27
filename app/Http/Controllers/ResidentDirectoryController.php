<?php

namespace App\Http\Controllers;

use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class ResidentDirectoryController extends Controller
{
    public function index(): Response
    {
        abort_unless(request()->user()?->isAdmin(), 403);
        $residents = User::latest()->limit(500)->get(['id','name','avatar_path','anonymous_default','profile_visibility','moderation_status','restriction_expires_at','profile_restricted','profile_restriction_expires_at','last_seen_at','role','is_primary_admin'])->map(fn (User $user) => [
            'id' => $user->id,
            'role' => $user->role,
            'primaryAdmin' => (bool) $user->is_primary_admin,
            'name' => $user->name,
            'avatar' => $user->avatarUrl(),
            'private' => ($user->profile_visibility ?? 'public') === 'private',
            'status' => $user->effectiveModerationStatus(),
            'expiresAt' => $user->restriction_expires_at?->toIso8601String(),
            'lastSeenAt' => $user->last_seen_at?->toIso8601String(),
        ])->values();
        return Inertia::render('admin/residents', ['residents' => $residents, 'canManageAdmins' => request()->user()?->isPrimaryAdmin() ?? false]);
    }
}
