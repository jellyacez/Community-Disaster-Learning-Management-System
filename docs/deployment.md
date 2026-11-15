# Deployment

Production runs on an AWS EC2 host. The API runs under **pm2**; nginx sits in front. **Docker is not used in production**: `docker-compose.yml`, `docker-compose.dev.yml` and `docker/` are for local development and for the CI image build check only.

## What happens on a push to `main`

Described from the workflow file (not executed while writing this). [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) connects to the host over SSH (`appleboy/ssh-action`, secrets `EC2HOST`, `EC2USER`, `EC2SSHKEY`) and runs, with `set -e` so any failing step stops the deploy:

1. **Code.** In `/var/www/lms/Community-Disaster-Learning-Management-System`: `git fetch origin main`, `git reset --hard origin/main`, `git pull origin main`.
2. **Client.** In `client/`: `npm install`, `npm run build` (produces `client/dist`; `client/.env` on the host is baked into it).
3. **Server dependencies.** In `server/`: `npm install`, then the variables from `server/.env` are exported into the shell.
4. **Backup.** It picks a `pg_dump` whose major version is at least the server's (`PG_DUMP_PATH`, then `PATH`, then the distribution paths). It writes `~/db-backups/pre-deploy-<timestamp>.dump` (custom format) via a `.partial` file, and keeps the 10 newest.
5. **Migrate.** `psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f migrations/migration.sql`. This is the only schema step: the numbered migrations are never run. See [database.md](database.md#the-migration-rule).
6. **Restart.** `pm2 restart all --update-env`.

`DATABASE_URL` must be set in `server/.env` on the host. The app itself doesn't read it; only steps 4 and 5 do.

If step 5 fails, the deploy stops before step 6. The new code is checked out, but the running processes still use the old code until the next restart. Fix `migration.sql` and push again, or restore the pre-deploy dump ([backup-restore.md](backup-restore.md#manual-fallback-pg_dump-and-pg_restore)).

## Other workflows

| Workflow | Runs on | What it does |
|---|---|---|
| `ci.yml` | every push; PRs to `main` | Lint and build (Node 24). Does not block deploys. |
| `docker-build.yml` | PRs to `main` touching Docker, server or client files; pushes to `main` | Builds the Docker images to check they still build. Nothing is deployed. |
| `security.yml` | Mondays 08:00 UTC, and manually | `npm audit` |
| `backfill-email-verified.yml` | manually | Runs the email-verification backfill on the host ([auth.md](auth.md#backfill-for-accounts-created-while-verification-was-off)). |

## Production server notes

- Set `NODE_ENV=production`. This turns on TLS to PostgreSQL, trusts one proxy hop (for correct client IPs behind nginx), and limits CORS and Better Auth to `FRONTEND_URL`, which then becomes required.
- Run **one** API process. The backup/restore lock and the backup and restore rate limits live in process memory.
- **UNVERIFIED (not in this repository):**
  - the host's nginx configuration (`docker/client/nginx.conf` belongs to the Docker image, not the EC2 host);
  - the pm2 process definition;
  - whether nginx forwards `/uploads` to the API for files stored on local disk.

  Check these on the host.
