<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Authorized desk-officer intake for residents who cannot use the online form themselves. */
class WalkInComplaintController extends Controller
{
    public function create(): Response
    {
        abort_unless(auth()->user()?->isAdmin(), 403);

        return Inertia::render('admin/walk-in-complaint', ['categories' => Complaint::CATEGORIES]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->isAdmin(), 403);

        $data = $request->validate([
            'reporter_name' => ['required', 'string', 'max:120'],
            'reporter_contact' => ['nullable', 'string', 'max:80'],
            'title' => ['required', 'string', 'max:150'],
            'description' => ['required', 'string', 'max:3000'],
            'location' => ['required', 'string', 'max:150'],
            'category' => ['required', Rule::in(Complaint::CATEGORIES)],
            'custom_category' => ['required_if:category,Others', 'nullable', 'string', 'min:2', 'max:60'],
            'incident_date' => ['required', 'date', 'before_or_equal:today'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'files' => ['nullable', 'array', 'max:5'],
            'files.*' => ['file', 'mimes:pdf,doc,docx,odt,txt', 'max:10240'],
        ]);

        $files = $request->file('files', []);
        $totalBytes = collect($files)->sum(fn ($file) => $file?->getSize() ?? 0) + ($request->file('image')?->getSize() ?? 0);
        if ($totalBytes > 10 * 1024 * 1024) {
            throw \Illuminate\Validation\ValidationException::withMessages(['files' => 'The combined size of all evidence, including the photo, must not exceed 10 MB.']);
        }

        $pin = (string) random_int(100000, 999999);
        $complaint = DB::transaction(function () use ($user, $data, $pin, $request): Complaint {
            $complaint = new Complaint([
                'user_id' => $user->id,
                'title' => trim(strip_tags($data['title'])),
                'description' => trim(strip_tags($data['description'])),
                'location' => trim(strip_tags($data['location'])),
                'category' => $data['category'],
                'custom_category' => $data['category'] === 'Others' ? trim(strip_tags($data['custom_category'] ?? '')) : null,
                'incident_date' => $data['incident_date'],
                'visibility' => 'private',
                'is_anonymous' => false,
            ]);
            $complaint->ticket_code = Complaint::newTicketCode();
            $complaint->status = 'Pending';
            $complaint->approval_status = Complaint::APPROVAL_APPROVED;
            $complaint->intake_channel = 'walk_in';
            $complaint->reporter_name = trim(strip_tags($data['reporter_name']));
            $complaint->reporter_contact = isset($data['reporter_contact']) ? trim(strip_tags($data['reporter_contact'])) : null;
            $complaint->entered_by_user_id = $user->id;
            $complaint->tracking_pin_hash = Hash::make($pin);
            $imagePath = $request->file('image')?->store('complaints', 'public');
            if ($request->hasFile('image') && (! is_string($imagePath) || $imagePath === '')) {
                throw \Illuminate\Validation\ValidationException::withMessages(['image' => 'The photo could not be saved. Please try again.']);
            }
            $complaint->image_path = is_string($imagePath) ? $imagePath : null;
            $complaint->save();
            $complaint->log('submitted', $user, 'Pending', 'Received in person at the barangay desk.');
            $complaint->syncAttachments($request->file('files', []), [], $user->id);

            return $complaint;
        });

        // The PIN is only flashed once. Only its hash is persisted.
        return to_route('admin.walk-in.create')->with('walk_in_receipt', [
            'ticket_code' => $complaint->ticket_code,
            'pin' => $pin,
            'reporter_name' => $complaint->reporter_name,
        ]);
    }
}
