# Community Disaster Learning Management System

A progressive, multi-level web application designed to train and certify residents of Bacolor, Pampanga in Disaster Risk Reduction and Management (DRRM). This platform aligns with PRC and NDRRMC standards, providing tailored education on flooding, earthquakes, and fire safety.

## 🌟 Key Features

- **Progressive Learning**: Multi-level modules tailored to local hazards.
- **Role-Based Access Control (RBAC)**: Secure, partitioned dashboards for Residents, Barangay Admins, MDRRMO Admins, and System Admins utilizing a dynamically rendered `AdminLayout` for least-privilege UI generation.
- **Enterprise-Grade Security**: Powered by Better Auth with secure HTTP-only session cookies, backend middleware protection, and strict IP Rate Limiting.
- **Multi-Factor Authentication (MFA)**: Optional 2FA for residents, and strictly enforced mandatory MFA for all administrative roles.
- **Responsive & Dynamic UI**: Built with React, TailwindCSS, Framer Motion, and beautiful Hugeicons. Features mobile-first design, interactive floating animations, and dynamic skeleton loaders.
- **Performance Optimized**: Built using advanced React performance patterns including `React.memo`, stable `useCallback` event handlers, and `React.lazy` code splitting to ensure blistering fast loads even with complex administrative tables.
- **Advanced Admin Dashboards**: Live data visualization using `recharts`, real-time server health monitoring, and interactive quick action panels connected directly to the live PostgreSQL database.
- **Account Management**: Full end-to-end authentication flows including secure registration, login, and forgot password recovery.

---

## 🛠️ Technology Stack

### Backend (Server)

- **Node.js & Express**: API and server framework
- **PostgreSQL & pg**: Relational database for structured data
- **Better Auth**: Comprehensive session management and RBAC admin plugin
- **Express Rate Limit**: DDoS, brute-force, and spam protection
- **Helmet & CORS**: Essential HTTP security layers

### Frontend (Client)

- **React + Vite**: Blazing fast modern UI framework
- **React Router Dom**: Dynamic client-side routing with protected routes
- **TailwindCSS**: Utility-first styling for a premium aesthetic
- **Framer Motion**: Smooth, dynamic micro-animations
- **Hugeicons**: High-quality SVG icon library

---

## 📦 Detailed Dependencies

### Server Dependencies

- `express` (5.2.1)
- `pg` (8.21.0)
- `cors` (2.8.6)
- `dotenv` (17.4.2)
- `better-auth` (1.6.15)
- `express-rate-limit` (8.5.2)
- `@acpr/rate-limit-postgresql` (1.4.1)
- `helmet` (8.2.0)
- `hpp` (0.2.3)
- `sanitize-html` (2.17.5)
- `nodemailer` (9.0.1)
- `@react-pdf/renderer` (4.5.1)
- `node-cron` (3.0.3)
- `nodemon` (3.1.14) - _dev_

### Client Dependencies

- `react` / `react-dom` (19.2.6)
- `react-router-dom` (7.17.0)
- `@tanstack/react-query` (5.101.0)
- `axios` (1.17.0)
- `better-auth` (1.6.15)
- `framer-motion` (12.40.0)
- `react-hot-toast` (2.6.0)
- `qrcode.react` (4.2.0)
- `recharts` (3.9.1)
- `dompurify` (3.4.11)
- `@react-pdf/renderer` (4.5.1)
- `@hugeicons/react` (1.1.6)
- `@hugeicons/core-free-icons` (4.2.0)
- `tailwindcss` (4.3.0) & `@tailwindcss/vite` - _dev_
- `vite` (8.0.12) - _dev_
- `eslint` (10.3.0) - _dev_

---

## 🚀 Getting Started

### Prerequisites

- Node.js installed (v18+)
- PostgreSQL installed and running

### 1. Server Setup

Navigate into the server directory and install dependencies:

```bash
cd server
npm ci # Use npm ci for deterministic builds in production, or npm install for dev
```

Create a `.env` file in the `server` directory:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=your_database_name
DB_USER=postgres
DB_PASSWORD=your_postgres_password
BETTER_AUTH_URL=http://localhost:5173
BETTER_AUTH_SECRETS=1:your_super_secret_random_string_here

# SMTP Configuration for Email OTP (strictly for testing, will change once deployed in aws)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Developer Options
DISABLE_MFA=true
```

_(Tip: Generate a secure secret using `npx @better-auth/cli secret`)_

**Database Schema:**
You must initialize the PostgreSQL database with the custom tables (e.g., `module_data`, `announcements`) defined in `server/schema.sql`. Note that Better-Auth uses standard plugins to auto-migrate its own tables, but the application data tables must be created manually using the provided schema.

```bash
npx @better-auth/cli migrate --config ./utils/auth.js
```

**Run the Server:**

```bash
npm run dev
```

### 2. Client Setup

Open a new terminal, navigate to the client directory, and install dependencies:

```bash
cd client
npm ci # Use npm ci for deterministic builds in production, or npm install for dev
```

Create a `.env` file in the `client` directory (optional for dev):

```env
# Developer Options
VITE_DISABLE_MFA=true
```

**Run the Client:**

```bash
npm run dev
```

The application will be live at `http://localhost:5173`.

---

## 🛡️ Security Architecture

1. **Frontend Protection**: The `<ProtectedRoute />` component explicitly checks active sessions and role scopes to prevent cross-role contamination. Unauthorized attempts trigger a full-screen "Access Denied" overlay (preventing layout exposure) and securely redirect users back to their authorized dynamic dashboards.
2. **Authentication Middleware**: The backend employs `betterAuthMiddleware.js` to ensure the requester is logged into a valid session.
3. **Authorization Middleware**: The `adminMiddleware.js` operates as an Express gatekeeper, strictly validating that the secure session token belongs to a `system_admin` before any sensitive database queries are run.
4. **Distributed Rate Limiting**: Defends the server from brute-force and DDoS attacks. Rate limit states are synchronized globally via PostgreSQL (`@acpr/rate-limit-postgresql`), ensuring absolute effectiveness across multi-process and load-balanced cluster deployments.
5. **SQL Injection Prevention**: All custom database interactions are securely parameterized through `pg` bounds.
6. **Payload Limits**: Incoming JSON requests are strictly capped at 500kb to mathematically prevent memory exhaustion and buffer attacks.
7. **HTTP Parameter Pollution (HPP)**: The server safely parses query strings to prevent duplication-based backend bypasses.
8. **Targeted XSS Sanitization**: A custom `sanitize-html` utility scrubs incoming rich-text content for the LMS modules, explicitly permitting safe HTML formatting while completely eliminating XSS vectors like `<script>`, inline CSS (`<p style>`), and malicious `<iframe>` injections.
9. **Credential Security**: All password mutations, hashing algorithms, and session invalidations rely 100% on Better Auth's internal secure server API, ensuring zero manual database manipulation.
10. **Device Management**: Users can monitor all active sessions across different devices (e.g., Mobile, Windows, Mac) and can selectively or completely revoke active sessions from the Settings dashboard.
11. **Security Cooldowns**: A strict 24-hour cooldown lock is enforced on manual password changes via the user dashboard to mitigate brute-force account takeovers. Legitimate owners can bypass this lock via the secure Email Recovery flow.
12. **Multi-Factor Authentication (MFA)**: Time-based One-Time Password (TOTP) enforcement utilizing Better Auth's twoFactor plugin. Highly privileged roles (system_admin, mdrrmo_admin, barangay_admin) are strictly gated by backend middleware, redirecting them to an un-bypassable MFA setup flow if their account lacks 2FA.
13. **Data Privacy**: The platform includes standardized Privacy Policy and Terms & Conditions. API routes are strictly structured utilizing isolated `/routes` modules (e.g. `authRoutes.js`, `userRoutes.js`) to strictly scope SQL `SELECT` statements and prevent data over-fetching.
14. **Optimized Frontend Architecture**: Large administrative components (like User Management) are strictly decoupled into independent Container Components and Presentation Components. This limits re-renders, prevents UI layout shifting during data fetches, and cleanly separates React Query data mutations from pure visual rendering.
15. **Zero-Downtime Secret Rotation**: The backend features automated utility scripts (`npm run rotate-better-auth` and `npm run rotate-secrets`) to securely cycle Better Auth cryptographic keys using envelope encryption (versioned secrets) and rotate dotenvx file encryption keys without invalidating active user sessions.
16. **Strict Startup Validation**: The server enforces a strict boot sequence that automatically crashes if critical environment variables (like Database credentials or Auth secrets) are missing, preventing the application from booting into an insecure default state.
17. **Strict CORS Policy**: Production environments strictly enforce CORS to exclusively match the explicitly defined frontend origin, neutralizing cross-origin attacks from compromised local environments.
18. **Payload Validation & S3 Readiness**: High-risk endpoints (like system branding) employ hybrid validation—strictly limiting raw Base64 payloads to 2MB and checking MIME types to prevent Denial of Service, while securely accepting AWS S3 HTTPS URLs for cloud storage.
19. **R.A. 10173 (Data Privacy Act) Compliance**: Automated 90-day retention policies for logs, robust "Right to Be Forgotten" hard-deletion pipelines for analytics data (`user_step_progress`, `results`), and strict PII redaction in system logs.
20. **Dual-Layer Logging Architecture**: Strict separation of concerns between System Audit Logs (human-readable security events like "50+ failed logins" stored in PostgreSQL for the Admin UI) and Server Crash Logs (raw code errors, stack traces, and unhandled promise rejections caught via PM2/Process Managers and routed strictly to local server `.log` files to ensure visibility even during total database failure). Both layers are actively managed by `logRetention.js` to prevent database bloat and hard drive exhaustion.
