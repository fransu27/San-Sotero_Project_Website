<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Notifications\DatabaseNotificationCollection;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Passkeys\Passkey;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string $role
 * @property string|null $phone
 * @property Carbon|null $birthdate
 * @property string|null $locale
 * @property string|null $avatar_path
 * @property bool $anonymous_default
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property string|null $moderation_status
 * @property string|null $moderation_reason
 * @property Carbon|null $restriction_expires_at
 * @property Carbon|null $restricted_at
 * @property string|null $restriction_reason
 * @property Carbon|null $banned_at
 * @property string|null $ban_reason
 * @property bool $profile_restricted
 * @property string|null $profile_restriction_reason
 * @property Carbon|null $profile_restriction_expires_at
 * @property Carbon|null $last_seen_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read DatabaseNotificationCollection<int, DatabaseNotification> $notifications
 * @property-read int|null $notifications_count
 * @property-read Collection<int, Passkey> $passkeys
 * @property-read int|null $passkeys_count
 *
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
 *
 * @mixin \Eloquent
 */
#[Fillable(['name', 'email', 'phone', 'birthdate', 'password', 'locale', 'anonymous_default', 'terms_accepted_at'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token', 'avatar_path'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'birthdate' => 'date',
            'anonymous_default' => 'boolean',
            'profile_restricted' => 'boolean',
            'profile_restriction_expires_at' => 'datetime',
            'profile_visibility' => 'string',
            'terms_accepted_at' => 'datetime',
            'is_primary_admin' => 'boolean',
            'restriction_expires_at' => 'datetime',
            'restricted_at' => 'datetime',
            'banned_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'password' => 'hashed',
            /* @chisel-2fa */
            'two_factor_confirmed_at' => 'datetime',
            /* @end-chisel-2fa */
        ];
    }

    /** URL of the profile picture (served by MediaController), or null to show the initials badge. */
    public function avatarUrl(): ?string
    {
        return $this->isProfileRestricted()
            ? '/images/anonymous-avatar.svg'
            : ($this->avatar_path ? '/media/'.$this->avatar_path : null);
    }

    /**
     * A profile restriction ONLY affects the profile picture: it shows the anonymous placeholder and the picture
     * cannot be changed until the restriction ends. It never blocks posting, commenting or reacting.
     * An optional expiry lets it lift itself automatically; no expiry means it lasts until an admin restores it.
     */
    public function isProfileRestricted(): bool
    {
        if (! ($this->profile_restricted ?? false)) {
            return false;
        }

        return $this->profile_restriction_expires_at === null || $this->profile_restriction_expires_at->isFuture();
    }

    /** True for the barangay admin. `role` is not fillable, so it can't be set from a form. */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /** The original site owner has immutable administrator status. */
    public function isPrimaryAdmin(): bool
    {
        return $this->isAdmin() && (bool) $this->is_primary_admin;
    }

    public function effectiveModerationStatus(): string
    {
        if ($this->banned_at !== null || $this->moderation_status === 'banned') {
            return 'banned';
        }

        if (
            $this->moderation_status === 'restricted'
            && $this->restriction_expires_at
            && $this->restriction_expires_at->isPast()
        ) {
            return 'active';
        }

        return $this->moderation_status ?? 'active';
    }

    public function isPostingRestricted(): bool
    {
        return ! $this->isAdmin() && $this->effectiveModerationStatus() !== 'active';
    }
}
