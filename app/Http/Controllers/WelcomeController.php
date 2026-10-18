<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public landing page. The "Barangay announcements" section is REAL data written by the admin (with optional
 * Tagalog/Bisaya versions) instead of hard-coded English placeholders. If the admin hasn't posted any, the page
 * says so in the visitor's language.
 * SECURITY: guests only get title/body/translations of announcements (which are meant for the public) —
 * no author, no photo path, no complaints, nothing about residents. (The community feed adds the announcement photo
 * through the guarded public route only, never the storage path.)
 */
class WelcomeController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('welcome', [
            'announcements' => Announcement::orderByDesc('pinned')->latest()->limit(4)->get()
                ->map(fn ($a) => ['id' => $a->id, 'title' => $a->title, 'body' => $a->body, 'translations' => $a->translations]),
        ]);
    }

    /**
     * Public, read-only community feed for visitors who have not signed in.
     *
     * SECURITY: only approved, public, non-removed reports are queried. The response
     * intentionally omits resident identity, private fields, reaction/comment data,
     * and any photo other than the guarded public photo route (community.photo).
     */
    public function community(): Response
    {
        $announcements = Announcement::query()
            ->orderByDesc('pinned')
            ->latest()
            ->limit(20)
            ->get(['id', 'title', 'body', 'pinned', 'translations', 'image_path', 'created_at'])
            ->map(fn (Announcement $announcement) => [
                'id' => $announcement->id,
                'title' => $announcement->title,
                'body' => $announcement->body,
                'pinned' => $announcement->pinned,
                'translations' => $announcement->translations,
                // Only the guarded public route is exposed; the storage path itself is never sent to guests.
                'image_url' => $announcement->image_path
                    ? route('community.announcement-photo', ['file' => basename($announcement->image_path)], false)
                    : null,
                'created_at' => $announcement->created_at?->toIso8601String(),
            ]);

        $complaints = \App\Models\Complaint::query()
            ->where('visibility', 'public')
            ->where('approval_status', \App\Models\Complaint::APPROVAL_APPROVED)
            ->whereNull('removed_at')
            ->latest()
            ->limit(30)
            ->get(['id', 'title', 'description', 'category', 'custom_category', 'location', 'status', 'image_path', 'created_at'])
            ->map(fn (\App\Models\Complaint $complaint) => [
                'id' => $complaint->id,
                'title' => $complaint->title,
                'description' => $complaint->description,
                'category' => $complaint->custom_category ?: $complaint->category,
                'location' => $complaint->location,
                'status' => $complaint->status,
                // Only the guarded public route is exposed; the storage path itself is never sent to guests.
                'image_url' => $complaint->image_path
                    ? route('community.photo', ['file' => basename($complaint->image_path)], false)
                    : null,
                'created_at' => $complaint->created_at?->toIso8601String(),
            ]);

        return Inertia::render('public-newsfeed', [
            'announcements' => $announcements,
            'complaints' => $complaints,
        ]);
    }

}
