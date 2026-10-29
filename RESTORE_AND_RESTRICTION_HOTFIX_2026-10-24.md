# Restore and temporary restriction hotfix


## Hotfix — restore failure, rejection state, and flexible restriction duration (2026-10-24)

- [x] Restore/removal controller no longer writes `status_before_removal` when the local SQLite schema does not contain that column; this prevents the reported SQLSTATE 1 crash on older local databases.
- [x] The restore-status migration is idempotent when the column already exists.
- [x] A rejected/removal decision now completes the approval workflow instead of leaving the record marked as pending; restoring a report that was Pending returns it to the approval queue.
- [x] Temporary account restrictions accept seconds, minutes, hours, or days, and calculate expiry using the selected unit. The backend still accepts the older `days` field for compatibility.
- [x] Legacy Rejected records no longer show the normal workflow-status editor that would trigger “Approve this report before changing its status.”
- [ ] On the local Windows project, run `php artisan migrate` to enable restoration of the exact pre-removal status for future removals.
- [ ] Test restore on an old removed record, reject a pending submission, approve a pending submission, change a status on an approved submission, and create restrictions in each time unit.
- [ ] Full Laravel tests, frontend production build, and browser QA are still pending until project dependencies are installed.

**Database note:** The guard keeps restore usable before the migration is run. Without the migration, an older removed record has no saved pre-removal status, so restore safely falls back to `Pending`; running `php artisan migrate` preserves the exact status for future removals.
