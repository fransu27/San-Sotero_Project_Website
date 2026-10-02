<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    /** Same clean-up as registration: strip tags from the name, reduce the phone to digits and +. */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim(strip_tags((string) $this->input('name'))),
            'phone' => preg_replace('/[\s\-().]/', '', (string) $this->input('phone')),
            // the switch posts "1"/"0" (or nothing at all when it is not on the form, e.g. for admins)
            'anonymous_default' => $this->boolean('anonymous_default'),
        ]);
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            ...$this->profileRules($this->user()->id),
            // Philippine mobile: 09XXXXXXXXX or +639XXXXXXXXX (one number = one account)
            'phone' => ['required', 'string', 'regex:/^(09\d{9}|\+639\d{9})$/', Rule::unique('users', 'phone')->ignore($this->user()->id)],
            'birthdate' => ['required', 'date', 'before:today', 'after:1900-01-01'],
            'anonymous_default' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'Enter a valid mobile number, like 09171234567.',
            'birthdate.before' => 'Date of birth must be in the past.',
        ];
    }
}
