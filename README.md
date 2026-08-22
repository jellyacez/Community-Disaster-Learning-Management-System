# Community Disaster Learning Management System

A progressive, multi-level web application designed to train and certify residents of Bacolor, Pampanga in Disaster Risk Reduction and Management (DRRM). The platform aligns with PRC and NDRRMC standards and covers local hazards including flooding, earthquakes, and fire safety.

---

## 🌟 Key Features

- **Progressive Learning** — Multi-level modules tailored to local hazards with quiz-based assessments and verifiable PDF certificates
- **Role-Based Access Control** — Partitioned dashboards for Residents, Barangay Admins, MDRRMO Admins, and System Admins with least-privilege UI generation
- **Enterprise-Grade Auth** — Powered by Better Auth with HTTP-only session cookies, versioned secret rotation, and strict backend middleware protection
- **Multi-Factor Authentication** — Optional 2FA for residents; mandatory enforced MFA for all admin roles via TOTP
- **Feedback & Communication** — Residents can submit tickets and communicate directly with Barangay and MDRRMO offices
- **Real-time Admin Dashboards** — Live data visualization, server health monitoring, and sector/barangay performance tracking
- **Responsive UI** — Mobile-first design built with React, Tailwind CSS, Framer Motion, and Hugeicons
- **Security Hardened** — Rate limiting (PostgreSQL-backed), Helmet, CORS, HPP, XSS sanitization, payload validation, and strict startup environment checks

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express 5, PostgreSQL, Better Auth |
| **Frontend** | React 19, Vite, Tailwind CSS v4, Framer Motion |
| **Auth** | Better Auth (sessions, RBAC admin plugin, 2FA/TOTP) |
| **Email** | Nodemailer (Gmail SMTP / App Password) |
| **PDF** | @react-pdf/renderer |
| **Charts** | Recharts |
| **Icons** | Hugeicons |
| **Dev Tools** | nodemon, ESLint |
| **Containers** | Docker, Docker Compose, nginx |

---

## 🚀 Getting Started

There are three ways to run the project. Pick the one that suits you.

---

### Option A — Local Dev (Node + Postgres on your machine)

**Prerequisites:** Node.js v22+, PostgreSQL 16

#### 1. Clone the repo

```bash
git clone https://github.com/jellyacez/Community-Disaster-Learning-Management-System.git
cd Community-Disaster-Learning-Management-System
```

#### 2. Set up environment files

```bash
# Server
copy docker\env\server.env.example server\.env

# Client
copy docker\env\client.env.example client\.env
```

Open `server/.env` and fill in your database credentials and secrets. See the [Environment Variables](#-environment-variables) section below.

#### 3. Install dependencies

```bash
# Server
cd server && npm install

# Client (in a new terminal)
cd client && npm install
```

#### 4. Initialize the database

Create a PostgreSQL database (e.g. `LMS_db`), then run:

```bash
cd server
node config/setup.js
```

#### 5. Start the dev servers

**Terminal 1 — Server:**
```bash
cd server && npm run dev
# → http://localhost:5000
```

**Terminal 2 — Client:**
```bash
cd client && npm run dev
# → http://localhost:5173
```

---

### Option B — Docker Dev (hot reload, no local Node/Postgres needed)

**Prerequisites:** Docker Desktop only

```bash
# Copy and fill in server/.env first (see Environment Variables below)
copy docker\env\server.env.example server\.env

docker compose -f docker-compose.dev.yml up --build
```

| Service | URL |
|---|---|
| Frontend (Vite + HMR) | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| Database | `localhost:5432` |

Edit files on your machine normally — Vite hot-reloads the browser, nodemon restarts the server. Git works as usual.

See [`docker/SETUP.md`](docker/SETUP.md) for full details.

---

### Option C — Docker Full Stack (nginx, production build)

**Prerequisites:** Docker Desktop only

```bash
copy docker\env\server.env.example server\.env

docker compose up --build
```

| Service | URL |
|---|---|
| Frontend (nginx) | http://localhost |
| Backend API | http://localhost:5000 |

No hot reload — use this to test the production build. See [`docker/SETUP.md`](docker/SETUP.md) for full details.

---

## 🔐 Environment Variables

Copy `docker/env/server.env.example` to `server/.env` and fill in:

| Variable | Description |
|---|---|
| `DB_HOST` | `localhost` for local dev; Docker overrides to `db` automatically |
| `DB_PORT` | `5432` |
| `DB_DATABASE` | Your database name (e.g. `LMS_db`) |
| `DB_USER` | Your Postgres user |
| `DB_PASSWORD` | Your Postgres password |
| `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `BETTER_AUTH_URL` | `http://localhost:5000` |
| `BETTER_AUTH_SECRETS` | Generate: `npm run rotate-better-auth` |
| `EMAIL_USER` | Gmail address for sending emails |
| `EMAIL_APP_PASSWORD` | Gmail App Password |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `FRONTEND_URL` | `http://localhost:5173` (dev) |
| `NODE_ENV` | `development` or `production` |

**Generate fresh auth secrets any time:**
```bash
cd server
npm run rotate-better-auth   # rotates BETTER_AUTH_SECRETS only
npm run rotate-secrets       # rotates both JWT_SECRET and BETTER_AUTH_SECRETS
```

---

## 🛡️ Security Architecture

1. **Protected Routes** — `<ProtectedRoute />` checks active sessions and role scopes; unauthorized access shows a full-screen denial overlay and redirects
2. **Auth Middleware** — `betterAuthMiddleware.js` validates every request has an active Better Auth session
3. **Admin Middleware** — `adminMiddleware.js` validates the session role before any sensitive query runs
4. **Rate Limiting** — PostgreSQL-backed distributed rate limiting via `@acpr/rate-limit-postgresql`; effective across multi-process deployments
5. **SQL Injection Prevention** — All queries use parameterized statements via `pg`
6. **XSS Sanitization** — `sanitize-html` scrubs rich-text module content; allows safe formatting, strips `<script>`, inline styles, and `<iframe>`
7. **HTTP Security Headers** — Helmet sets CSP, HSTS, X-Frame-Options, and more
8. **CORS** — Strict origin allowlist; production locks to `FRONTEND_URL` only
9. **HPP** — HTTP Parameter Pollution protection on all query strings
10. **Payload Limits** — JSON body capped at 500 KB; Base64 uploads capped at 2 MB
11. **MFA Enforcement** — Admin roles are redirected to a mandatory TOTP setup flow if 2FA is not configured
12. **Secret Rotation** — `npm run rotate-secrets` / `rotate-better-auth` rotate cryptographic keys using versioned envelope encryption without invalidating active sessions
13. **Startup Validation** — Server crashes immediately on boot if any critical env variable is missing
14. **Session Management** — HTTP-only cookies, 7-day expiry with 24-hour rolling refresh; users can revoke individual or all sessions from Settings
15. **Password Security** — 24-hour cooldown on manual password changes; bypass only via email recovery flow
16. **Data Privacy (R.A. 10173)** — 90-day log retention, hard-deletion pipelines for analytics PII, strict PII redaction in system logs
17. **Dual-Layer Logging** — Audit logs (security events) in PostgreSQL for the Admin UI; crash logs (stack traces) to local `.log` files for visibility during DB failure

---

## 📁 Project Structure

```
├── client/                 ← React + Vite frontend
│   ├── src/
│   │   ├── pages/          ← Route-level page components
│   │   ├── components/     ← Shared UI components
│   │   ├── hooks/          ← Custom React hooks
│   │   └── lib/            ← API client, auth client config
│   └── .env                ← Copy from docker/env/client.env.example
│
├── server/                 ← Express.js backend
│   ├── controllers/        ← Route handler logic
│   ├── routes/             ← Express router definitions
│   ├── middleware/         ← Auth, admin, rate-limit guards
│   ├── services/           ← Business logic / DB queries
│   ├── utils/              ← Auth config, mailer, logger, cron jobs
│   ├── migrations/         ← SQL migration files
│   └── .env                ← Copy from docker/env/server.env.example
│
├── docker/
│   ├── client/
│   │   ├── Dockerfile      ← Production build (nginx)
│   │   ├── Dockerfile.dev  ← Development build (Vite)
│   │   └── nginx.conf      ← nginx SPA + API proxy config
│   ├── server/
│   │   ├── Dockerfile      ← Production image
│   │   └── Dockerfile.dev  ← Development image (nodemon)
│   ├── env/
│   │   ├── client.env.example
│   │   └── server.env.example
│   └── SETUP.md            ← Detailed Docker setup guide
│
├── docker-compose.yml      ← Production stack (nginx, no hot reload)
├── docker-compose.dev.yml  ← Development stack (Vite HMR + nodemon)
└── .dockerignore
```

---

## 📜 License

For academic/capstone use — Municipality of Bacolor, Pampanga MDRRMO.
