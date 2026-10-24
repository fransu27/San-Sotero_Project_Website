# San Sotero moderation feature patch

This patch is tailored to the uploaded Laravel 13 / Inertia React application, where user-generated posts are `App\Models\Complaint` records (not `Post` records).

## Files
- New migration adds user moderation fields, `complaint_reports`, `activity_logs`, and database notifications.
- New models: `ComplaintReport`, `ActivityLog`.
- New controller: `CommunityModerationController` handles reports, threshold auto-hold, profile restriction, account ban, takedown, and admin queue data.
- New notifications: profile restriction email + database notification and admin queue database notification.
- New middleware tracks authenticated users' last activity and rejects banned users.
- `resources/js/components/feed/moderation-actions.tsx` is the report/share UI component. Mount it in the existing approved public complaint card action row; do not show it for private, pending, removed, or own posts.

## Integration steps
1. Copy the files in this patch into the matching project paths.
2. Merge the included `User.php`, `Complaint.php`, `routes/web.php`, and `bootstrap/app.php` changes only after reviewing your current versions; this patch archive does not replace those files wholesale.
3. Register `TrackUserActivity` and `RejectBannedUsers` in the web middleware group in `bootstrap/app.php` (after session middleware is available).
4. Add routes from the route snippet in `routes-additions.php` inside your existing `auth, verified` group; place admin routes inside the existing `EnsureAdmin` group.
5. Add relationships/casts shown in `model-additions.txt` to existing `User` and `Complaint` models.
6. Add `MODERATION_AUTO_HOLD_THRESHOLD=6` and `MODERATION_ONLINE_WINDOW_MINUTES=5` to `.env`.
7. Run `php artisan migrate`, `php artisan optimize:clear`, `npm run types:check`, `npm run build`, and `php artisan test`.
8. Configure working SMTP credentials in `.env` to deliver profile restriction email. Database notifications are stored for the in-app notification UI.

## Important operational notes
- The visitor metric in this patch counts tracked page-view audit events. Add an explicit, privacy-reviewed visitor counter middleware if you need anonymous unique visitors; don't label raw request totals as unique people.
- Online status is approximate, based on authenticated users' `last_seen_at` in the configured five-minute window.
- Account bans are enforced by middleware. If you have API routes or another authentication guard, apply equivalent enforcement there too.
- Reports are unique per user/post. The threshold counts distinct open reports; `6` means auto-hold at six reports (the requirement says “>5”).
- The `default_avatar` config is a placeholder setting; avatar rendering currently returns `null` when `avatar_path` is null, which should use your existing anonymous/initials fallback.
- A profile restriction resets avatar path and `anonymous_default`, and clears only optional bio/preferences columns that exist. Add any project-specific profile fields to the clear list after checking the schema.
