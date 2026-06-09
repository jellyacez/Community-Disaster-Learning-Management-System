# Community Disaster Learning Management System

A progressive, multi-level web application designed to train and certify residents of Bacolor, Pampanga in Disaster Risk Reduction and Management (DRRM). This platform aligns with PRC and NDRRMC standards, providing tailored education on flooding, earthquakes, and fire safety.

## 🌟 Key Features

- **Progressive Learning**: Multi-level modules tailored to local hazards.
- **Role-Based Access Control (RBAC)**: Secure, partitioned dashboards for Residents, Barangay Admins, MDRRMO Admins, and System Admins.
- **Enterprise-Grade Security**: Powered by Better Auth with secure HTTP-only session cookies and backend middleware protection.
- **Responsive UI**: Built with React, TailwindCSS, Framer Motion, and beautiful Hugeicons.

---

## 🛠️ Technology Stack

### Backend (Server)
- **Node.js & Express**: API and server framework
- **PostgreSQL & pg**: Relational database for structured data
- **Better Auth**: Comprehensive session management and RBAC admin plugin
- **Helmet & CORS**: Essential HTTP security layers

### Frontend (Client)
- **React + Vite**: Blazing fast modern UI framework
- **React Router Dom**: Dynamic client-side routing with protected routes
- **TailwindCSS**: Utility-first styling for a premium aesthetic
- **Framer Motion**: Smooth, dynamic micro-animations
- **Hugeicons**: High-quality SVG icon library

---

## 🚀 Getting Started

### Prerequisites

- Node.js installed (v18+)
- PostgreSQL installed and running

### 1. Server Setup

Navigate into the server directory and install dependencies:

```bash
cd server
npm install
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
BETTER_AUTH_SECRET=your_super_secret_random_string_here
```
*(Tip: Generate a secure secret using `npx @better-auth/cli secret`)*

**Database Migration:**
Because we are using `better-auth`, you need to generate the authentication tables (including the user role columns):

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
npm install
```

**Run the Client:**
```bash
npm run dev
```

The application will be live at `http://localhost:5173`.

---

## 🛡️ Security Architecture

1. **Frontend Protection**: The `<ProtectedRoute />` component inspects the active session and intercepts unauthorized access attempts, hiding UI elements and safely redirecting users.
2. **Backend Protection**: The `roleMiddleware.js` operates as an Express gatekeeper, validating the secure session token against the required role (e.g., `system_admin`) before any sensitive database query runs.
3. **Admin Promotions**: System Admins are managed securely using the `@better-auth/admin` backend plugin.
