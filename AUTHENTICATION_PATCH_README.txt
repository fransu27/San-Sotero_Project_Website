SAN SOTERO AUTHENTICATION FOLLOW-UP PATCH — 2026-10-24

Apply this patch from your Laravel project root, preserving the directory structure.
Back up your project and database first. Do not overwrite your real .env file with .env.example.

Main changes:
- User now implements MustVerifyEmail so the existing Fortify verification feature is active.
- OTP fields in 2FA setup confirmation and login challenge are explicitly controlled and submitted as `code`.
- 2FA text explains use of Google Authenticator / compatible TOTP apps and recovery-code safety.
- Successful registration tests include the required Terms/Privacy acceptance field.
- AUTHENTICATION_SETUP_LOCAL.md explains local verification-link testing and optional Gmail SMTP delivery.

After applying:
1. Install project dependencies if needed (`composer install`, `npm install`).
2. Back up the database, then run `php artisan migrate` if migrations are pending.
3. Run `php artisan config:clear` after changing mail settings.
4. Run the authentication test filters and `npm run build` as listed in AUTHENTICATION_SETUP_LOCAL.md.
5. Test registration, email verification, 2FA setup confirmation, logout/login, and recovery codes in a browser.

Important:
- `.env.example` defaults to MAIL_MAILER=log. This writes verification emails to storage/logs/laravel.log and does not deliver them to Gmail.
- For actual inbox delivery, configure SMTP in your private `.env` using the guide. Do not commit SMTP credentials.
- This patch uses Google Authenticator-compatible TOTP for 2FA. It does not add a Google OAuth “Sign in with Google” feature.
- Full Laravel tests, production build, live email delivery, and real authenticator login were not run in the supplied environment because vendor/ and node_modules/ are absent.
