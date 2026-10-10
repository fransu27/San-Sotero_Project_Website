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
            abort_if($complaint->isRemoved() && ! $request->user()->isAdmin(), 403);
        } elseif ($folder === 'avatars') {
            abort_unless(User::where('avatar_path', $path)->exists(), 404);
        } else {
            abort(404);
        }

        return $this->stream($path, 'private, max-age=86400');
    }

    public function branding(string $file): StreamedResponse
    {
        // @phpstan-ignore function.alreadyNarrowedType
        abort_unless(in_array("branding/$file", [SiteSetting::read('banner_path'), SiteSetting::read('logo_path')], true), 404);

        return $this->stream("branding/$file", 'public, max-age=86400');
    }

    private function stream(string $path, string $cacheControl): StreamedResponse
    {
        $disk = Storage::disk('public');
        if (! $disk->exists($path)) {
            abort(404);
        }

        return $disk->response($path, null, ['Cache-Control' => $cacheControl, 'X-Content-Type-Options' => 'nosniff']);
    }
}
