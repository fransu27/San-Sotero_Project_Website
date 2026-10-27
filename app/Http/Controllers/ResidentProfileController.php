<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ResidentProfileController extends Controller
{
    public function show(Request $request, User $user): Response
    {
        abort_if($user->isAdmin(), 404);
        $viewer = $request->user();
        $owner = $viewer && $viewer->is($user);
        $admin = $viewer?->isAdmin() ?? false;
        abort_if((($user->profile_visibility ?? 'public') === 'private' || $user->anonymous_default) && ! $owner && ! $admin, 404);

        $anonymous = (bool) $user->anonymous_default && ! $owner && ! $admin;
        $query = Complaint::where('user_id', $user->id)->latest()->withCount(['reactions', 'comments'])->with(['comments' => fn ($q) => $q->with('user:id,name,role')->latest()->limit(5)]);
        if (! $owner && ! $admin) {
            $query->whereNull('removed_at')->where('visibility', 'public')->where('approval_status', Complaint::APPROVAL_APPROVED);
        }
        $posts = $query->limit(50)->get()->map(fn (Complaint $post) => [
            'id' => $post->id,
            'title' => $post->title,
            'description' => $post->description,
            'category' => $post->custom_category ?: $post->category,
            'location' => $post->location,
            'status' => $post->status,
            'created_at' => $post->created_at?->toIso8601String(),
            'image_url' => ($post->image_path && ! $post->isRemoved()) ? '/media/complaints/'.basename($post->image_path) : null,
            'removed' => $post->isRemoved(),
            'reactions' => (int) $post->reactions_count,
            'comments_count' => (int) $post->comments_count,
            'comments' => $post->comments->map(fn ($comment) => ['id' => $comment->id, 'name' => $comment->user?->name ?? 'Resident', 'body' => $comment->body, 'created_at' => $comment->created_at?->toIso8601String()])->values(),
            'visibility' => $post->visibility,
            'approval_status' => $post->approval_status,
        ])->values();

        return Inertia::render('resident-profile', [
            'profile' => [
                'id' => $user->id,
                'name' => $anonymous ? 'Anonymous resident' : $user->name,
                'avatar' => $anonymous || $user->isProfileRestricted() ? '/images/anonymous-avatar.svg' : ($user->avatar_path ? '/media/'.$user->avatar_path : null),
                'private' => ($user->profile_visibility ?? 'public') === 'private',
                'anonymous' => $anonymous,
                'isOwner' => $owner,
                'isAuthenticated' => $viewer !== null,
                'isAdminViewer' => $admin,
                'posts' => $posts,
            ],
        ]);
    }
}
