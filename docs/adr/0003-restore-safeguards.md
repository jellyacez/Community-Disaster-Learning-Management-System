# ADR 0003: Server-side safeguards around database restore

## Status
Accepted

## Date
2026-11-15 (merged with the System Health restore redesign)

## Context
The System Health restore runs `pg_restore --clean` against the live database. It replaces everything, including passwords, bans and sessions. Several safeguards existed only as text in the dialog, or not at all:

- the maintenance window;
- account re-authentication;
- limits on guessing the backup password;
- a copy of the data being replaced;
- what happens to sessions and `maintenance_mode` afterwards.

## Decision
The server enforces, in this order (`server/routes/admin/adminSystemRoutes.js`, `server/controllers/admin/infrastructureController.js`):

1. Role `system_admin` or `super_admin` with `manage_security`.
2. `ENABLE_DATABASE_RESTORE=true`, checked before the upload is read (503 otherwise).
3. Maintenance mode on, read fresh from the database (409 otherwise).
4. 5 failed attempts per 15 minutes per account (429).
5. Account password re-check, with impersonation refused (`verifyRestorePassword`).
6. The backup password, and the typed confirmation `RESTORE DATABASE`.
7. An encrypted **safety dump** of the live database, written before restoring. The restore aborts if it fails.
8. `pg_restore --single-transaction --exit-on-error`.
9. In one transaction afterwards: `maintenance_mode` back on, and every session deleted. If that fails, maintenance is retried, the failure is logged, and the response says the restore was applied but cleanup failed.
10. A completion or failure entry in the activity log, written after the restore so the restore can't overwrite it.

## Alternatives considered
- **Restore only with `pg_restore` on the host.** Still documented as the fallback, and required for databases over 64 MiB. It needs shell and database access, and skips every check above.
- **Remove in-app restore.** Recovery would then depend on someone with database access being available.

## Consequences
- **One process:** the lock and the rate limiter live in memory, so the API must run as one process (single pm2 instance).
- **Size and secrets:** backups and the safety dump are capped at 64 MiB and need `BACKUP_ZIP_PASSWORD` and `BACKUP_ENCRYPTION_KEY`.
- **Other admins:** they can still make admin changes during maintenance (TECH_DEBT item 8). `--single-transaction` keeps the restore all-or-nothing, but doesn't stop them.
- **Covered by tests:** steps 2–10 are in `server/tests/restore-safeguards.regression.cjs` (the role gate is the shared `requireRole`/`requirePermission` middleware). Runbook: [backup-restore.md](../backup-restore.md).
