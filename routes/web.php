<?php

use App\Http\Controllers\AccountStatusController;
use App\Http\Controllers\AdminRoleController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AnnouncementInteractionController;
use App\Http\Controllers\AssistantChatController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\ComplaintController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LegalPageController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\ModerationController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PreferenceController;
use App\Http\Controllers\PublicTrackingController;
use App\Http\Controllers\ResidentDirectoryController;
use App\Http\Controllers\ResidentProfileController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\SubmissionController;
use App\Http\Controllers\UserModerationController;
use App\Http\Controllers\WalkInComplaintController;
use App\Http\Controllers\WelcomeController;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureUserCanParticipate;
use Illuminate\Support\Facades\Route;

// Public legal and contact pages.
Route::get('terms', [LegalPageController::class, 'terms'])->name('terms');
Route::get('privacy-policy', [LegalPageController::class, 'privacy'])->name('privacy.policy');
Route::get('contact', [LegalPageController::class, 'contact'])->name('contact');

// Public pages.
Route::get('/', [WelcomeController::class, 'index'])->name('home');
Route::get('community', [WelcomeController::class, 'community'])->name('community.preview');

Route::get('residents/{user}', [ResidentProfileController::class, 'show'])
    ->whereNumber('user')
    ->name('residents.profile');

Route::get('track-complaint', [PublicTrackingController::class, 'index'])
    ->name('complaints.track');

Route::post('track-complaint', [PublicTrackingController::class, 'lookup'])
    ->middleware('throttle:5,1')
    ->name('complaints.track.lookup');

// Public branding photo.
Route::get('media/branding/{file}', [MediaController::class, 'branding'])
    ->where('file', '[A-Za-z0-9._-]+')
    ->name('media.branding');

// Public photos of approved community reports.
Route::get('community/photo/{file}', [MediaController::class, 'publicComplaint'])
    ->where('file', '[A-Za-z0-9._-]+')
    ->middleware('throttle:120,1')
    ->name('community.photo');

// Public announcement photos.
Route::get('community/announcement-photo/{file}', [MediaController::class, 'publicAnnouncement'])
    ->where('file', '[A-Za-z0-9._-]+')
    ->middleware('throttle:120,1')
    ->name('community.announcement-photo');

// Remember the signed-in person's language.
Route::patch('preferences', [PreferenceController::class, 'update'])
    ->middleware(['auth', 'throttle:30,1'])
    ->name('preferences.update');

// Everything below requires an authenticated, verified account.
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'dashboard'])
        ->name('dashboard');

    // Notifications.
    Route::get('notifications', [NotificationController::class, 'index'])
        ->name('notifications.index');

    Route::patch('notifications/{notification}/read', [NotificationController::class, 'markRead'])
        ->name('notifications.read');

    Route::patch('notifications/read-all', [NotificationController::class, 'markAllRead'])
        ->name('notifications.read-all');

    // Account status and appeals.
    Route::get('account-status', [AccountStatusController::class, 'show'])
        ->name('account.status');

    Route::post('account-status/appeal', [UserModerationController::class, 'appeal'])
        ->middleware('throttle:3,10')
        ->name('account.appeals.store');

    // Profile settings.
    Route::patch('settings/profile/privacy', [ProfileController::class, 'updatePrivacy'])
        ->name('profile.privacy.update');

    // Newsfeed and announcements.
    Route::get('newsfeed', [DashboardController::class, 'newsfeed'])
        ->name('newsfeed');

    Route::get('announcements', [DashboardController::class, 'announcements'])
        ->name('announcements.index');

    // Assistant chat and report details.
    Route::post('assistant/chat', AssistantChatController::class)
        ->middleware('throttle:30,1')
        ->name('assistant.chat');

    Route::get('assistant/reports/{complaint}', [AssistantChatController::class, 'report'])
        ->middleware('throttle:60,1')
        ->name('assistant.report');

    // The signed-in resident's own submissions.
    Route::get('my-submissions', [SubmissionController::class, 'index'])
        ->name('submissions.index');

    // Protected media.
    Route::get('media/{folder}/{file}', [MediaController::class, 'show'])
        ->where([
            'folder' => 'announcements|complaints|avatars',
            'file' => '[A-Za-z0-9._-]+',
        ])
        ->name('media.show');

    // Uploaded documents.
    Route::get('attachments/{attachment}', [AttachmentController::class, 'show'])
        ->middleware('throttle:120,1')
        ->name('attachments.show');

    // Announcement interactions.
    Route::post('announcements/{announcement}/react', [AnnouncementInteractionController::class, 'react'])
        ->middleware([EnsureUserCanParticipate::class, 'throttle:60,1'])
        ->name('announcements.react');

    Route::post('announcements/{announcement}/comments', [AnnouncementInteractionController::class, 'comment'])
        ->middleware([EnsureUserCanParticipate::class, 'throttle:30,1'])
        ->name('announcements.comment');

    Route::delete('announcement-comments/{comment}', [AnnouncementInteractionController::class, 'destroyComment'])
        ->name('announcements.comments.destroy');

    // Complaint actions. Authorization is enforced by the relevant policies/controllers.
    Route::post('complaints', [ComplaintController::class, 'store'])
        ->middleware([EnsureUserCanParticipate::class, 'throttle:10,1'])
        ->name('complaints.store');

    Route::patch('complaints/{complaint}', [ComplaintController::class, 'update'])
        ->middleware([EnsureUserCanParticipate::class, 'throttle:20,1'])
        ->name('complaints.update');

    Route::delete('complaints/{complaint}', [ComplaintController::class, 'destroy'])
        ->middleware([EnsureUserCanParticipate::class, 'throttle:20,1'])
        ->name('complaints.destroy');

    Route::post('complaints/{complaint}/comments', [ComplaintController::class, 'comment'])
        ->middleware([EnsureUserCanParticipate::class, 'throttle:30,1'])
        ->name('complaints.comment');

    Route::delete('comments/{comment}', [ComplaintController::class, 'destroyComment'])
        ->name('comments.destroy');

    Route::post('complaints/{complaint}/rate', [ComplaintController::class, 'rate'])
        ->middleware([EnsureUserCanParticipate::class, 'throttle:60,1'])
        ->name('complaints.rate');

    Route::post('complaints/{complaint}/react', [ComplaintController::class, 'react'])
        ->middleware([EnsureUserCanParticipate::class, 'throttle:60,1'])
        ->name('complaints.react');

    Route::post('complaints/{complaint}/report', [UserModerationController::class, 'reportPost'])
        ->middleware([EnsureUserCanParticipate::class, 'throttle:10,1'])
        ->name('complaints.report');

    // Admin-only routes.
    Route::middleware(EnsureAdmin::class)->group(function () {
        Route::get('admin/moderation', [ModerationController::class, 'index'])
            ->name('admin.moderation');

        Route::get('admin/residents', [ResidentDirectoryController::class, 'index'])
            ->name('admin.residents');

        Route::patch('admin/residents/{user}/role', [AdminRoleController::class, 'update'])
            ->whereNumber('user')
            ->name('admin.residents.role');

        Route::patch('admin/appeals/{appeal}', [UserModerationController::class, 'reviewAppeal'])
            ->whereNumber('appeal')
            ->name('admin.appeals.review');

        Route::patch('admin/users/{user}/moderation', [UserModerationController::class, 'moderateUser'])
            ->middleware('throttle:30,1')
            ->name('admin.users.moderation');

        Route::patch('admin/post-reports/{report}', [UserModerationController::class, 'reviewReport'])
            ->middleware('throttle:30,1')
            ->name('admin.post-reports.review');

        Route::get('admin/walk-in-complaints/create', [WalkInComplaintController::class, 'create'])
            ->name('admin.walk-in.create');

        Route::post('admin/walk-in-complaints', [WalkInComplaintController::class, 'store'])
            ->middleware('throttle:20,1')
            ->name('admin.walk-in.store');

        Route::patch('complaints/{complaint}/approve', [ComplaintController::class, 'approve'])
            ->name('complaints.approve');

        Route::patch('complaints/{complaint}/status', [ComplaintController::class, 'updateStatus'])
            ->middleware('throttle:60,1')
            ->name('complaints.status');

        // Removal records a reason; restoration reverses the removal.
        Route::patch('complaints/{complaint}/remove', [ComplaintController::class, 'remove'])
            ->middleware('throttle:30,1')
            ->name('complaints.remove');

        Route::patch('complaints/{complaint}/restore', [ComplaintController::class, 'restore'])
            ->middleware('throttle:30,1')
            ->name('complaints.restore');

        // Announcement administration.
        Route::post('announcements', [AnnouncementController::class, 'store'])
            ->middleware('throttle:10,1')
            ->name('announcements.store');

        Route::post('announcements/{announcement}', [AnnouncementController::class, 'update'])
            ->middleware('throttle:20,1')
            ->name('announcements.update');

        Route::patch('announcements/{announcement}/pin', [AnnouncementController::class, 'togglePin'])
            ->middleware('throttle:30,1')
            ->name('announcements.pin');

        Route::delete('announcements/{announcement}', [AnnouncementController::class, 'destroy'])
            ->middleware('throttle:20,1')
            ->name('announcements.destroy');
    });
});

require __DIR__.'/settings.php';
