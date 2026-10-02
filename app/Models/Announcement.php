<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Announcement extends Model
{
    /** Languages an announcement can be written in (order = fallback order). */
    public const LOCALES = ['en', 'tl', 'ceb'];

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

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
