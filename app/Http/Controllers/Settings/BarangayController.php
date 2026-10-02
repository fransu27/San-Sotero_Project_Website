<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin-only (route wrapped in EnsureAdmin): the barangay's display name, a short caption and the LOCATION PHOTO
 * that replaces the old fixed banner on the dashboard and settings pages. Until a photo is uploaded the pages show
 * a neutral placeholder, so nothing about the look is hard-coded any more.
 */
class BarangayController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('settings/barangay');
        // name / caption / banner_url are already shared to every page as the `barangay` prop
    }

    /**
     * SECURITY: text is tag-stripped and length-limited; the photo must be a real jpg/png/webp <= 4 MB (no SVG),
     * is stored under a random name, and the previous file is deleted so nothing piles up on disk.
     */
    public function update(Request $request)
    {
        $request->merge([
            'name' => trim(strip_tags((string) $request->input('name'))),
            'caption' => trim(strip_tags((string) $request->input('caption'))),
            'remove_image' => $request->boolean('remove_image'),
        ]);

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:80'],
            'caption' => ['nullable', 'string', 'max:160'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'remove_image' => ['boolean'],
        ]);

        $values = ['barangay_name' => $data['name'] ?: null, 'barangay_caption' => $data['caption'] ?: null];
        $old = SiteSetting::read('banner_path');

        if ($request->hasFile('image')) {
            $values['banner_path'] = $request->file('image')->store('branding', 'public');
            $values['banner_version'] = (string) time(); // cache-buster for the <img> URL
        } elseif ($data['remove_image']) {
            $values['banner_path'] = null;
        }

        SiteSetting::write($values);

        if (array_key_exists('banner_path', $values) && $old) {
            Storage::disk('public')->delete($old);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Barangay details saved.']);

        return back();
    }
}
