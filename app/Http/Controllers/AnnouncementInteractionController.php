<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\AnnouncementComment;
use App\Models\AnnouncementReaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Like / dislike / comment on an announcement. Open to every signed-in resident and admin (the routes sit
 * inside the auth + verified group, with throttles); the admin-only actions stay in AnnouncementController.
 */
class AnnouncementInteractionController extends Controller
{
    /** One vote per person: the same vote again removes it, the other one switches it. (Unique index = no double votes.) */
    public function react(Request $request, Announcement $announcement): RedirectResponse
    {
        $user = $request->user();

        if ($user === null) {
            return back();
        }

        /** @var array{type: string} $validated */
        $validated = $request->validate(['type' => ['required', Rule::in(AnnouncementReaction::TYPES)]]);

        $existing = AnnouncementReaction::where(['announcement_id' => $announcement->id, 'user_id' => $user->id])->first();

        if ($existing && $existing->type === $validated['type']) {
            $existing->delete();
        } else {
            AnnouncementReaction::updateOrCreate(
                ['announcement_id' => $announcement->id, 'user_id' => $user->id],
                ['type' => $validated['type']],
            );
        }

        return back();
    }

    /** Plain-text comment (React escapes it on display). */
    public function comment(Request $request, Announcement $announcement): RedirectResponse
    {
        /** @var array{body: string} $validated */
        $validated = $request->validate(['body' => ['required', 'string', 'max:1000']]);

        $body = trim(strip_tags($validated['body']));

        if ($body !== '') {
            AnnouncementComment::create([
                'announcement_id' => $announcement->id,
                'user_id' => (int) $request->user()?->id,
                'body' => $body,
            ]);
        }

        return back();
    }
}
