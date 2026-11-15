# ADR 0006: migration.sql is the single, idempotent deploy migration

## Status
Accepted

## Date
2026-11-15 (branch `chore/schema-and-docs`)

## Context
Deploys run exactly one schema step: `psql -v ON_ERROR_STOP=1 -f migrations/migration.sql` on every push to `main` (`deploy.yml`). The numbered files `01`–`16` were run only by `db:setup` on fresh local databases. Production got 01–14 by hand at some point and never got 15 and 16. Missing migration 16 left out the unique index the enrollment-request code relies on: simultaneous requests created duplicates (reproduced on the production schema). Meanwhile `schema.sql` had drifted from production.

## Decision
- **`migration.sql` is the only file that changes a deployed schema.** Every change is appended to it as an idempotent block, so re-running it on every deploy is safe.
- **`schema.sql` is generated from a production schema-only dump** with `server/scripts/clean-schema-dump.js`, and never edited by hand.
- **`db:setup` runs `schema.sql`, then `migration.sql`, then `seed.sql`.** A fresh install and a deploy apply the same statements.
- **The numbered files are frozen as history.**

The rule is written down in [database.md](../database.md#the-migration-rule).

## Alternatives considered
- **A migration runner with a tracking table** (e.g. `node-pg-migrate`, or a `schema_migrations` table). It handles non-idempotent changes and gives a record of what ran. Not chosen yet: every change so far has been expressible idempotently, and a runner adds a tool, a table and a bootstrap step for an existing production database. Revisit when a change can't be made idempotent (renames, destructive type changes, data moves that must run once).
- **Run the numbered files on deploy.** Rejected: they were written for fresh databases and aren't all guaranteed idempotent on production.

## Consequences
- **No record of what ran:** `migration.sql` grows over time, and there's no per-change record in the database of what was applied. Its idempotency is what makes that acceptable, so every block must be tested twice on a copy of the production schema.
- **Failed deploys:** a failing block stops the deploy before `pm2 restart` (after the pre-deploy backup), so new code never runs against an old schema. The checked-out code does change, though.
