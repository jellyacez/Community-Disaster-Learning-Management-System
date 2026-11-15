# Docker (local development only)

Docker Compose is an alternative to the [local setup](../docs/setup.md). **Production does not use Docker**: it runs on EC2 with pm2 ([docs/deployment.md](../docs/deployment.md)). CI only checks that the images build.

> **UNVERIFIED:** the commands on this page were not run when this guide was last revised (2026-11-15), because no Docker was available. They match `docker-compose.dev.yml`, `docker-compose.yml` and `docker/`, and the problems listed below come from reading that configuration, not from running it.

| File | What runs | Ports |
|---|---|---|
| `docker-compose.dev.yml` | PostgreSQL 16, API with nodemon, Vite dev server (hot reload) | 5432, 5000, 5173 |
| `docker-compose.yml` | PostgreSQL 16, API, nginx serving the built web app and proxying `/api` | 127.0.0.1:5432, 127.0.0.1:5000, 80 |

## Prerequisites

Docker Desktop (or Docker Engine with Compose v2), running.

## 1. Environment

```bash
cp docker/env/server.env.example server/.env
cp docker/env/client.env.example client/.env
```

Fill in `server/.env` as in [docs/configuration.md](../docs/configuration.md). Compose overrides `DB_HOST` to `db`.

**Database credentials:** the PostgreSQL container takes `DB_USER`, `DB_PASSWORD` and `DB_DATABASE` from Compose variable substitution. That reads your shell or a `.env` file in the repository root, **not** `server/.env`. To make the container and the API use the same values, pass the file explicitly:

```bash
docker compose --env-file server/.env -f docker-compose.dev.yml up --build
```

Without it, the development file falls back to `postgres` / `postgres` / `LMS_db`, and the full-stack file leaves them empty.

## 2. Development stack

```bash
docker compose --env-file server/.env -f docker-compose.dev.yml up --build
```

The first run installs dependencies inside the containers. Then open http://localhost:5173 (API on http://localhost:5000). Files on your machine are mounted, so edits reload as in local development.

Create the database and the first admin once, in a second terminal:

```bash
docker exec lms_server_dev npm run db:setup
docker exec -it lms_server_dev npm run create-first-admin -- --email admin@example.org --name "Full Name"
```

**`db:setup` drops and recreates the `public` and `rate_limit` schemas: only run it on a new database.** To apply later schema changes, run `migration.sql` instead ([docs/database.md](../docs/database.md#applying-schema-changes-to-an-existing-database)).

Stop with Ctrl+C, then:

```bash
docker compose -f docker-compose.dev.yml down       # keeps the database volume
docker compose -f docker-compose.dev.yml down -v    # deletes the database too
```

## 3. Full stack (built web app behind nginx)

```bash
docker compose --env-file server/.env up --build
```

Open http://localhost.

**Probable problem (UNVERIFIED):** this file sets `NODE_ENV=production`. In production mode `server/config/db.js` connects to PostgreSQL over TLS, and the `postgres:16-alpine` container doesn't offer TLS by default, so the API is likely to fail with "The server does not support SSL connections". Use the development stack until this is confirmed or fixed.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Port 5432, 5000, 5173 or 80 already in use | A local PostgreSQL, API, Vite or web server is running. Stop it, or change the port mapping. |
| `password authentication failed` from the API | The container and the API got different credentials; see "Database credentials" above. |
| `Missing critical environment variables` | `server/.env` lacks `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` or a Better Auth secret. |
| Code changes not picked up in the full stack | Rebuild with `--build`. |
