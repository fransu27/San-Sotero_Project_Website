# San Sotero authentication setup (local development)

## Email verification works on localhost

The User model now implements Laravel's `MustVerifyEmail` contract, and Fortify's email-verification feature is enabled. Newly registered users must follow the signed verification link before accessing routes protected by the `verified` middleware. The user can resend the message from the verification screen. Changing an email address clears `email_verified_at`, requiring the new address to be verified.

### Option A — inspect verification links locally

The repository's default `.env.example` uses `MAIL_MAILER=log`. This does **not** deliver mail to Gmail; Laravel writes the message (including its verification URL) to `storage/logs/laravel.log`. This is useful for local development only. Register a test account, then open the latest log entry and use the verification URL in your browser.

### Option B — deliver verification email to Gmail while running locally

1. Enable 2-Step Verification on the Google account you will use to send mail.
2. Create a Google App Password if your account is eligible. Do not put your normal Gmail password in the project.
3. Edit your local `.env` (never commit it) and set the values below. Use your actual Gmail address and the generated App Password; do not share either secret.

```dotenv
APP_URL=http://localhost:8000
MAIL_MAILER=smtp
MAIL_SCHEME=smtps
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USERNAME=your-sender@gmail.com
MAIL_PASSWORD=your-16-character-app-password
MAIL_FROM_ADDRESS=your-sender@gmail.com
MAIL_FROM_NAME="San Sotero Report Concerns"
```

4. Run `php artisan config:clear`. Restart `php artisan serve` if needed.
5. Register using an inbox you can access, then click the verification link that arrives. Check `storage/logs/laravel.log` if mail delivery fails.

A locally generated link uses `APP_URL`. Keep it as `http://localhost:8000` for the same computer. A different device cannot reach your PC's `localhost`; use a trusted development tunnel or deployed HTTPS URL for tests on another device.

## Two-factor authentication with Google Authenticator

San Sotero uses time-based one-time passwords (TOTP) through Laravel Fortify. Google Authenticator is one compatible app; Microsoft Authenticator, Aegis, and other TOTP apps can also work. This is **not** the same thing as a “Sign in with Google” OAuth button.

1. Sign in with a verified account.
2. Open **Settings → Security**. If prompted, confirm your account password first.
3. Select **Enable 2FA**. Scan the QR code with an authenticator app, or manually enter the displayed setup key.
4. Wait for the app to show a fresh six-digit code, then enter it in San Sotero and press **Confirm**. Merely scanning the QR code does not finish setup.
5. Save the recovery codes in a safe place. Do not share the QR code, setup key, or recovery codes.
6. Sign out and sign in again. Enter the current six-digit code on the 2FA challenge page. Use a recovery code only if you cannot access the authenticator.

If a code fails, check that the phone's date/time is set automatically, use the current code (it changes about every 30 seconds), ensure setup confirmation succeeded, and confirm that the local browser session did not expire. Do not disable 2FA on a production account just to work around a broken test.

## What this change does not add

This change enables email ownership verification and fixes the frontend OTP fields to submit the selected six-digit value reliably in both 2FA setup confirmation and the login challenge. It does not add a Google OAuth “Sign in with Google” button. That is a separate identity-provider integration and must be implemented with state validation, verified Google identity checks, safe account linking, and explicit protection against bypassing the application's 2FA.

## Verification checklist

- [ ] Run `php artisan migrate` against a backed-up or disposable test database if there are pending migrations.
- [ ] Run `php artisan test --filter=EmailVerificationTest`.
- [ ] Run `php artisan test --filter=VerificationNotificationTest`.
- [ ] Run `php artisan test --filter=TwoFactorChallengeTest`.
- [ ] Run `php artisan test --filter=RegistrationTest`.
- [ ] Run `npm run build`.
- [ ] Register a new test account and confirm it cannot enter verified-only routes until the email link is clicked.
- [ ] Confirm 2FA setup with a real authenticator app, log out, log back in, and test one recovery code.

Do not report these checks as passed until they have been run in the local project with dependencies installed.
