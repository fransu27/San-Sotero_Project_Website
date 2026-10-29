# ISO/IEC 25010 Follow-up: B, D, E and F

Date: 2026-10-24  
Scope: San Sotero Report Concerns Portal. This file records implementation changes and the evidence still required before assigning panel scores. It does not claim a quality score or a completed load/security audit.

## B. Performance Efficiency

### Implemented
- Added composite database indexes for common complaint feed visibility/approval/removal/date filters, resident submission lists, status/date views, comment timelines, and actor-scoped activity history.
- Kept feed and moderation responses bounded: the current controllers limit feed/dashboard/moderation result sets instead of returning unbounded complaint lists.
- Preserved pagination for resident submissions.

### Verification still required
- Run migrations against a copy of the target database and inspect query plans on the actual database engine.
- Run production build and measure representative page/API response times with realistic data volumes.
- Test upload/search on throttled mobile network profiles and concurrent users. Database indexes alone do not prove acceptable response times or low memory use.

Suggested commands after installing project dependencies:

```bash
php artisan migrate --force
php artisan test
npm run types:check
npm run lint:check
npm run format:check
npm run build
```

Record the dataset size, database engine, environment, concurrent-user count, p50/p95 response times, error rate, and upload success rate in the final evaluation evidence.

## D. Reliability

### Implemented
- Complaint creation removes a newly stored photo if the database transaction fails.
- Complaint photo replacement keeps the old file until the database commit succeeds; failed storage returns a validation error rather than silently losing the old photo.
- Walk-in intake reports an image storage failure instead of silently proceeding as if the upload succeeded.
- Attachment deletions are deferred until the database transaction commits, so a rollback does not restore an attachment row whose file was already deleted.
- Attachment upload failures clean up newly stored files and surface a validation error.
- Added regression coverage for restoration of removed complaints, including the progress timeline and activity audit trail.
- Preserved the complaint status from before moderation removal and restore that status when the post is reinstated, rather than leaving a restored post incorrectly marked Rejected.
- Complaint and announcement deletion now run the database delete in a transaction and remove the main photo only after the commit.

### Verification still required
- Run the feature suite with the configured database and storage driver.
- Simulate storage failure, interrupted network requests, database rollback, and recovery from backup on a staging copy.
- Check every displayed image/document URL and preview using real files; test backup restore before claiming disaster recovery.

## E. Security

### Implemented / existing controls confirmed in source
- User passwords use Laravel's `hashed` cast.
- Verified-account middleware protects the authenticated application route group; login, two-factor and passkey throttles are configured in the authentication provider/routes.
- Complaint images/documents are validated by allowed types and size limits, and attachment access is policy-checked.
- Public ticket lookup requires both a ticket code and a six-digit PIN; the PIN is checked against a hash and the response contains status/timeline metadata, not reporter contact details.
- Administrative complaint actions remain in an admin middleware group and use policy checks.
- Added throttles to complaint deletion, report restoration, announcement pinning and announcement deletion.
- Added regression tests for resident denial of admin-only status/restore actions, hashed passwords, and private tracking metadata.

### Verification still required
- Run all authorization tests against a migrated test database and manually try direct URL/API access as guest, resident, restricted resident and administrator.
- Review production session, HTTPS, cookie, CSRF, backup and logging configuration. Confirm email verification, two-factor authentication and passkeys by completing each user flow; feature presence in source is not proof that production is configured correctly.
- Conduct dependency/security scanning and a focused upload abuse review. This patch is not a penetration test or a legal compliance certification.

## F. Maintainability

### Implemented
- Added a dedicated regression test class for critical authorization, tracking privacy, password storage, restoration, and audit-history behavior.
- Added explicit named migration indexes with a corresponding rollback migration.
- Documented the implementation boundary and remaining test evidence here, rather than marking unmeasured performance/security claims as complete.

### Verification still required
- Run Pint, ESLint, Prettier, PHPStan, TypeScript, and the full test suite.
- Review migration rollback on a disposable database, then perform a backup before production migrations.
- Keep all future moderation and report-state changes inside controllers/services that record both resident-facing progress events and administrative audit logs.

## Status summary

- [x] Source changes and targeted regression tests added.
- [x] PHP syntax checked for the changed PHP files and migration.
- [ ] Full Laravel feature suite executed.
- [ ] Frontend type/lint/format/build checks executed.
- [ ] Production-like performance measurements collected.
- [ ] Recovery drill and real storage-failure test completed.
- [ ] Security review and manual role-based access testing completed.

Do not infer a passing ISO/IEC 25010 score from the implementation checklist alone. The panel instrument rates observed system behavior; collect repeatable test evidence and panel/user feedback before scoring B, D, E or F.
