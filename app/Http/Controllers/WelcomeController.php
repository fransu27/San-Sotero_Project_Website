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
 * no author, no photo path, no complaints, nothing about residents.
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
}
