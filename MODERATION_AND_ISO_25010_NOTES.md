# Moderation and ISO/IEC 25010 implementation notes

This update adds moderation controls that map to the supplied San Sotero ISO/IEC 25010 evaluation instrument. It is an implementation aid, not a claim of formal ISO certification; the instrument still needs to be completed through testing and panel evaluation.

## Moderation features

- Residents can report public approved posts for misinformation, harassment/hate, inappropriate content, spam/scams, privacy concerns, or other reasons. Duplicate pending reports by the same resident for the same post are prevented.
- Admins can review reports, record a required note, dismiss them, mark them reviewed, or take action. Taking action removes the post from public view and records the admin's reason in the post timeline.
- Admins can activate accounts, temporarily restrict posting/interactions for 1–365 days, ban accounts from posting/interactions, and restrict/restore profile pictures. Every action requires a reason and is recorded in `user_moderation_events`.
- Restricted profile pictures resolve to `public/images/anonymous-avatar.svg`; the affected resident is shown the restriction reason.
- The Moderation page lists residents with active/offline presence based on the last five minutes, reported posts, and existing submission review tools.
- The admin dashboard has page-view, distinct visitor-session, visitor-today, recently active resident, and resident-account widgets. Visitor counts begin after this migration is deployed and are not retroactive.

## ISO/IEC 25010 alignment and verification

- **Functional suitability:** test report submission, admin report triage, post removal with reason, profile restriction, temporary restriction expiry, and ban/activation.
- **Performance efficiency:** dashboard metrics use aggregate queries; validate with production-like visit/report volumes and indexes before deployment.
- **Usability:** check the Moderation page on mobile and desktop, keyboard navigation, clear reason messages, and the restricted-profile notice.
- **Reliability:** run migrations, automated tests, and recovery tests on a staging database before production.
- **Security:** admin routes remain behind `EnsureAdmin`; report inputs are validated; user moderation actions reject admin targets; posting/interactions check restriction state server-side. Review privacy and retention of visitor analytics before production.
- **Maintainability:** schema changes are isolated in a new migration; account actions are append-only audit records; complaint takedowns use the existing complaint timeline.

## Deploy and test

1. Back up the database and files.
2. Run `php artisan migrate`.
3. Run `php artisan optimize:clear`.
4. Run `npm ci`, `npm run types:check`, `npm run build`, and `php artisan test`.
5. Test as both a resident and an admin in a staging environment. Confirm expired restrictions become inactive, admin-only routes reject residents, and the reason appears to the affected user.

The new visitor metrics are approximate session-based analytics, not a full analytics or consent-management system. Confirm the barangay's privacy notice and retention policy before production use.
