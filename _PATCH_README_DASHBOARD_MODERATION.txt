San Sotero dashboard and moderation UX follow-up — 2026-10-24

Changes:
- Time range control is placed below the website/resident snapshot and now clearly describes which report analytics it controls.
- Report preview follows Day / Week / Month / Year selection plus clicked activity bucket/status.
- Admin-only dedicated dashboard workspaces: /dashboard?section=website and /dashboard?section=residents.
- Dedicated moderation workspaces: /admin/moderation?view=queue, ?view=reviewed, ?view=users, ?view=posts.
- Prior missing Eye/Ban imports are retained in this full-project package.

Verification performed here: PHP syntax checks and TypeScript TSX transpile/syntax checks passed. Full dependency-backed build, Laravel tests, and browser QA were not run because node_modules and vendor are not included in the supplied project archive. Please test all dashboard period and moderation actions in your local environment before treating this as release-verified.
