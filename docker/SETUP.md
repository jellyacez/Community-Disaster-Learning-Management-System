# 🚀 Docker Setup Guide for Groupmates

This guide walks you through running the **Community Disaster Learning Management System** on your local machine using Docker — no need to manually install Node.js, PostgreSQL, or any other dependency.

---

## ✅ Prerequisites

Before you begin, install the following on your machine:

| Tool               | Download Link                                  | Notes                            |
| ------------------ | ---------------------------------------------- | -------------------------------- |
| **Git**            | https://git-scm.com/downloads                  | For cloning the repo             |
| **Docker Desktop** | https://www.docker.com/products/docker-desktop | Includes Docker & Docker Compose |

> **After installing Docker Desktop**, launch the app and wait until the whale icon in your taskbar shows **"Docker Desktop is running"** before proceeding.

---

## 📥 Step 1 — Clone the Repository

Open a terminal (PowerShell, Command Prompt, or Git Bash) and run:

```bash
git clone https://github.com/jellyacez/Community-Disaster-Learning-Management-System.git
cd Community-Disaster-Learning-Management-System
```

> Replace the URL above with the actual GitHub link your team uses.

---

## 🔐 Step 2 — Set Up Your Environment Variables

The app needs secret keys and config values. These are **not** stored in Git for security — you need to create the `.env` files yourself from the provided templates.

### 2a. Server environment

```bash
# Copy the template
copy docker\env\server.env.example server\.env
```

Then open `server/.env` in any text editor and fill in **these required fields**:

| Variable               | What to put                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| `DB_PASSWORD`          | A password you choose for your local database (e.g. `mypassword123`) |
| `JWT_SECRET`           | A long random string — generate one with the command below           |
| `BETTER_AUTH_SECRETS`  | Ask the project lead to share the current secrets                    |
| `EMAIL_USER`           | A Gmail address to send emails from                                  |
| `EMAIL_APP_PASSWORD`   | The Gmail App Password for that account                              |
| `GOOGLE_CLIENT_ID`     | Ask the project lead for the Google OAuth credentials                |
| `GOOGLE_CLIENT_SECRET` | Ask the project lead for the Google OAuth credentials                |

**Generating a JWT_SECRET** (run this in your terminal):

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and paste it as the value of `JWT_SECRET`.

> **Important:** Leave `DB_HOST=db` as-is. Docker Compose connects the server to the database container using that name automatically.

### 2b. Client environment

```bash
# Copy the template
copy docker\env\client.env.example client\.env
```

The default values in `client/.env` work for local development — **you don't need to change anything here.**

---

## 🏗️ Step 3 — Build and Start the App

Run this single command from the project root folder:

```bash
docker compose up --build
```

This will automatically:

1. Pull the PostgreSQL 16 image
2. Build the Express server image
3. Build the React/Vite client image and serve it via nginx
4. Start all three services and wire them together

> ⏳ **The first run takes a few minutes** because Docker is downloading base images and installing dependencies. Subsequent starts are much faster.

When you see output like this, everything is running:

```
lms_db      | database system is ready to accept connections
lms_server  | Server running on port 5000
lms_client  | ... nginx started ...
```

---

## 🌐 Step 4 — Open the App

| Service            | URL                                                     |
| ------------------ | ------------------------------------------------------- |
| **Frontend (App)** | http://localhost                                        |
| **Backend API**    | http://localhost:5000                                   |
| **Database**       | `localhost:5432` (connect via pgAdmin or any DB client) |

Open your browser and go to **http://localhost** to use the app.

---

## 🛑 Stopping the App

Press `Ctrl + C` in the terminal where Docker is running, then run:

```bash
docker compose down
```

> This stops and removes the containers but **preserves your database data** in a Docker volume. Your data will still be there the next time you start up.

To also **wipe the database** and start completely fresh:

```bash
docker compose down -v
```

---

## 🔄 Pulling the Latest Changes

When a teammate pushes new code, update your local copy and rebuild:

```bash
git pull
docker compose up --build
```

---

## 🗄️ Running Database Migrations

If the database schema has changed (new tables, columns, etc.), run migrations after the containers are up. Ask the project lead which script to run. It typically looks like:

```bash
# Run this AFTER docker compose up
docker exec lms_server node scripts/migrate.js
```

---

## 🐛 Troubleshooting

### ❌ "Port already in use"

Another app is occupying port 80, 5000, or 5432.

- **Port 5432**: You may have PostgreSQL installed locally. Open **Services** (`services.msc`) and stop any `postgresql-*` service.
- **Port 80**: Close any local web server (XAMPP, IIS, etc.).
- **Port 5000**: Kill any running Node.js process using that port.

### ❌ "Missing critical environment variables" error

The server refuses to start if `server/.env` is missing required keys. Double-check you completed **Step 2a** and that the file is saved correctly.

### ❌ "Cannot connect to the Docker daemon"

Docker Desktop is not running. Launch it from your Start Menu and wait for it to fully start, then retry.

### ❌ Changes not reflected after `git pull`

Always pass `--build` when restarting after pulling updates:

```bash
docker compose up --build
```

---

## 📁 Docker Folder Reference

```
docker/
├── client/
│   ├── Dockerfile          ← How the React app is built & served
│   └── nginx.conf          ← Web server config (SPA routing)
├── server/
│   └── Dockerfile          ← How the Express API is built
├── env/
│   ├── client.env.example  ← Copy to client/.env
│   └── server.env.example  ← Copy to server/.env
└── SETUP.md                ← This guide

docker-compose.yml          ← Starts all 3 services together
.dockerignore               ← Files excluded from Docker builds
```

---

_Last updated: July 2026_
