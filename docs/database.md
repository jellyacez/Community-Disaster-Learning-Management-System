# Database

PostgreSQL. Production runs PostgreSQL 16. The files that define the schema live in `server/migrations/`:

| File | What it is | Who runs it |
|---|---|---|
| `schema.sql` | The production schema, generated from a production schema-only dump. Do not edit by hand. | `npm run db:setup` |
| `migration.sql` | The single, idempotent deploy script: every schema change since `schema.sql` was generated (and older ones; re-running is harmless). | Every production deploy (`deploy.yml`), and `npm run db:setup` |
| `seed.sql` | Reference data: the 21 barangays and `system_settings` defaults. `ON CONFLICT DO NOTHING`. | `npm run db:setup` |
| `01_…sql` to `16_…sql` | History. Already contained in `schema.sql`; kept for upgrading an old local database by hand. Not run by anything. | Nobody, automatically |

## Creating a database: `npm run db:setup`

```bash
cd server
npm run db:setup
```

**`db:setup` DROPS and recreates the `public` and `rate_limit` schemas: every table and all data in `DB_DATABASE` is deleted.** It is for creating a local database from nothing. Never point it at a database whose data you need, and never run it on production. To pick up schema changes on an existing database, run `migration.sql` instead (below).

What it does (`server/config/setup.js`):

1. Creates `DB_DATABASE` (default `LMS_db`) if it doesn't exist, connecting through the `postgres` database.
2. Drops and recreates the `public` and `rate_limit` schemas.
3. Runs `schema.sql`, then `migration.sql`, then `seed.sql`.
4. Leaves `rate_limit` empty: `@acpr/rate-limit-postgresql` creates its own tables on the first server start, and crashes if they already exist without its migration history.

It does not create any user. Create the first admin with `npm run create-first-admin` ([setup.md](setup.md#create-the-first-admin)).

## Applying schema changes to an existing database

```bash
psql -v ON_ERROR_STOP=1 "postgresql://USER:PASSWORD@HOST:5432/DBNAME" -f server/migrations/migration.sql
```

This is what a production deploy runs. It only adds what is missing and leaves data alone, so it is safe to run on any copy of the database, any number of times.

## The migration rule

Deploys run only `migration.sql`, on every push to `main` (see [deployment.md](deployment.md)). So every schema change follows this rule:

1. **Append it to `migration.sql` as an idempotent block.** It must succeed on a database that already has the change, because the file runs again on every deploy. Use `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DO $$ … IF NOT EXISTS (SELECT 1 FROM pg_constraint …) … $$` for constraints, and `UPDATE … WHERE <not yet done>` for backfills.
2. **Test it twice** on a copy of the production schema: load `prod-schema.sql` into a scratch database, run `migration.sql` two times, then start the server against it and run the regression tests.
3. **Don't add new numbered files.** They are not run by deploys, which is how production missed migrations 15 and 16 until they were folded into `migration.sql`.
4. **Avoid long locks.** A deploy runs the file against the live database. A plain `CREATE INDEX` blocks writes to that table while it builds, which is fine for small tables. For a large table, build the index `CONCURRENTLY` by hand first, then add the `IF NOT EXISTS` statement to `migration.sql`.

Changes that can't be made idempotent (renames, destructive type changes) need a different process; see [ADR 0006](adr/0006-migration-sql-is-the-only-deploy-migration.md).

## Regenerating `schema.sql`

Do this after a deploy, so `schema.sql` matches production again:

```bash
pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL" > prod-schema.sql
node server/scripts/clean-schema-dump.js prod-schema.sql > server/migrations/schema.sql
```

- Use a `pg_dump` with the same major version as production (16), so the file loads there. UNVERIFIED: the `pg_dump` of production wasn't run when this was written; the cleaning step was, on an existing production dump.
- `clean-schema-dump.js` removes machine-specific lines (`\restrict`, `SET`, `search_path`, version and timestamp comments) and every `rate_limit` object. Its output is deterministic.
- Keep the dump out of git (`scratch/` is ignored).

## Reference data

`seed.sql` inserts:

- the 21 barangays of Bacolor, in production's order (ids 1 to 21 on an empty table);
- `system_settings` rows: `maintenance_mode=false`, `system_name`, `broadcast_active=false`, `broadcast_message=''`, `broadcast_severity=info`, `support_email=''` (the app then uses `EMAIL_USER`), `org_footer_text`, `emergency_contacts_version=1`;
- the default emergency hotlines (below), only while `emergency_contacts` is empty. `migration.sql` inserts the same rows first, so on a fresh database this step does nothing.

Roles are the `user_role` enum in `schema.sql`. Permissions are code (`server/config/permissions.js`), not rows.

## Emergency contacts

`emergency_contacts` holds the hotlines shown on the landing page, the footers and the resident dashboard. Admins edit it through `PUT /api/admin/emergency-contacts` (spec: `docs/specs/emergency-contacts.md`).

| Column | Meaning |
|---|---|
| `agency` | Group name, e.g. `MDRRMO Bacolor`. 1-80 characters after trimming (CHECK). |
| `label` | The line within the agency, e.g. `Globe`. 1-80 characters after trimming (CHECK). |
| `phone` | Shown as stored. Digits, spaces and dashes, optional leading `+`; starts and ends with a digit (CHECK). The API derives the dialled `tel` by removing spaces and dashes. |
| `is_sample` | A placeholder number. Shown to everyone tagged "Sample, not yet configured" and never dialable (the API returns `tel: null`). |
| `sort_order` | Display order, 1..n, rewritten on every save. |
| `active` | Inactive rows are kept for admins but not returned by the public endpoint. |
| `updated_by`, `updated_at` | Last editor (`ON DELETE SET NULL`) and time. `updated_by` has no index: the table holds at most 15 rows. |

The API, not the database, enforces the list rules: 1-15 rows, at least one active, 3-15 digits in `tel`. `system_settings.emergency_contacts_version` is an integer counter used for optimistic locking: a save with an older version gets 409, and every save that changes something increments it.

Defaults (`migration.sql` and `seed.sql`, inserted only while the table is empty): `911` (National Emergency, the only non-sample row), then sample rows MDRRMO Bacolor Globe, Smart and Landline (`045 900-0199`), BFP Bacolor and PNP Bacolor.
