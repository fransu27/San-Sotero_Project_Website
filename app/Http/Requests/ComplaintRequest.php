<?php

namespace App\Http\Requests;

use App\Models\Complaint;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validation for creating AND editing a complaint (both forms have the same fields).
 *
 * SECURITY
 *  - authorize() is true on purpose: WHO may act on WHICH complaint is decided by ComplaintPolicy in the
 *    controller (object-level), not here.
 *  - prepareForValidation() strips HTML tags from every text field BEFORE validation (defence-in-depth against
 *    stored XSS; React also escapes on output) and turns checkbox-ish values into real booleans.
 *  - Every choice (category, visibility) is checked against a fixed list; nothing the client sends is trusted.
 *  - Photo: real jpg/png/webp only, max 4 MB. SVG is excluded on purpose (it can carry scripts).
 *  - `status`, `approval_status`, `user_id` are NOT accepted here at all.
 */
class ComplaintRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // object-level checks: ComplaintPolicy
    }

    protected function prepareForValidation(): void
    {
        $clean = fn (string $key) => trim(strip_tags((string) $this->input($key)));

        $this->merge([
            'title' => $clean('title'),
            'description' => $clean('description'),
            'location' => $clean('location'),
            'custom_category' => $clean('custom_category'),
            'is_anonymous' => $this->boolean('is_anonymous'),
            'remove_image' => $this->boolean('remove_image'),
        ]);
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'description' => ['required', 'string', 'max:3000'],
            'location' => ['required', 'string', 'max:150'],
            'category' => ['required', Rule::in(Complaint::CATEGORIES)],
            // "Others" -> the resident must say what it is (e.g. Vehicles, Accident, ...)
            'custom_category' => ['required_if:category,Others', 'nullable', 'string', 'min:2', 'max:60'],
            'incident_date' => ['required', 'date', 'before_or_equal:today'],
            'visibility' => ['required', Rule::in(Complaint::VISIBILITIES)],
            'is_anonymous' => ['boolean'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'remove_image' => ['boolean'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['custom_category.required_if' => 'Please tell us what kind of concern this is.'];
    }

    /**
     * The columns that may be written from the form. custom_category is only kept when the category is
     * "Others", so switching back to "Sanitation" can't leave stale text behind.
     *
     * @return array<string, mixed>
     */
    public function fields(): array
    {
        $data = $this->safe()->only([
            'title', 'description', 'location', 'category', 'custom_category',
            'incident_date', 'visibility', 'is_anonymous',
        ]);
        $data['custom_category'] = $data['category'] === 'Others' ? $data['custom_category'] : null;

        return $data;
    }
}
