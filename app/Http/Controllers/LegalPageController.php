<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class LegalPageController extends Controller
{
    public function terms(): Response
    {
        return Inertia::render('terms', [
            'supportEmail' => config('barangay.support_email', config('mail.from.address', 'support@example.com')),
        ]);
    }

    public function privacy(): Response
    {
        return Inertia::render('privacy-policy', [
            'supportEmail' => config('barangay.support_email', config('mail.from.address', 'support@example.com')),
        ]);
    }

    public function contact(): Response
    {
        return Inertia::render('contact', [
            'supportEmail' => config('barangay.support_email', config('mail.from.address', 'support@example.com')),
        ]);
    }
}
