# Community Disaster Learning Management System

A web application for training and certifying residents of Bacolor, Pampanga in Disaster Risk Reduction and Management (DRRM). Residents take multi-level modules on local hazards (flood, earthquake, fire) and earn verifiable PDF certificates. Barangay and MDRRMO staff manage modules, enrollment and residents.

## Features

- **Learning:** multi-level modules with lessons, quizzes and situational questions. Final assessments are graded on the server, and certificates come with annual recertification.
- **Roles:** resident, barangay_admin, mdrrmo_admin, head_mdrrmo_admin, system_admin and super_admin, each with its own dashboard. Module changes go through review (head_mdrrmo_admin) before publishing.
- **Enrollment codes:** learners request a module's code, and MDRRMO staff approve or decline the request.
- **Accounts:** Better Auth sessions in HTTP-only cookies, email verification, and optional Google sign-in. 2FA is available but off by default.
- **Administration:** activity log, IP blocklist, Force Logout All Users, maintenance mode and broadcasts, system health, and encrypted database backup and restore.
- **Works offline (PWA):** residents can keep using cached content offline.

## Tech stack

| Layer | Technology |
|---|---|
| API | Node.js, Express 5, PostgreSQL (`pg`), Better Auth |
| Web app | React 19, Vite 8, Tailwind CSS 4, TanStack Query, Framer Motion, Hugeicons |
| Email | Nodemailer (Gmail) |
| PDF | @react-pdf/renderer |
| Production | AWS EC2, pm2, nginx, deployed by GitHub Actions |
| Local alternative | Docker Compose (development only) |

## Getting started

Follow [docs/setup.md](docs/setup.md). In short:

1. Copy `docker/env/*.env.example` to `server/.env` and `client/.env` and fill them in.
2. Run `npm ci` in `server/` and `client/`.
3. Run `npm run db:setup` (**drops and recreates the database schemas**).
4. Run `npm run create-first-admin -- --email … --name …`.
5. Run `npm run dev` in both `server/` and `client/`, then open http://localhost:5173.

## Documentation

| Topic | Where |
|---|---|
| Local setup | [docs/setup.md](docs/setup.md) |
| Docker (local development) | [docker/SETUP.md](docker/SETUP.md) |
| Environment variables | [docs/configuration.md](docs/configuration.md) |
| Database, migrations, seeding | [docs/database.md](docs/database.md) |
| Production deployment | [docs/deployment.md](docs/deployment.md) |
| Backup and restore | [docs/backup-restore.md](docs/backup-restore.md) |
| Authentication, email verification, 2FA | [docs/auth.md](docs/auth.md) |
| Regression tests | [docs/testing.md](docs/testing.md) |
| Architecture decisions | [docs/adr/](docs/adr/) |
| Known issues and history | [TECH_DEBT.md](TECH_DEBT.md) |

## Security

- **Auth checks:** every admin route goes through `authenticate` (session, archived account, 2FA when enabled), then `requireRole` and `requirePermission` (`server/middleware/`). The web app's `ProtectedRoute` only controls what is shown; the server is the authority.
- **Rate limiting:** the auth, global and admin-data limiters are stored in PostgreSQL (`@acpr/rate-limit-postgresql`). The backup, restore and enrollment limiters are in memory.
- **Requests:** Helmet headers, CORS limited to `FRONTEND_URL` in production, HPP, `sanitize-html` for rich text, parameterized SQL everywhere, and an 800 KB JSON body limit.
- **Bots:** Cloudflare Turnstile on email sign-in and sign-up.
- **Sessions:** 7 days, rolled forward on use within 24 hours, and revocable per device or all at once. A manual password change is refused within 24 hours of the last one.
- **Startup check:** the server won't start without `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` and a Better Auth secret.
- **Logs:** activity-log rows and server log files older than 90 days are deleted daily (`server/utils/logRetention.js`).
- **Secrets:** `npm run rotate-better-auth` adds a new Better Auth secret and keeps only the previous one. Sessions signed with it still work; older sessions must sign in again.

## Project structure

```
client/                React + Vite web app
server/
  config/              database pool, permissions, db:setup (setup.js)
  controllers/ routes/ services/ middleware/ utils/
  migrations/          schema.sql, migration.sql, seed.sql (+ historical NN_*.sql)
  scripts/             create-first-admin, clean-schema-dump, backfill-email-verified.sql
  tests/               *.regression.cjs
docker/                Dockerfiles, Docker nginx config, env examples, SETUP.md
docs/                  guides and ADRs
.github/workflows/     deploy, CI, Docker build check, npm audit, email backfill
```

## License

For academic/capstone use: Municipality of Bacolor, Pampanga MDRRMO.
