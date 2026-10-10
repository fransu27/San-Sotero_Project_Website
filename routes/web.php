<?php

use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AssistantChatController;
use App\Http\Controllers\ComplaintController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\ModerationController;
use App\Http\Controllers\PreferenceController;
use App\Http\Controllers\SubmissionController;
use App\Http\Controllers\WelcomeController;
use App\Http\Middleware\EnsureAdmin;
use Illuminate\Support\Facades\Route;

// Public pages. The landing page shows real announcements written by the admin.
Route::get('/', [WelcomeController::class, 'index'])->name('home');

// The barangay location photo is public on purpose (visitors see it too); MediaController only serves the configured file.
Route::get('media/branding/{file}', [MediaController::class, 'branding'])->where('file', '[A-Za-z0-9._-]+')->name('media.branding');

// Remember the signed-in person's language (guests keep theirs in the browser).
Route::patch('preferences', [PreferenceController::class, 'update'])->middleware(['auth', 'throttle:30,1'])->name('preferences.update');

// Everything below needs a logged-in (and verified) account.
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'dashboard'])->name('dashboard');
    Route::get('newsfeed', [DashboardController::class, 'newsfeed'])->name('newsfeed');
    Route::post('assistant/chat', AssistantChatController::class)->middleware('throttle:30,1')->name('assistant.chat');
    // A resident's own reports, searchable by ticket code. Scoped to the signed-in user in SQL (see SubmissionController).
    Route::get('my-submissions', [SubmissionController::class, 'index'])->name('submissions.index');

    // Photos are streamed through here (no storage:link needed); access is checked in MediaController.
    Route::get('media/{folder}/{file}', [MediaController::class, 'show'])->where(['folder' => 'announcements|complaints|avatars', 'file' => '[A-Za-z0-9._-]+'])->name('media.show');

    // throttle = anti-spam / abuse limits per user.
    // WHO may act on WHICH complaint is decided inside each action by ComplaintPolicy (Gate::authorize), not by the URL.
    Route::post('complaints', [ComplaintController::class, 'store'])->middleware('throttle:10,1')->name('complaints.store');
    Route::patch('complaints/{complaint}', [ComplaintController::class, 'update'])->middleware('throttle:20,1')->name('complaints.update');      // author or admin
    Route::delete('complaints/{complaint}', [ComplaintController::class, 'destroy'])->name('complaints.destroy');                              // author only
    Route::post('complaints/{complaint}/comments', [ComplaintController::class, 'comment'])->middleware('throttle:30,1')->name('complaints.comment');
    Route::post('complaints/{complaint}/rate', [ComplaintController::class, 'rate'])->middleware('throttle:60,1')->name('complaints.rate');
    Route::post('complaints/{complaint}/react', [ComplaintController::class, 'react'])->middleware('throttle:60,1')->name('complaints.react');

    // Admin-only: EnsureAdmin here + Gate::authorize('moderate') inside each action (two locks).
    Route::middleware(EnsureAdmin::class)->group(function () {
        Route::get('admin/moderation', [ModerationController::class, 'index'])->name('admin.moderation');
        Route::patch('complaints/{complaint}/approve', [ComplaintController::class, 'approve'])->name('complaints.approve');
        Route::patch('complaints/{complaint}/status', [ComplaintController::class, 'updateStatus'])->middleware('throttle:60,1')->name('complaints.status');
        // "Remove" = flag with a reason (this is also how a post is DECLINED); restore undoes it.
        Route::patch('complaints/{complaint}/remove', [ComplaintController::class, 'remove'])->middleware('throttle:30,1')->name('complaints.remove');
        Route::patch('complaints/{complaint}/restore', [ComplaintController::class, 'restore'])->name('complaints.restore');

        Route::post('announcements', [AnnouncementController::class, 'store'])->middleware('throttle:10,1')->name('announcements.store');
        Route::post('announcements/{announcement}', [AnnouncementController::class, 'update'])->middleware('throttle:20,1')->name('announcements.update');
        Route::patch('announcements/{announcement}/pin', [AnnouncementController::class, 'togglePin'])->name('announcements.pin');
        Route::delete('announcements/{announcement}', [AnnouncementController::class, 'destroy'])->name('announcements.destroy');
    });
});

require __DIR__.'/settings.php';
