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

/**
 * Serves uploaded photos straight from storage/app/public, so the site does NOT depend on the
 * `php artisan storage:link` symlink.
 *
 * SECURITY: the file name is never joined into a path blindly — it is looked up in the database first, so
 * ../ tricks or guessing other file names do nothing.
 *  - announcements/…  logged-in users
 *  - avatars/…        logged-in users (profile pictures)
 *  - complaints/…     only people who may VIEW that complaint (ComplaintPolicy::view); a removed post's photo is
 *                     hidden from residents
 *  - branding/…       the barangay location photo: PUBLIC (the landing page shows it to visitors), and only the
 *                     file that is currently configured can be fetched
 */
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
            abort_if($complaint->isRemoved() && ! $request->user()->isAdmin(), 403);
        } elseif ($folder === 'avatars') {
            // Profile pictures are visible to every signed-in resident (that is the point: telling who is who).
            // Anonymous posts never receive the author's picture, see DashboardController::present().
            abort_unless(User::where('avatar_path', $path)->exists(), 404);
        } else {
            abort(404);
        }

        return $this->stream($path, 'private, max-age=86400');
    }

    /** Public barangay location photo (route has no `auth` middleware). */
    public function branding(string $file): StreamedResponse
    {
        abort_unless(SiteSetting::read('banner_path') === "branding/$file", 404);

        return $this->stream("branding/$file", 'public, max-age=86400');
    }

    private function stream(string $path, string $cacheControl): StreamedResponse
    {
        $disk = Storage::disk('public');
        abort_unless($disk->exists($path), 404);

        return $disk->response($path, null, ['Cache-Control' => $cacheControl, 'X-Content-Type-Options' => 'nosniff']);
    }
}
