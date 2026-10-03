SAN SOTERO PATCH - SAFE VERSION (source files only)

WHAT THIS IS
Only the files that were changed or added. It does NOT contain: .env, database.sqlite, storage/, public/build,
node_modules or vendor. Your data, settings and installed packages are untouched.

HOW TO APPLY (project root = the folder that has artisan + composer.json)
 1. Commit or back up your current code first (git commit), so you can undo with git.
 2. Unzip this file INTO the project root and choose "Replace" if asked.
 3. php artisan migrate        (adds the new tables/columns; it does NOT delete data)
 4. npm run dev                (or npm run build)
 NEVER run: php artisan migrate:fresh  (that erases the database)

MODIFIED FILES (22): these overwrite your copies
  app/Http/Controllers/AnnouncementController.php
  app/Http/Controllers/ComplaintController.php
  app/Http/Controllers/DashboardController.php
  app/Http/Controllers/Settings/ProfileController.php
  app/Http/Middleware/HandleInertiaRequests.php
  app/Http/Requests/Settings/ProfileUpdateRequest.php
  app/Models/Announcement.php
  app/Models/Complaint.php
  app/Models/User.php
  app/Providers/AppServiceProvider.php
  resources/css/app.css
  resources/js/components/feed/announcement-card.tsx
  resources/js/components/feed/post-card.tsx
  resources/js/components/user-menu-content.tsx
  resources/js/layouts/auth/auth-simple-layout.tsx
  resources/js/layouts/feed-layout.tsx
  resources/js/layouts/settings/layout.tsx
  resources/js/pages/dashboard.tsx
  resources/js/pages/settings/profile.tsx
  resources/js/pages/welcome.tsx
  routes/settings.php
  routes/web.php

NEW FILES (23): nothing to overwrite
  app/Http/Controllers/MediaController.php
  app/Http/Controllers/PreferenceController.php
  app/Http/Controllers/Settings/BarangayController.php
  app/Http/Controllers/WelcomeController.php
  app/Http/Requests/AnnouncementRequest.php
  app/Http/Requests/ComplaintRequest.php
  app/Models/ComplaintEvent.php
  app/Models/Reaction.php
  app/Models/SiteSetting.php
  app/Policies/ComplaintPolicy.php
  database/migrations/2026_10_04_000000_add_reactions_and_edited_at.php
  database/migrations/2026_10_05_000000_add_moderation_privacy_i18n_branding.php
  public/images/barangay-default.jpg
  resources/js/components/barangay-banner.tsx
  resources/js/components/feed/edit-fields.tsx
  resources/js/components/language-switcher.tsx
  resources/js/components/theme-toggle.tsx
  resources/js/hooks/use-locale.ts
  resources/js/lang/common.ts
  resources/js/lang/shell.ts
  resources/js/lang/welcome.ts
  resources/js/lib/i18n.ts
  resources/js/pages/settings/barangay.tsx
