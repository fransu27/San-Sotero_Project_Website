<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Attachment;
use App\Models\Complaint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Streams an uploaded file (PDF preview or download) after checking who may see the post it belongs to.
 *
 *  - Announcement files: any signed-in resident or admin (announcements are for everybody).
 *  - Complaint files: exactly the people who may see the complaint (ComplaintPolicy::view); once the barangay
 *    removed a post, only admins can still open its files.
 *
 * SECURITY: only a file whose content was sniffed as a real PDF at upload time is ever shown inline (preview).
 * Everything else is forced to download as an opaque binary, so a renamed .html / .svg can never run in the browser.
 */
class AttachmentController extends Controller
{
    public function show(Request $request, Attachment $attachment): StreamedResponse
    {
        $owner = $attachment->attachable;
        $user = $request->user();

        abort_if($owner === null || $user === null, 404);

        if ($owner instanceof Complaint) {
            Gate::authorize('view', $owner);
            abort_if($owner->isRemoved() && ! $user->isAdmin(), 403);
        } elseif (! $owner instanceof Announcement) {
            abort(404);
        }

        $disk = Storage::disk('public');
        abort_unless($disk->exists($attachment->path), 404);

        $inline = $attachment->isPdf() && ! $request->boolean('download');

        return $disk->response(
            $attachment->path,
            $attachment->original_name,
            [
                'Content-Type' => $attachment->isPdf() ? 'application/pdf' : 'application/octet-stream',
                'Cache-Control' => 'private, max-age=3600',
                'X-Content-Type-Options' => 'nosniff',
            ],
            $inline ? 'inline' : 'attachment',
        );
    }
}
