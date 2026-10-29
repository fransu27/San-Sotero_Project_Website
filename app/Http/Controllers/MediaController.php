<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Complaint;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    public function show(Request $request, string $folder, string $file): StreamedResponse
    {
        $path = "$folder/$file";

        if ($folder === 'announcements') {
            abort_unless(Announcement::where('image_path', $path)->exists(), 404);
        } elseif ($folder === 'complaints') {
            $complaint = Complaint::where('image_path', $path)->firstOrFail();
            Gate::authorize('view', $complaint);

            $viewer = $request->user();

            abort_if($complaint->isRemoved() && ! $viewer?->isAdmin(), 403);

            if (
                ! $viewer?->isAdmin()
                && $complaint->user_id !== $viewer?->id
            ) {
                abort_if(
                    ($complaint->user->profile_visibility ?? 'public') === 'private',
                    404,
                );
            }
        } elseif ($folder === 'avatars') {
            $owner = User::where('avatar_path', $path)->first();

            abort_unless($owner instanceof User, 404);

            $viewer = $request->user();

            if (! $viewer || (! $viewer->isAdmin() && ! $viewer->is($owner))) {
                abort_if(
                    $owner->profile_visibility === 'private'
                    || $owner->anonymous_default
                    || $owner->isProfileRestricted(),
                    404,
                );
            }
        } else {
            abort(404);
        }

        return $this->stream($path, 'private, max-age=86400');
    }

    /**
     * Guest-safe photo for the public community feed.
     *
     * Only serves a complaint photo when the report is public, approved,
     * and not removed. Otherwise, returns a 404.
     */
    public function publicComplaint(string $file): StreamedResponse
    {
        $path = "complaints/$file";

        abort_unless(
            Complaint::where('image_path', $path)
                ->where('visibility', 'public')
                ->where('approval_status', Complaint::APPROVAL_APPROVED)
                ->whereNull('removed_at')
                ->whereHas(
                    'user',
                    fn ($query) => $query->where(
                        fn ($privacy) => $privacy
                            ->whereNull('profile_visibility')
                            ->orWhere('profile_visibility', 'public'),
                    ),
                )
                ->exists(),
            404,
        );

        return $this->stream($path, 'public, max-age=300');
    }

    /**
     * Guest-safe photo for announcements on the public community feed.
     *
     * Only serves files belonging to announcements.
     */
    public function publicAnnouncement(string $file): StreamedResponse
    {
        $path = "announcements/$file";

        abort_unless(
            Announcement::where('image_path', $path)->exists(),
            404,
        );

        return $this->stream($path, 'public, max-age=300');
    }

    public function branding(string $file): StreamedResponse
    {
        // @phpstan-ignore function.alreadyNarrowedType
        abort_unless(
            in_array(
                "branding/$file",
                [
                    SiteSetting::read('banner_path'),
                    SiteSetting::read('logo_path'),
                ],
                true,
            ),
            404,
        );

        return $this->stream("branding/$file", 'public, max-age=86400');
    }

    private function stream(string $path, string $cacheControl): StreamedResponse
    {
        $disk = Storage::disk('public');

        if (! $disk->exists($path)) {
            abort(404);
        }

        return $disk->response(
            $path,
            null,
            [
                'Cache-Control' => $cacheControl,
                'X-Content-Type-Options' => 'nosniff',
            ],
        );
    }
}
