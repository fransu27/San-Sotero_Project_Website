<?php

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Profile picture upload. SECURITY: real image types only (no SVG, which can carry scripts), max 2 MB,
 * and big enough to look decent. The file is stored under a random name, never the uploaded one.
 */
class AvatarUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:min_width=100,min_height=100,max_width=6000,max_height=6000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'avatar.max' => 'The picture must be 2 MB or smaller.',
            'avatar.mimes' => 'Use a JPG, PNG or WebP picture.',
            'avatar.dimensions' => 'The picture must be at least 100 × 100 pixels.',
        ];
    }
}
