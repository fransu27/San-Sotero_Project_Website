San Sotero follow-up patch — 2026-10-24

Apply this patch by extracting it into the existing project parent folder and preserving the `San-Sotero_Project_Website-main/` paths. Allow overwriting files when prompted.

Then:
1. Back up your configured database (for SQLite, database/database.sqlite).
2. Set SUPPORT_EMAIL in .env to a real, monitored support mailbox.
3. Run: php artisan migrate
4. Install project dependencies if needed, then run: npm run build
5. Test registration, legal pages, admin/resident access boundaries, staff role assignment, profile post actions, walk-in file previews and Print receipt -> Save as PDF.

Important: delegated admins cannot change roles; only the primary admin can assign/remove administrator roles. The primary admin is protected from role changes. Do not run the new migration against production without a database backup. Full build, Laravel tests and browser QA were not run in the provided environment because `node_modules/` and `vendor/` are absent.
