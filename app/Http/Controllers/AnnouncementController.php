<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnnouncementRequest;
use App\Models\Announcement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;

/** All actions here are admin-only: the routes are wrapped in EnsureAdmin (and AnnouncementRequest re-checks). */
class AnnouncementController extends Controller
{
    /**
     * Post an announcement, optionally with a photo, translations (Tagalog / Bisaya) and/or pinned to the top.
     * user_id comes from the session, never from the request body. store() gives the file a random name.
     */
    public function store(AnnouncementRequest $request): RedirectResponse
    {
        $imagePath = $request->file('image')?->store('announcements', 'public');

        Announcement::create([
            'user_id' => (int) $request->user()?->id,
            'title' => $request->validated('title'),
            'body' => $request->validated('body'),
            'translations' => $request->translations(),
            'pinned' => $request->boolean('pinned'),
            'image_path' => $imagePath !== false ? $imagePath : null,
        ]);

        return back();
    }

    /** Edit text, translations and photo. edited_at feeds the "Edited" label in the feed. */
    public function update(AnnouncementRequest $request, Announcement $announcement): RedirectResponse
    {
        $fields = [
            'title' => $request->validated('title'),
            'body' => $request->validated('body'),
            'translations' => $request->translations(),
        ];

        if ($request->hasFile('image')) {
            $this->deletePhoto($announcement);
            $path = $request->file('image')?->store('announcements', 'public');
            $fields['image_path'] = $path !== false ? $path : null;
        } elseif ($request->boolean('remove_image')) {
            $this->deletePhoto($announcement);
            $fields['image_path'] = null;
        }

        $announcement->fill($fields)->forceFill(['edited_at' => now()])->save();

        return back();
    }

    /** Pin / unpin. Toggling on the server avoids trusting a client-sent value. */
    public function togglePin(Announcement $announcement): RedirectResponse
    {
        $announcement->update(['pinned' => ! $announcement->pinned]);

        return back();
    }

    /** Delete the announcement AND its photo, so no orphan files pile up on disk. */
    public function destroy(Announcement $announcement): RedirectResponse
    {
        $this->deletePhoto($announcement);
        $announcement->delete();

        return back();
    }

    private function deletePhoto(Announcement $announcement): void
    {
        if ($announcement->image_path) {
            Storage::disk('public')->delete($announcement->image_path);
        }
    }
}
