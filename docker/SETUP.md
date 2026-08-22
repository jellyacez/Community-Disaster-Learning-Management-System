# 🚀 Local Development Setup Guide

This guide walks you through running the **Community Disaster Learning Management System** on your local machine for development.

> **Three options are available — pick what suits you:**
>
> | Option | What runs locally | Hot reload? | Best for |
> |---|---|---|---|
> | **A — Local Vite** | Node + Postgres installed on your machine | ✅ Yes | Active coding |
> | **B — Docker Dev** | Only Docker Desktop needed | ✅ Yes | No Node/Postgres install |
> | **C — Docker Full** | Only Docker Desktop needed | ❌ No | Testing the final build |

---

## ✅ Prerequisites

### Option A — Local Dev

Install the following:

| Tool | Download Link | Notes |
|---|---|---|
| **Git** | https://git-scm.com/downloads | For cloning the repo |
| **Node.js v22+** | https://nodejs.org | Use the LTS version |
| **PostgreSQL 16** | https://www.postgresql.org/download | The database |

### Options B & C — Docker

| Tool | Download Link | Notes |
|---|---|---|
| **Git** | https://git-scm.com/downloads | For cloning the repo |
| **Docker Desktop** | https://www.docker.com/products/docker-desktop | Includes Docker & Docker Compose |

> **After installing Docker Desktop**, launch the app and wait until the whale icon in your taskbar shows **"Docker Desktop is running"** before proceeding.

---

## 📥 Step 1 — Clone the Repository

Open a terminal (PowerShell, Command Prompt, or Git Bash) and run:

```bash
git clone https://github.com/jellyacez/Community-Disaster-Learning-Management-System.git
cd Community-Disaster-Learning-Management-System
```

---

## 🔐 Step 2 — Set Up Environment Variables

### Server environment

```bash
# From the repo root
copy docker\env\server.env.example server\.env
```

Open `server/.env` and fill in these required fields:

| Variable | What to put |
|---|---|
| `DB_PASSWORD` | Your local Postgres password |
| `DB_USER` | Your local Postgres user (usually `postgres`) |
| `DB_DATABASE` | `LMS_db` (or whatever name you create) |
| `JWT_SECRET` | Generate with the command below |
| `BETTER_AUTH_SECRETS` | Ask the project lead |
| `EMAIL_USER` | A Gmail address for sending emails |
| `EMAIL_APP_PASSWORD` | Gmail App Password for that account |
| `GOOGLE_CLIENT_ID` | Ask the project lead |
| `GOOGLE_CLIENT_SECRET` | Ask the project lead |

**Generate a JWT_SECRET** (run this in your terminal):

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

> **For Option A (local dev):** Make sure `DB_HOST=localhost` in `server/.env`.
>
> **For Option B (Docker):** Change it to `DB_HOST=db` — Docker Compose sets this automatically via its environment block, so you can leave `server/.env` as `localhost` and Docker will override it.

### Client environment

```bash
# From the repo root
copy docker\env\client.env.example client\.env
```

The default values work for local development — **you don't need to change anything here.**

---

## ▶️ Option A — Running Locally with Vite (Recommended)

### 2a. Create the database

Open pgAdmin (or psql) and create a database named `LMS_db` (or whatever you set in `DB_DATABASE`).

Then run the schema to create all tables. Ask the project lead for the migration script, or run:

```bash
cd server
node config/setup.js
```

### 2b. Install dependencies

Open **two terminals** from the repo root.

**Terminal 1 — Server:**
```bash
cd server
npm install
npm run dev
```

You should see: `Server running on port 5000`

**Terminal 2 — Client:**
```bash
cd client
npm install
npm run dev
```

You should see a local URL like `http://localhost:5173`

### 2c. Open the app

| Service | URL |
|---|---|
| **Frontend (Vite)** | http://localhost:5173 |
| **Backend API** | http://localhost:5000 |
| **Database** | `localhost:5432` (connect via pgAdmin) |

Open **http://localhost:5173** in your browser.

### 2d. Pulling updates

When a teammate pushes new code:

```bash
git pull

# Re-install if package.json changed
cd server && npm install
cd ../client && npm install

# Restart both dev servers
```

---

## 🐳 Option B — Docker Dev (Hot Reload, No Node/Postgres install)

This runs everything in Docker **with live reload** — just like Option A, but without installing Node or PostgreSQL on your machine. Your source files are still on your computer and Git works normally.

### 3a. Build and start the dev stack

```bash
docker compose -f docker-compose.dev.yml up --build
```

> ⏳ **First run takes a few minutes** — Docker installs all dependencies inside the containers. Subsequent starts are fast because deps are cached in Docker volumes.

When you see this, everything is up:

```
lms_db_dev      | database system is ready to accept connections
lms_server_dev  | [nodemon] starting `node server.js`
lms_client_dev  | VITE ready in ...ms
```

### 3b. Open the app

| Service | URL |
|---|---|
| **Frontend (Vite + HMR)** | http://localhost:5173 |
| **Backend API** | http://localhost:5000 |
| **Database** | `localhost:5432` (pgAdmin or any DB client) |

### 3c. Live editing

Edit any file on your machine as normal — changes are reflected immediately:
- **Client file saved** → Vite hot-reloads the browser instantly (no refresh needed)
- **Server file saved** → nodemon auto-restarts the Express server (~1 second)

### 3d. Git workflow

Works exactly the same as always — Docker doesn't touch Git:

```bash
git pull   # updates files on your machine → containers see it immediately
git add .
git commit -m "your message"
git push
```

### 3e. Run database migrations

```bash
docker exec lms_server_dev node config/setup.js
```

### 3f. Stopping

```bash
# Ctrl+C to stop, then:
docker compose -f docker-compose.dev.yml down
```

To wipe the database and start fresh:

```bash
docker compose -f docker-compose.dev.yml down -v
```

### 3g. Pulling updates from teammates

```bash
git pull
# Rebuild only if package.json changed (new dependencies were added):
docker compose -f docker-compose.dev.yml up --build
# Otherwise just:
docker compose -f docker-compose.dev.yml up
```

---

## 🐳 Option C — Docker Full Stack (nginx, no hot reload)

This builds the React app into a static bundle served by nginx — **no hot reload**. Use this only to test the production-like build, not for active development.

### 4a. Build and start

```bash
docker compose up --build
```

### 4b. Open the app

| Service | URL |
|---|---|
| **Frontend (nginx)** | http://localhost |
| **Backend API** | http://localhost:5000 |
| **Database** | `localhost:5432` |

### 4c. Stopping

```bash
docker compose down        # keeps database
docker compose down -v     # wipes database too
```

### 4d. Pulling updates

```bash
git pull
docker compose up --build
```

---

## 🗄️ Running Database Migrations

If the schema has changed (new tables or columns), run migrations after the server is up.

**Local dev:**
```bash
cd server
node config/setup.js
```

**Docker:**
```bash
docker exec lms_server node config/setup.js
```

---

## 🐛 Troubleshooting

### ❌ "Port already in use"

| Port | Likely cause | Fix |
|---|---|---|
| `5432` | Local PostgreSQL already running | Open `services.msc` and stop the `postgresql-*` service, or change `DB_PORT` |
| `5000` | Another Node process | Kill it: `npx kill-port 5000` |
| `5173` | Another Vite process | Kill it: `npx kill-port 5173` |
| `80` | XAMPP / IIS (Docker only) | Close those services |

### ❌ "Missing critical environment variables"

The server won't start without required keys in `server/.env`. Re-check Step 2 and make sure the file is saved.

### ❌ "Cannot connect to the Docker daemon"

Docker Desktop is not running. Launch it and wait for it to fully start.

### ❌ "Cannot connect to database" (local dev)

- Make sure PostgreSQL is running
- Confirm `DB_HOST=localhost`, `DB_PORT=5432`, `DB_USER`, and `DB_PASSWORD` match your local Postgres setup
- Confirm the database named in `DB_DATABASE` actually exists

### ❌ Changes not reflected after `git pull` (Docker)

Always pass `--build`:

```bash
docker compose up --build
```

---

## 📁 Project Structure Reference

```
Community-Disaster-Learning-Management-System/
├── client/               ← React + Vite frontend
│   └── .env              ← Copy from docker/env/client.env.example
├── server/               ← Express.js backend
│   └── .env              ← Copy from docker/env/server.env.example
├── docker/
│   ├── client/
│   │   ├── Dockerfile    ← How the React app is built & served (Docker only)
│   │   └── nginx.conf    ← nginx config (Docker only)
│   ├── server/
│   │   └── Dockerfile    ← How the Express API is containerised (Docker only)
│   ├── env/
│   │   ├── client.env.example  ← Copy to client/.env
│   │   └── server.env.example  ← Copy to server/.env
│   └── SETUP.md          ← This guide
├── docker-compose.yml    ← Starts all 3 services together (Docker only)
└── .dockerignore         ← Files excluded from Docker builds
```

---

_Last updated: August 2026_
