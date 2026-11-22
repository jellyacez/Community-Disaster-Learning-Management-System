# Backup and restore runbook

System Health (system_admin and super_admin, with the `manage_security` permission) can download an encrypted backup and restore one. Both need `BACKUP_ZIP_PASSWORD` and `BACKUP_ENCRYPTION_KEY` set on the server ([configuration.md](configuration.md#backups-and-restore)).

## What a backup is

`pg_dump -F c` of the whole database. It is encrypted with AES-256-GCM using `BACKUP_ENCRYPTION_KEY`, then put in a ZIP locked with `BACKUP_ZIP_PASSWORD`. The dump is capped at **64 MiB**: a larger database can't be backed up or restored through the app (use the manual fallback below). Uploaded media (videos, images) is not in the database and needs its own backup.

To open a backup you need both the backup password and the server's encryption key. Store them separately from the ZIP files.

## Download a backup

System Health → Infrastructure Operations → **Download Encrypted ZIP**, then confirm with your own account password. The download is recorded in the activity log ("Generated encrypted database backup").

## Restore

Restoring replaces **all** data with the backup's, including passwords, bans and sessions.

### Before you start

1. Download a fresh backup (the restore dialog has a button for it).
2. Turn on **maintenance mode** in System Settings. The server refuses a restore without it (409).
3. Set `ENABLE_DATABASE_RESTORE=true` in `server/.env` and restart the API. Without it the server answers 503.
4. Make sure only one API process is running.

> **Backups older than the last deploy** restore too: the server runs `migration.sql` afterwards, so tables added since the backup are created empty (or with their defaults). For today's tables that means emergency contacts go back to the defaults and must be re-entered, and known devices are re-learned (users get one "new login" email per device).

The database user in `server/.env` must own the `public` and `rate_limit` schemas (or own the database), because the restore drops and recreates them. Check with `SELECT nspname, nspowner::regrole FROM pg_namespace WHERE nspname IN ('public', 'rate_limit');`. If it doesn't, the restore fails at that step and nothing changes.

### Run it

System Health → **Restore from ZIP**. The dialog shows the maintenance and restore-enabled status and needs:

1. the backup ZIP (up to 65 MB);
2. the backup password;
3. your account password;
4. typing `RESTORE DATABASE`.

Account-password failures and wrong backup passwords count toward a limit of 5 failed attempts per 15 minutes per account.

### What the server does

1. Checks the archive and the dump (`pg_restore --list`).
2. Writes a **safety dump** of the current database to `server/backups/pre-restore-safety.dump` (or `RESTORE_SAFETY_DUMP_PATH`), overwriting the previous one. It is encrypted exactly like a downloaded backup, so it can be restored through the same dialog. If the safety dump fails (or the database is over 64 MiB), the restore is aborted and nothing changes.
3. In one transaction, drops the `public` and `rate_limit` schemas and recreates an empty `public`, as `db:setup` does. A failure here changes nothing. `rate_limit` comes back from the dump, together with the rate limiter's migration history in `public.migrations`.
4. Runs `pg_restore --no-owner --no-privileges --single-transaction --exit-on-error`, without `--clean` (it can't drop tables the backup doesn't have).
5. In one transaction, runs `server/migrations/migration.sql` to bring an older backup up to the current schema (it changes nothing on a current one) and sets `maintenance_mode` back to `true` (the backup carries its own value).
6. In one transaction, sets `maintenance_mode` to `true` again and **deletes every session**, so everyone, you included, signs in again.
7. Records "Completed database restore (backup N bytes, safety dump: path)" in the activity log.

Steps 3 to 5 can't share one transaction, because `pg_restore` uses its own connection. Between them, other connections see an empty or not-yet-upgraded database, so requests fail until the restore finishes; maintenance mode keeps residents out. If step 4 or 5 fails, the server restores the safety dump the same way (steps 3 and 4) and the dialog says *"Restore failed; the database was put back from the safety dump."* If putting it back also fails, the server tries to turn maintenance on and the dialog says the database may be empty. Nobody can sign in to an empty database, so restore the safety dump by hand: decrypt it on the server, from `server/` (uses `BACKUP_ENCRYPTION_KEY` and `BACKUP_ZIP_PASSWORD` from `.env`),

```bash
node -e "require('dotenv').config({ quiet: true }); const fs = require('fs'); require('./services/secureBackup').unpack(fs.readFileSync(process.argv[1]), process.env.BACKUP_ZIP_PASSWORD).then((d) => fs.writeFileSync(process.argv[2], d, { mode: 0o600 }))" backups/pre-restore-safety.dump /tmp/safety.dump
```

then restore `/tmp/safety.dump` with the manual fallback below and delete it.

If step 6 fails after the data was replaced, the server retries turning maintenance on, logs a cleanup-failure entry, and the dialog says: *"Restore applied, but cleanup failed: sessions may still be active, sign out all users from Security."* Do that first (Security → **Force Logout All Users**, which ends every session except yours), and don't run the restore again.

### Afterwards

1. Sign in again, then check the restored data.
2. Set `ENABLE_DATABASE_RESTORE=false` and restart the API.
3. Turn off maintenance mode.

Right after a restore, "Last backup downloaded" usually shows "None recorded": the download's log entry is written after its dump is taken, so it isn't inside the backup.

## Manual fallback: pg_dump and pg_restore

For a database over 64 MiB, or when the app isn't running. Production deploys already keep the 10 newest pre-deploy dumps in `~/db-backups/` on the host ([deployment.md](deployment.md)).

```bash
# backup (custom format)
pg_dump -Fc -f backup.dump "postgresql://USER:PASSWORD@HOST:5432/DBNAME"

# restore into an EXISTING database: empty it (one transaction), restore, upgrade the schema
DB="postgresql://USER:PASSWORD@HOST:5432/DBNAME"
psql -v ON_ERROR_STOP=1 "$DB" -c 'DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS rate_limit CASCADE; CREATE SCHEMA public; GRANT USAGE ON SCHEMA public TO PUBLIC;'
pg_restore --no-owner --no-privileges --single-transaction --exit-on-error -d "$DB" backup.dump
psql -v ON_ERROR_STOP=1 "$DB" -f server/migrations/migration.sql
```

Don't use `pg_restore --clean`: it can't drop tables newer than the dump, and those tables' foreign keys to `"user"` make it fail. If `pg_restore` or `migration.sql` fails, the database is left empty or part-upgraded: take a `pg_dump` of the live database before you start, so you can put it back with the same three commands. A manual restore skips the app's safeguards. Turn maintenance on first. Afterwards, sign everyone out (Security → **Force Logout All Users**) and check `maintenance_mode`, because the dump carries its own sessions and settings. These files are not encrypted: store them as securely as the database itself.
