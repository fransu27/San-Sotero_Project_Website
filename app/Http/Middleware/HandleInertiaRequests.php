<?php

namespace App\Http\Middleware;

use App\Models\SiteSetting;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            // Branding editable by an admin in Settings → Barangay. Shared to every page (cached; see SiteSetting).
            'barangay' => fn () => [
                'name' => SiteSetting::read('barangay_name'),
                'caption' => SiteSetting::read('barangay_caption'),
                // The admin's own upload if there is one, otherwise the bundled San Sotero photo (public/images/barangay-default.jpg).
                'banner_url' => ($file = SiteSetting::read('banner_path'))
                    ? '/media/'.$file.'?v='.SiteSetting::read('banner_version', '1')
                    : '/images/barangay-default.jpg',
                'banner_is_default' => ! SiteSetting::read('banner_path'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
