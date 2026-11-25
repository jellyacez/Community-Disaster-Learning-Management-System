# Configuration

Every environment variable the code reads, with its default and what it controls. Values here are placeholders; never commit real ones.

- Server: copy [`docker/env/server.env.example`](../docker/env/server.env.example) to `server/.env`.
- Client: copy [`docker/env/client.env.example`](../docker/env/client.env.example) to `client/.env`.

## Server (`server/.env`)

The server refuses to start unless `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` and one of `BETTER_AUTH_SECRETS` / `BETTER_AUTH_SECRET` are set (`server/server.js:3-17`).

### Runtime

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | No | `5000` | API port (`server/server.js:215`). |
| `NODE_ENV` | No | unset | `production`: TLS to PostgreSQL (`server/config/db.js:12`), Express trusts one proxy hop, CORS and Better Auth accept only `FRONTEND_URL`. |
| `TRUST_PROXY` | No | unset | `1` trusts one proxy hop (needed behind nginx for correct client IPs) without the rest of production mode (`server/server.js:41-47`). |
| `FRONTEND_URL` | **Yes in production** | `http://localhost:5173` in email links | The web app's origin: CORS allow-list, Better Auth trusted origin (startup fails without it in production, `server/utils/auth.js:220-225`), and the base of links in emails (`server/utils/templates/*.js`). |
| `BACKEND_URL` | No | `http://localhost:5000` | Base of URLs for files uploaded to local disk (`server/routes/modules/moduleRoutes.js:48`). |

### Database

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DB_HOST` | No | pg default (`localhost`) | PostgreSQL host. Docker Compose sets `db`. |
| `DB_PORT` | No | pg default (`5432`) | PostgreSQL port. |
| `DB_DATABASE` | **Yes** | `LMS_db` (setup script only) | Database name. |
| `DB_USER` | **Yes** | | Database user. |
| `DB_PASSWORD` | **Yes** | | Database password. |
| `DB_SSL_CA_PATH` | No | | Production only: CA certificate file for a self-signed database certificate. |
| `DATABASE_URL` | Production deploy only | | Not read by the app. `deploy.yml` uses it for the pre-deploy `pg_dump` and for `psql -f migrations/migration.sql`. |
| `PG_DUMP_PATH` | No | `pg_dump` on `PATH` | `pg_dump` binary for backups and the restore safety dump; `deploy.yml` also prefers it. |
| `PG_RESTORE_PATH` | No | `pg_restore` on `PATH` | `pg_restore` binary for restores. |

### Authentication and email

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `BETTER_AUTH_SECRETS` | **One of these two** | | Versioned secrets, newest first, e.g. `"2:<new>, 1:<old>"`. Generate or rotate with `npm run rotate-better-auth`. It keeps only the previous secret: sessions signed with it still work, older ones must sign in again (`server/rotate-better-auth.js:100-101`). |
| `BETTER_AUTH_SECRET` | | | Single-secret form; used only if `BETTER_AUTH_SECRETS` is unset. |
| `BETTER_AUTH_URL` | Set it | | The API's public origin, passed to Better Auth as `baseURL` (`server/utils/auth.js:33`), e.g. `http://localhost:5000`. |
| `EMAIL_USER` | **Yes, for any email** | | Gmail account Nodemailer sends from (`service: "gmail"`, `server/utils/mailer.js`). Every email's From is this address, with the System Name as display name. The Support Email setting is only the Reply-To (and the contact line in account notices, which falls back to this address). There are no `SMTP_*` variables. |
| `EMAIL_APP_PASSWORD` | **Yes, for any email** | | Gmail App Password for `EMAIL_USER`. Without working email, sign-up verification and password resets fail. |
| `TURNSTILE_SECRET_KEY` | **Yes** | | Cloudflare Turnstile secret. Email sign-in and sign-up are always checked (`server/server.js:140-141`). For local development use Cloudflare's test secret `1x0000000000000000000000000000000AA` with the test site key below; test secrets accept only the dummy token, so never use them in production. |
| `GOOGLE_CLIENT_ID` | No | | Google sign-in is enabled only when both Google values are set and not placeholders (`server/utils/auth.js:25-29`). |
| `GOOGLE_CLIENT_SECRET` | No | | |
| `MFA_ENABLED` | No | off | `true` registers Better Auth's twoFactor plugin and requires 2FA for every admin role (`server/config/permissions.js:59-67`). Restart after changing. See [auth.md](auth.md). |
| `JWT_SECRET` | No | | **Not read by the application.** `npm run rotate-secrets` still writes it; it can be left out. |

### Backups and restore

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `BACKUP_ZIP_PASSWORD` | For backups | | Password that locks backup ZIPs and the pre-restore safety dump; 12 to 256 bytes (`server/services/secureBackup.js`). |
| `BACKUP_ENCRYPTION_KEY` | For backups | | 64 hexadecimal characters (AES-256 key). Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep it with the backups' records: a backup can't be restored without it. |
| `ENABLE_DATABASE_RESTORE` | No | `false` | `true` allows restores. Set only for a maintenance window, then set back. See [backup-restore.md](backup-restore.md). |
| `RESTORE_SAFETY_DUMP_PATH` | No | `server/backups/pre-restore-safety.dump` | Where the encrypted pre-restore safety dump is written. |

### File uploads (S3)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `AWS_ACCESS_KEY_ID` | No | | With `AWS_SECRET_ACCESS_KEY`, uploads go to S3; without both, to `server/uploads` (`server/middleware/uploadMiddleware.js:8`). |
| `AWS_SECRET_ACCESS_KEY` | No | | |
| `AWS_S3_BUCKET_NAME` | No | `bacolor-lms-media` | Bucket name. System Health reports S3 as configured only when this and both keys are set. |
| `AWS_REGION` | No | `ap-southeast-1` | Bucket region. |

### Settings kept in the database (System Settings page)

Not environment variables, listed here because they change what users and emails show. Spec: [specs/branding.md](specs/branding.md).

| Setting | Rules | Where it shows |
|---|---|---|
| System Name (`system_name`) | 2 to 60 characters, no line breaks, tabs or text-direction (bidi) control characters | Landing, sign-in and register, both sidebars, portal footer, tab titles, email header, From display name, reset/verify subjects. Falls back to "Bacolor Disaster LMS" |
| Platform Logo (`system_logo`) | PNG, JPG or WEBP, at most 500 KB; SVG and links refused; stored as uploaded (EXIF kept) | Next to the name in the app; not in emails. Served by `GET /api/public/branding/logo` |
| Support Email (`support_email`) | Empty, or one address up to 254 characters | Reply-To of every email and the account-notice contact line |
| Email Footer Text (`org_footer_text`) | Up to 200 characters, one line | Footer of every email |

The installed PWA's name and icon come from `client/vite.config.js` and `client/public/` at build time and don't follow these settings.

### Scripts and tests only

| Variable | Used by | Purpose |
|---|---|---|
| `FIRST_ADMIN_PASSWORD` | `npm run create-first-admin` | Password for a new first admin when not typed at the prompt. See [setup.md](setup.md#create-the-first-admin). |
| `TEST_BASE_URL` | `server/tests/*.regression.cjs` | API the HTTP tests call; default `http://localhost:5000`. |

## Client (`client/.env`)

Vite inlines these at build time, so changing them needs a rebuild (`npm run build`) or a dev-server restart.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `VITE_API_URL` | No | dev: `http://localhost:5000/api`; build: `/api` | API base URL (`client/src/lib/apiClient.js:4`). |
| `VITE_BASE_URL` | No | dev: `http://localhost:5000`; build: same origin | Better Auth client base URL (`client/src/lib/auth-client.js:7`). |
| `VITE_TURNSTILE_SITE_KEY` | **Yes** | | Cloudflare Turnstile site key for the sign-in and sign-up forms. Local test key: `1x00000000000000000000AA`. |
