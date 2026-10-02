<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Saves the signed-in person's language so it follows them to other devices.
 * (Guests keep their choice in the browser only. The theme is remembered per device by the appearance hook.)
 * SECURITY: only the logged-in user's own row is touched, and only a value from the fixed list is accepted.
 */
class PreferenceController extends Controller
{
    public const LOCALES = ['en', 'tl', 'ceb'];

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate(['locale' => ['required', Rule::in(self::LOCALES)]]);

        $request->user()->forceFill(['locale' => $data['locale']])->save();

        return back();
    }
}
