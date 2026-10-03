<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation for creating / editing an announcement (admin-only routes, wrapped in EnsureAdmin).
 *
 * LOCALIZATION: the main title/body is what everyone sees by default. The admin may add a Tagalog (tl_*) and/or
 * Bisaya (ceb_*) and/or Waray (war_*) version; residents whose language is set to Tagalog/Bisaya get that version when it exists.
 * There is no hard-coded English announcement text anywhere in the app.
 *
 * SECURITY: tags stripped before validation, length limits, image rules identical to complaints (no SVG).
 */
class AnnouncementRequest extends FormRequest
{
    private const TEXT = ['title', 'body', 'tl_title', 'tl_body', 'ceb_title', 'ceb_body', 'war_title', 'war_body'];

    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true; // second lock; the route also has EnsureAdmin
    }

    protected function prepareForValidation(): void
    {
        $clean = [];
        foreach (self::TEXT as $key) {
            $clean[$key] = trim(strip_tags((string) $this->input($key)));
        }
        $this->merge($clean + [
            'pinned' => $this->boolean('pinned'),
            'remove_image' => $this->boolean('remove_image'),
        ]);
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:2000'],
            // a translation needs BOTH its title and its body, or neither
            'tl_title' => ['nullable', 'string', 'max:120', 'required_with:tl_body'],
            'tl_body' => ['nullable', 'string', 'max:2000', 'required_with:tl_title'],
            'ceb_title' => ['nullable', 'string', 'max:120', 'required_with:ceb_body'],
            'ceb_body' => ['nullable', 'string', 'max:2000', 'required_with:ceb_title'],
            'war_title' => ['nullable', 'string', 'max:120', 'required_with:war_body'],
            'war_body' => ['nullable', 'string', 'max:2000', 'required_with:war_title'],
            'pinned' => ['boolean'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'remove_image' => ['boolean'],
        ];
    }

    /** The JSON stored in announcements.translations (null when the admin wrote no translation). */
    public function translations(): ?array
    {
        $out = [];
        foreach (['tl', 'ceb', 'war'] as $lang) {
            $title = $this->input("{$lang}_title");
            $body = $this->input("{$lang}_body");
            if ($title !== '' && $body !== '') {
                $out[$lang] = ['title' => $title, 'body' => $body];
            }
        }

        return $out ?: null;
    }
}
