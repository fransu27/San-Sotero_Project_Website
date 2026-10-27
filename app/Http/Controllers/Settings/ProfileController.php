<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\AvatarUpdateRequest;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            // Sent as plain Y-m-d so the date picker never shifts a day because of timezones.
            'phone' => $request->user()->phone,
            'birthdate' => $request->user()->birthdate?->format('Y-m-d'),
            'avatarUrl' => $request->user()->avatarUrl(),
            // A profile restriction freezes ONLY the picture; the page tells the resident why and until when.
            'avatarLocked' => $request->user()->isProfileRestricted(),
            'avatarLockedUntil' => $request->user()->isProfileRestricted() ? $request->user()->profile_restriction_expires_at?->toIso8601String() : null,
            'avatarLockedReason' => $request->user()->isProfileRestricted() ? $request->user()->profile_restriction_reason : null,
            'profileVisibility' => $request->user()->profile_visibility ?? 'public',
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')]);

        return to_route('profile.edit');
    }

    public function updatePrivacy(Request $request): RedirectResponse
    {
        $data = $request->validate(['profile_visibility' => ['required', 'in:public,private']]);
        $request->user()->forceFill(['profile_visibility' => $data['profile_visibility']])->save();
        Inertia::flash('toast', ['type' => 'success', 'message' => $data['profile_visibility'] === 'private' ? 'Your profile is now private.' : 'Your profile is now public.']);
        return back();
    }

    /**
     * Upload or replace the profile picture (any time, from the person's own settings).
     * The old file is deleted so no orphan pictures pile up on disk.
     */
    public function updateAvatar(AvatarUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        abort_if($user === null, 401);
        $this->ensureAvatarNotLocked($user);

        $file = $request->file('avatar');
        $path = $file?->store('avatars', 'public'); // random file name; false when the disk could not write it

        if ($path === null || $path === false) {
            throw ValidationException::withMessages(['avatar' => 'The picture could not be saved. Please try again.']);
        }

        $old = $user->avatar_path;
        $user->forceFill(['avatar_path' => $path])->save();

        if ($old) {
            Storage::disk('public')->delete($old);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile picture updated.')]);

        return to_route('profile.edit');
    }

    /** A restricted profile cannot upload, replace or remove its picture until the restriction is over. */
    private function ensureAvatarNotLocked(\App\Models\User $user): void
    {
        if ($user->isProfileRestricted()) {
            throw ValidationException::withMessages([
                'avatar' => 'Your profile picture is restricted'.($user->profile_restriction_expires_at ? ' until '.$user->profile_restriction_expires_at->toDayDateTimeString() : '').' and cannot be changed right now.',
            ]);
        }
    }

    /** Remove the profile picture (the initials badge is shown again). */
    public function destroyAvatar(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_if($user === null, 401);
        $this->ensureAvatarNotLocked($user);

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->forceFill(['avatar_path' => null])->save();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile picture removed.')]);

        return to_route('profile.edit');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
