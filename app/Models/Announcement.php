<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property string $title
 * @property string $body
 * @property bool $pinned
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property string|null $image_path
 * @property CarbonImmutable|null $edited_at
 * @property array<array-key, mixed>|null $translations
 * @property-read User $user
 *
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
 *
 * @mixin \Eloquent
 */
class Announcement extends Model
{
    /** Languages an announcement can be written in (order = fallback order). */
    public const LOCALES = ['en', 'tl', 'ceb', 'war'];

    // SECURITY: whitelist for mass assignment. Only AnnouncementController (admin-only route) writes these.
    protected $fillable = ['user_id', 'title', 'body', 'translations', 'image_path', 'pinned'];

    protected function casts(): array
    {
        return ['pinned' => 'boolean', 'edited_at' => 'datetime', 'translations' => 'array'];
    }

    /**
     * Title/body in the reader's language. If the admin did not write that language we fall back
     * (en -> tl -> ceb -> the base columns) and report which language was used, so the UI can say
     * "Shown in English". Old announcements (translations = NULL) count as English.
     *
     * @return array{title: string, body: string, lang: string}
     */
    public function localized(string $locale): array
    {
        $all = $this->translations ?: ['en' => ['title' => $this->title, 'body' => $this->body]];

        foreach ([$locale, ...self::LOCALES] as $lang) {
            if (! empty($all[$lang]['title']) && ! empty($all[$lang]['body'])) {
                return ['title' => $all[$lang]['title'], 'body' => $all[$lang]['body'], 'lang' => $lang];
            }
        }

        return ['title' => $this->title, 'body' => $this->body, 'lang' => 'en'];
    }

<<<<<<< HEAD
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
=======
    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
>>>>>>> 203efdfdb230bac433b5f827dd07c5930c31825d
}
