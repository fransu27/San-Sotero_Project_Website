<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered resident.
     *
     * SECURITY
     *  1. Name is stripped of HTML tags, and the phone is reduced to digits/+, BEFORE validation
     *     (defence-in-depth against stored XSS and so "0917 123 4567" and "09171234567" count as the same number).
     *  2. Validation is server-side and authoritative: unique email + phone, PH mobile format,
     *     a real past birthdate, and the password policy from AppServiceProvider.
     *  3. Only whitelisted fields reach create(), so a forged request can never set `role = admin`.
     *  4. The password is hashed by the User model's 'hashed' cast; it is never stored in plain text.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        // (1) Normalise first so 'required' also catches tag-only or symbol-only input.
        $input['name'] = trim(strip_tags((string) ($input['name'] ?? '')));
        $input['phone'] = preg_replace('/[\s\-().]/', '', (string) ($input['phone'] ?? ''));

        // (2) Throws ValidationException -> Inertia shows each message under its field.
        Validator::make($input, [
            ...$this->profileRules(),
            // Philippine mobile: 09XXXXXXXXX or +639XXXXXXXXX
            'phone' => ['required', 'string', 'regex:/^(09\d{9}|\+639\d{9})$/', 'unique:users,phone'],
            'birthdate' => ['required', 'date', 'before:today', 'after:1900-01-01'],
            'password' => $this->passwordRules(),
        ], [
            'phone.regex' => 'Enter a valid mobile number, like 09171234567.',
            'birthdate.before' => 'Date of birth must be in the past.',
        ])->validate();

        // (3) + (4)
        return User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'phone' => $input['phone'],
            'birthdate' => $input['birthdate'],
            'password' => $input['password'],
        ]);
    }
}
