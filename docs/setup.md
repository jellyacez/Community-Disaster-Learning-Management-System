# Local setup from scratch

Runs the API and the web app directly on your machine. For the Docker alternative see [docker/SETUP.md](../docker/SETUP.md).

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Git | any | |
| Node.js | 22 or later | The Docker images use Node 22 and CI uses Node 24. |
| PostgreSQL | 16 | Production runs 16. Newer versions also work locally. You need a user that can create databases. `pg_dump`/`psql` from the same install are used for backups. |
| A Gmail account with an App Password | | For verification and password-reset emails (`EMAIL_USER`, `EMAIL_APP_PASSWORD`). |

## 1. Clone

```bash
git clone https://github.com/jellyacez/Community-Disaster-Learning-Management-System.git
cd Community-Disaster-Learning-Management-System
```

## 2. Environment files

```bash
cp docker/env/server.env.example server/.env
cp docker/env/client.env.example client/.env
```

(Windows Command Prompt: `copy docker\env\server.env.example server\.env`, and the same for the client. UNVERIFIED: only the `cp` form was run.)

In `server/.env`, set at least:

- `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` (and `DB_HOST`/`DB_PORT` if not `localhost:5432`);
- `BETTER_AUTH_SECRETS`: run `npm run rotate-better-auth` in `server/` to generate it;
- `TURNSTILE_SECRET_KEY`: for local work, Cloudflare's test secret `1x0000000000000000000000000000000AA`;
- `EMAIL_USER`, `EMAIL_APP_PASSWORD`;
- `BACKUP_ZIP_PASSWORD`, `BACKUP_ENCRYPTION_KEY` if you will use System Health backups.

`client/.env` works as copied: it points at `http://localhost:5000` and uses Cloudflare's test site key. Every variable is described in [configuration.md](configuration.md).

## 3. Install dependencies

```bash
cd server && npm ci
cd ../client && npm ci
```

## 4. Create the database and the first admin

```bash
cd server
npm run db:setup
```

**`db:setup` DROPS and recreates the `public` and `rate_limit` schemas in `DB_DATABASE`, deleting all data.** Use it only to create a database from nothing ([database.md](database.md)).

### Create the first admin

A fresh database has no users, and admin accounts can only be created by another admin. Create the first `system_admin` from the command line:

```bash
cd server
npm run create-first-admin -- --email admin@example.org --name "Full Name"
```

- It prompts for the password twice without echoing it (UNVERIFIED: the prompt needs an interactive terminal and wasn't exercised; the `FIRST_ADMIN_PASSWORD` path was). Alternatively, set `FIRST_ADMIN_PASSWORD` in the environment for that one command. Never pass the password as an argument: the script refuses one.
- With the email of an existing account, it promotes that account instead and leaves its password unchanged.
- It refuses if a `system_admin` already exists, and under `NODE_ENV=production` unless you add `--i-understand`.
- It marks the email verified and records "created via CLI" or "promoted via CLI" in the activity log.

## 5. Run

```bash
# terminal 1
cd server && npm run dev        # nodemon; logs "[BOOT] Server is running on port 5000"

# terminal 2
cd client && npm run dev        # Vite; open http://localhost:5173
```

Sign in with the first admin. New residents must verify their email before they can sign in, so sign-up needs working Gmail settings.

## Other commands

| Where | Command | What it does |
|---|---|---|
| `server/` | `npm run lint` | ESLint |
| `client/` | `npm run lint` | ESLint |
| `client/` | `npm run build` | Production build into `client/dist` |
| `server/` | `npm run rotate-better-auth` | New Better Auth secret in `server/.env`. Keeps only the previous one: its sessions still work, older ones must sign in again |
| `server/` | `npm run rotate-secrets` | Same, and also rewrites the unused `JWT_SECRET` |
| repo root | `node server/tests/<name>.regression.cjs` | Regression tests; see [testing.md](testing.md) |
