<?php

// @formatter:off
// phpcs:ignoreFile
/**
 * A helper file for your Eloquent Models
 * Copy the phpDocs from this file to the correct Model,
 * And remove them from this file, to prevent double declarations.
 *
 * @author Barry vd. Heuvel <barryvdh@gmail.com>
 */


namespace App\Models{
/**
 * @mixin IdeHelperAnnouncement
 * @property int $id
 * @property int $user_id
 * @property string $title
 * @property string $body
 * @property bool $pinned
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property string|null $image_path
 * @property \Carbon\CarbonImmutable|null $edited_at
 * @property array<array-key, mixed>|null $translations
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Announcement newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Announcement newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Announcement query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Announcement whereBody($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Announcement whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Announcement whereEditedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Announcement whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Announcement whereImagePath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Announcement wherePinned($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Announcement whereTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Announcement whereTranslations($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Announcement whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Announcement whereUserId($value)
 * @mixin \Eloquent
 */
	class Announcement extends \Eloquent {}
}

namespace App\Models{
/**
 * @mixin IdeHelperComment
 * @property int $id
 * @property int $complaint_id
 * @property int $user_id
 * @property string $body
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereBody($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereComplaintId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereUserId($value)
 * @mixin \Eloquent
 */
	class Comment extends \Eloquent {}
}

namespace App\Models{
/**
 * @mixin IdeHelperComplaint
 * @property int $id
 * @property int $user_id
 * @property string $title
 * @property string $description
 * @property string $location
 * @property string $category
 * @property string $status
 * @property \Carbon\CarbonImmutable $incident_date
 * @property string|null $image_path
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property \Carbon\CarbonImmutable|null $removed_at
 * @property string|null $removed_reason
 * @property \Carbon\CarbonImmutable|null $edited_at
 * @property string|null $custom_category
 * @property string $visibility
 * @property bool $is_anonymous
 * @property string $approval_status
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Comment> $comments
 * @property-read int|null $comments_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ComplaintEvent> $events
 * @property-read int|null $events_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Reaction> $reactions
 * @property-read int|null $reactions_count
 * @property-read \App\Models\User $user
 * @method static Builder<static>|Complaint newModelQuery()
 * @method static Builder<static>|Complaint newQuery()
 * @method static Builder<static>|Complaint query()
 * @method static Builder<static>|Complaint visibleTo(\App\Models\User $user)
 * @method static Builder<static>|Complaint whereApprovalStatus($value)
 * @method static Builder<static>|Complaint whereCategory($value)
 * @method static Builder<static>|Complaint whereCreatedAt($value)
 * @method static Builder<static>|Complaint whereCustomCategory($value)
 * @method static Builder<static>|Complaint whereDescription($value)
 * @method static Builder<static>|Complaint whereEditedAt($value)
 * @method static Builder<static>|Complaint whereId($value)
 * @method static Builder<static>|Complaint whereImagePath($value)
 * @method static Builder<static>|Complaint whereIncidentDate($value)
 * @method static Builder<static>|Complaint whereIsAnonymous($value)
 * @method static Builder<static>|Complaint whereLocation($value)
 * @method static Builder<static>|Complaint whereRemovedAt($value)
 * @method static Builder<static>|Complaint whereRemovedReason($value)
 * @method static Builder<static>|Complaint whereStatus($value)
 * @method static Builder<static>|Complaint whereTitle($value)
 * @method static Builder<static>|Complaint whereUpdatedAt($value)
 * @method static Builder<static>|Complaint whereUserId($value)
 * @method static Builder<static>|Complaint whereVisibility($value)
 * @mixin \Eloquent
 */
	class Complaint extends \Eloquent {}
}

namespace App\Models{
/**
 * One line of a complaint's progress timeline. Append-only: there is no update endpoint.
 *
 * type: submitted | approved | status | edited | resubmitted  (the UI translates these; only `note` is free text from staff)
 *
 * @mixin IdeHelperComplaintEvent
 * @property int $id
 * @property int $complaint_id
 * @property int|null $user_id
 * @property string $type
 * @property string|null $status
 * @property string|null $note
 * @property \Carbon\CarbonImmutable $created_at
 * @property-read \App\Models\User|null $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent whereComplaintId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent whereNote($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ComplaintEvent whereUserId($value)
 * @mixin \Eloquent
 */
	class ComplaintEvent extends \Eloquent {}
}

namespace App\Models{
/**
 * @mixin IdeHelperReaction
 * @property int $id
 * @property int $complaint_id
 * @property int $user_id
 * @property string $type
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reaction newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reaction newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reaction query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reaction whereComplaintId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reaction whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reaction whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reaction whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reaction whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reaction whereUserId($value)
 * @mixin \Eloquent
 */
	class Reaction extends \Eloquent {}
}

namespace App\Models{
/**
 * Tiny key/value store for things a local admin edits from Settings (barangay name, caption, location photo).
 *
 * Read on every page (it is shared with Inertia), so the whole table is cached and the cache is cleared on write.
 *
 * @mixin IdeHelperSiteSetting
 * @property int $id
 * @property string $key
 * @property string|null $value
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiteSetting newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiteSetting newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiteSetting query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiteSetting whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiteSetting whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiteSetting whereKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiteSetting whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiteSetting whereValue($value)
 * @mixin \Eloquent
 */
	class SiteSetting extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string $role
 * @property string|null $phone
 * @property Carbon|null $birthdate
 * @property string|null $locale
 * @property bool $anonymous_default
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @mixin IdeHelperUser
 * @property-read \Illuminate\Notifications\DatabaseNotificationCollection<int, \Illuminate\Notifications\DatabaseNotification> $notifications
 * @property-read int|null $notifications_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Laravel\Passkeys\Passkey> $passkeys
 * @property-read int|null $passkeys_count
 * @method static \Database\Factories\UserFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereAnonymousDefault($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereBirthdate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmailVerifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereLocale($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePhone($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRememberToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRole($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTwoFactorConfirmedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTwoFactorRecoveryCodes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTwoFactorSecret($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUpdatedAt($value)
 * @mixin \Eloquent
 */
	class User extends \Eloquent implements \Laravel\Fortify\Contracts\PasskeyUser, \Laravel\Passkeys\Contracts\PasskeyUser {}
}

