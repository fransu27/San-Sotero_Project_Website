<?php

use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AnnouncementInteractionController;
use App\Http\Controllers\AssistantChatController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\CommunityModerationController;
use App\Http\Controllers\ComplaintController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\ModerationController;
use App\Http\Controllers\PreferenceController;
use App\Http\Controllers\PublicTrackingController;
use App\Http\Controllers\SubmissionController;
use App\Http\Controllers\WalkInComplaintController;
use App\Http\Controllers\WelcomeController;
use App\Http\Middleware\EnsureAdmin;
use App\Models\Complaint;
use Illuminate\Support\Facades\Route;

// Public pages. The landing page shows real announcements written by the admin.
Route::get('/', [WelcomeController::class, 'index'])->name('home');
Route::get('community', [WelcomeController::class, 'community'])->name('community.preview');
Route::get('track-complaint', [PublicTrackingController::class, 'index'])->name('complaints.track');
Route::post('track-complaint', [PublicTrackingController::class, 'lookup'])->middleware('throttle:5,1')->name('complaints.track.lookup');

// The barangay location photo is public on purpose (visitors see it too); MediaController only serves the configured file.
Route::get('media/branding/{file}', [MediaController::class, 'branding'])->where('file', '[A-Za-z0-9._-]+')->name('media.branding');

// Photos of approved PUBLIC reports for the guest community feed. MediaController re-checks public + approved + not removed.
Route::get('community/photo/{file}', [MediaController::class, 'publicComplaint'])->where('file', '[A-Za-z0-9._-]+')->middleware('throttle:120,1')->name('community.photo');

// Photos of announcements for the guest community feed (announcements are public; MediaController re-checks the file belongs to one).
Route::get('community/announcement-photo/{file}', [MediaController::class, 'publicAnnouncement'])->where('file', '[A-Za-z0-9._-]+')->middleware('throttle:120,1')->name('community.announcement-photo');

// Direct permalink to a specific community report post
Route::get('community/reports/{complaint}', function (Complaint $complaint) {
    abort_unless($complaint->isPubliclyVisible(), 404);
    return redirect('/community#complaint-'.$complaint->id);
})->name('community.complaint.permalink');

// Remember the signed-in person's language (guests keep theirs in the browser).
Route::patch('preferences', [PreferenceController::class, 'update'])->middleware(['auth', 'throttle:30,1'])->name('preferences.update');

// Everything below needs a logged-in (and verified) account.
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'dashboard'])->name('dashboard');
    Route::get('newsfeed', [DashboardController::class, 'newsfeed'])->name('newsfeed');
    Route::get('announcements', [DashboardController::class, 'announcements'])->name('announcements.index');
    Route::post('assistant/chat', AssistantChatController::class)->middleware('throttle:30,1')->name('assistant.chat');
    // The post behind an assistant "Open report" link, shown in a pop-out (view policy decides who may open it).
    Route::get('assistant/reports/{complaint}', [AssistantChatController::class, 'report'])->middleware('throttle:60,1')->name('assistant.report');
    // A resident's own reports, searchable by ticket code. Scoped to the signed-in user in SQL (see SubmissionController).
    Route::get('my-submissions', [SubmissionController::class, 'index'])->name('submissions.index');

    // Photos are streamed through here (no storage:link needed); access is checked in MediaController.
    Route::get('media/{folder}/{file}', [MediaController::class, 'show'])->where(['folder' => 'announcements|complaints|avatars', 'file' => '[A-Za-z0-9._-]+'])->name('media.show');

    // Uploaded PDFs / documents (preview + download). Access is checked in AttachmentController.
    Route::get('attachments/{attachment}', [AttachmentController::class, 'show'])->middleware('throttle:120,1')->name('attachments.show');

    // Like / dislike / comment on announcements (everyone who is signed in).
    Route::post('announcements/{announcement}/react', [AnnouncementInteractionController::class, 'react'])->middleware('throttle:60,1')->name('announcements.react');
    Route::post('announcements/{announcement}/comments', [AnnouncementInteractionController::class, 'comment'])->middleware('throttle:30,1')->name('announcements.comment');

    // throttle = anti-spam / abuse limits per user.
    // WHO may act on WHICH complaint is decided inside each action by ComplaintPolicy (Gate::authorize), not by the URL.
    Route::post('complaints', [ComplaintController::class, 'store'])->middleware('throttle:10,1')->name('complaints.store');
    Route::patch('complaints/{complaint}', [ComplaintController::class, 'update'])->middleware('throttle:20,1')->name('complaints.update');      // author or admin
    Route::delete('complaints/{complaint}', [ComplaintController::class, 'destroy'])->name('complaints.destroy');                             // author only
    Route::post('complaints/{complaint}/comments', [ComplaintController::class, 'comment'])->middleware('throttle:30,1')->name('complaints.comment');
    Route::post('complaints/{complaint}/rate', [ComplaintController::class, 'rate'])->middleware('throttle:60,1')->name('complaints.rate');
    Route::post('complaints/{complaint}/react', [ComplaintController::class, 'react'])->middleware('throttle:60,1')->name('complaints.react');

    // Resident post reporting action
    Route::post('complaints/{complaint}/report', [CommunityModerationController::class, 'report'])->middleware('throttle:5,1')->name('complaints.report');

    // Admin-only: EnsureAdmin here + Gate::authorize('moderate') inside each action (two locks).
    Route::middleware(EnsureAdmin::class)->group(function () {
        Route::get('admin/moderation', [ModerationController::class, 'index'])->name('admin.moderation');
        Route::get('admin/community-moderation', [CommunityModerationController::class, 'queue'])->name('admin.community-moderation');
        Route::get('admin/walk-in-complaints/create', [WalkInComplaintController::class, 'create'])->name('admin.walk-in.create');
        Route::post('admin/walk-in-complaints', [WalkInComplaintController::class, 'store'])->middleware('throttle:20,1')->name('admin.walk-in.store');
        Route::patch('complaints/{complaint}/approve', [ComplaintController::class, 'approve'])->name('complaints.approve');
        Route::patch('complaints/{complaint}/status', [ComplaintController::class, 'updateStatus'])->middleware('throttle:60,1')->name('complaints.status');
        // "Remove" = flag with a reason (this is also how a post is DECLINED); restore undoes it.
        Route::patch('complaints/{complaint}/remove', [ComplaintController::class, 'remove'])->middleware('throttle:30,1')->name('complaints.remove');
        Route::patch('complaints/{complaint}/restore', [ComplaintController::class, 'restore'])->name('complaints.restore');

        // Admin Moderation Controls
        Route::patch('admin/users/{user}/restrict', [CommunityModerationController::class, 'restrictUser'])->middleware('throttle:10,1')->name('admin.users.restrict');
        Route::patch('admin/users/{user}/ban', [CommunityModerationController::class, 'banUser'])->middleware('throttle:10,1')->name('admin.users.ban');
        Route::patch('admin/complaints/{complaint}/take-down', [CommunityModerationController::class, 'takeDown'])->middleware('throttle:20,1')->name('admin.complaints.take-down');

        Route::post('announcements', [AnnouncementController::class, 'store'])->middleware('throttle:10,1')->name('announcements.store');
        Route::post('announcements/{announcement}', [AnnouncementController::class, 'update'])->middleware('throttle:20,1')->name('announcements.update');
        Route::patch('announcements/{announcement}/pin', [AnnouncementController::class, 'togglePin'])->name('announcements.pin');
        Route::delete('announcements/{announcement}', [AnnouncementController::class, 'destroy'])->name('announcements.destroy');
    });
});

require __DIR__.'/settings.php';