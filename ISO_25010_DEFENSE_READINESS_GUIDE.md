# San Sotero Report Concerns Portal — ISO/IEC 25010 Defense Readiness Guide

This guide follows the six quality sections in the project's panel instrument: Functional Suitability, Performance Efficiency, Usability, Reliability, Security, and Maintainability. It is a preparation and evidence checklist, not a claim of ISO certification or a pre-assigned panel score.

## 1. Before the defense: freeze and verify

- [ ] Make a backup of the database and uploaded files; test restoring to a separate test environment.
- [ ] Use a test database and test accounts (guest, resident, restricted resident, administrator, primary administrator). Do not demo using real resident complaint data.
- [ ] Set `APP_DEBUG=false` in production-like configuration; keep secrets out of Git and screenshots.
- [ ] Configure a monitored support email and a real mail transport for email verification; `MAIL_MAILER=log` is local-only.
- [ ] Run `composer install` and `npm install` from the project root if needed.
- [ ] Run `php artisan migrate` against a backed-up/disposable database.
- [ ] Run `php artisan test` and `npm run build`; save the terminal output and fix failures before claiming success.
- [ ] Test all flows below in a browser at desktop and mobile sizes; inspect the browser console and Laravel logs.
- [ ] Keep a short known-limitations list. Never mark a feature passed just because the source code exists.

## 2. Demo sequence (about 8–12 minutes)

1. **Guest:** open the landing page, announcements/community preview, and public complaint tracking. Show that private/unapproved reports and private attachments are not exposed.
2. **Resident registration:** show validation errors, Terms of Service / Privacy Policy links, required consent, and the verification email notice. Open a test verification link from the test inbox, then demonstrate that verified-only routes become available.
3. **Resident reporting:** submit a test complaint with a photo/document, show the ticket code, then track it. Demonstrate invalid input/file size rejection as well as a valid submission.
4. **Community interaction:** demonstrate approved/public feed visibility, comments/reactions/ratings if available, and privacy restrictions using a second account.
5. **Walk-in intake:** create a test walk-in complaint, preview the selected evidence, print/save the receipt as PDF, and verify the resulting PDF contains the ticket reference, private PIN/instructions, and signature area. Do not expose the private PIN to an unauthorized viewer.
6. **Administrator workflow:** approve/decline a report, change status, post/edit/pin an announcement, review a user/post report, and restore a removed complaint. Show the report timeline.
7. **Role boundaries:** while signed in as a resident, attempt an admin URL directly and confirm access is denied. While signed in as an administrator, attempt My Submissions and confirm the intended block. Show that a delegated admin cannot demote the primary admin or assign roles if that is the configured policy.
8. **Security settings:** enroll 2FA with Google Authenticator or another TOTP app, confirm the code, log out, log in again using the code, and demonstrate a recovery code only with a disposable test account.
9. **Dashboard:** demonstrate report totals and the time-range selector; explain exactly which widgets are filtered and which are current-state snapshots.
10. **Close:** show test results, backup/restore evidence, performance measurements, and known limitations.

## 3. Test matrix matching the questionnaire

### A. Functional Suitability

- [ ] Submit reports with all required fields and allowed evidence; verify ticket uniqueness and saved values.
- [ ] Track a valid ticket and a deliberately invalid ticket; verify the displayed status/timeline.
- [ ] Test each search/filter combination with known seed data; compare results to the database/test fixture.
- [ ] Test announcement image/attachment display, pinning, reactions and comments.
- [ ] Test public, private, unapproved, removed and author-only report visibility using separate guest/resident/admin sessions.
- [ ] Test direct URL/API requests for all role-restricted operations, not just whether buttons are hidden.
- [ ] Test approval, rejection, status updates, walk-in intake, announcement create/edit/pin/delete, and restoration.
- [ ] Compare dashboard/chat summaries with manually calculated database totals for each supported period.

Evidence to keep: test-case table, screenshots with fake data, route/controller test output, and example report timeline.

### B. Performance Efficiency

Choose realistic thresholds before measuring; do not invent results. Use a repeatable test dataset and record hardware, PHP/database versions, browser, network profile, number of users, and test date.

- [ ] Measure page load / Largest Contentful Paint for landing page, newsfeed, dashboard, and resident directory (record median and slowest sample over repeated runs).
- [ ] Measure report submission and image/document upload duration for small and near-limit files.
- [ ] Measure search latency at realistic record counts and inspect slow SQL queries.
- [ ] Run a controlled concurrent test with a stated number of test clients; record throughput, error rate, and response-time percentiles.
- [ ] Repeat key flows under browser/network throttling approximating slow mobile internet.
- [ ] Inspect pagination, image resizing/compression, query indexes, and server memory/CPU if measurements show bottlenecks.

Evidence to keep: raw measurement sheet or exported report, test setup, and any before/after comparisons. A file-size limit alone is not performance evidence.

### C. Usability

- [ ] Ask representative test users to register, file a complaint, track it, find an announcement, and use walk-in support without coaching. Record task completion, time, errors, and feedback.
- [ ] Test keyboard-only navigation: logical tab order, visible focus, dialogs, forms, and buttons.
- [ ] Test at least one screen reader with core flows and check labels/error associations.
- [ ] Check contrast and readability in light/dark themes and at 200% zoom.
- [ ] Test mobile viewport widths and form uploads.
- [ ] Verify translations and text consistency for every language the project claims to support. If a language is incomplete, state that limitation honestly.
- [ ] Confirm destructive actions have clear labels and appropriate confirmation/undo paths.

Evidence to keep: accessibility checklist, screenshots, test-user task notes, and a list of issues fixed.

### D. Reliability

- [ ] Confirm validation errors preserve safe user input where expected.
- [ ] Simulate a network interruption during submission; check for duplicate or partial complaints after retry.
- [ ] Test invalid/oversized/corrupt uploads and ensure a clear error with no partial record or orphan file.
- [ ] Test that images, attachments, email verification links, receipt PDFs, and key navigation links work.
- [ ] Back up the database and uploaded files, restore them into a separate test environment, and verify reports/comments/attachments still connect.
- [ ] Test restoring a removed complaint and verify the history and status are correct.

Evidence to keep: restore log, test records, screenshots/PDF receipt, and recovery procedure.

### E. Security

- [ ] Verify passwords are hashed and never logged or returned to the browser.
- [ ] Register with a test inbox, verify the signed email link, try an invalid/expired link, and confirm protected routes block unverified accounts.
- [ ] Enable 2FA, confirm a TOTP code, test login challenge, test invalid codes/rate limits, and store recovery codes securely. Test this using a disposable account.
- [ ] Verify admin/resident/primary-admin/delegated-admin permissions through direct HTTP requests.
- [ ] Try accessing private, unapproved, removed, and walk-in evidence URLs while logged out and as the wrong resident.
- [ ] Test allowed file extensions/MIME, size limits, malformed files, and upload path handling.
- [ ] Test throttling for login, ticket lookup, report/comment/reaction, and other abuse-sensitive endpoints.
- [ ] Review session cookie settings, CSRF, authorization policies, error pages, `.env`/secrets, logs, and dependency advisories.
- [ ] Document retention/deletion, data access requests, privacy contact handling, and the purpose/retention of personal data in line with applicable privacy obligations.
- [ ] Decide whether 2FA/passkeys are optional or mandatory for administrators and document that policy. Do not claim passkeys work unless enrollment and authentication have been tested.

Evidence to keep: security test cases, denied-request results, configuration checklist, and dependency/security scan output.

### F. Maintainability

- [ ] Run PHP style/lint, static analysis, frontend lint/format/type checks, production build, and automated tests; save results.
- [ ] Verify migrations apply to a fresh database and upgrade an existing backup safely.
- [ ] Document environment variables, setup commands, roles, route structure, backup/restore, mail setup, and common troubleshooting.
- [ ] Demonstrate that administrators can update announcements and report statuses without code changes.
- [ ] Verify report history and restore workflow.
- [ ] Record known defects and make sure no demo buttons are placeholders.

Evidence to keep: CI/terminal logs, migration logs, README/setup guide, and a short architecture diagram.

## 4. How to calculate the questionnaire scores

For each item, panelists should select one response from 5 (Strongly Agree), 4 (Agree), 3 (Neutral), 2 (Disagree), or 1 (Strongly Disagree based on their actual experience and the evidence available. Do not pre-fill panelists' answers. For each section:

- Section subtotal = sum of all item ratings in that section.
- Section mean (if your adviser approves reporting means) = subtotal / number of answered items.
- Overall mean (if used) = sum of all answered item ratings / total number of answered items. Explain how blank responses are treated.

Your instrument includes 10 items in A, 5 in B, 8 in C, 5 in D, 5 in E, and 4 in F (37 items total). Check the original document before finalizing calculations in case the panel revises the form. The “ability to answer / technical knowledge / correctness” table appears to be a separate group-member evaluation; do not combine it with the software-quality score unless your adviser explicitly instructs you to.

## 5. Suggested honest defense explanation

“San Sotero was evaluated using an ISO/IEC 25010-based questionnaire covering six selected quality characteristics. We implemented the portal workflows and access controls, then verified each claim through functional tests, usability checks, security tests, reliability/recovery tests, and measured performance. Where a test has not yet been completed, we report it as a limitation rather than assigning ourselves a passing score.”

Use that wording only after actually carrying out the listed checks. Replace “verified” with “planned” or “partially tested” for checks that remain outstanding.

## 6. Known current limitation at the time this guide was written

The source archive supplied to the assistant did not include `vendor/` or `node_modules/`, so the full Laravel test suite and production frontend build could not be run here. The source-level PHP lint and TSX syntax checks do not replace running the application. Complete the commands and browser checks on the local project before defense.
