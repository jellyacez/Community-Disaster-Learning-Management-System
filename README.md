# Community Disaster Learning Management System

## Prerequisites
- Node.js installed
- PostgreSQL installed and running

---

## 1. Server Setup

Navigate into the server directory and install the required dependencies.

```bash
cd server
npm install
```

### Installed Server Packages
- **express**: Backend web framework
- **pg**: PostgreSQL client for Node.js
- **cors**: Middleware to allow cross-origin requests
- **dotenv**: Loads environment variables from `.env`
- **bcryptjs**: Used for securely hashing passwords
- **better-auth**: Comprehensive authentication library
- **nodemon** (dev): Automatically restarts the server on file changes

### Environment Variables
Create a `.env` file in the `server` directory and add the following configuration:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=your_database_name
DB_USER=postgres
DB_PASSWORD=your_postgres_password
JWT_SECRET=your_super_secret_random_string_here
BETTER_AUTH_URL=http://localhost:5000
BETTER_AUTH_SECRET=your_super_secret_random_string_here
```

### Database Migration
Because we are using `better-auth`, you need to generate the authentication tables in your PostgreSQL database. Run the following command inside the `server` directory:

```bash
npx @better-auth/cli migrate --config ./utils/auth.js
```

### Run the Server
```bash
npm run dev
```

---

## 2. Client Setup

Navigate into the client directory and install the required frontend dependencies.

```bash
cd client
npm install
```

### Installed Client Packages
- **react** & **react-dom**: UI Library
- **vite**: Frontend build tool
- **react-router-dom**: Handles page navigation and routing
- **tailwindcss** & **@tailwindcss/vite**: Utility-first CSS framework
- **framer-motion**: Animation library for modern UI interactions
- **lucide-react**: Beautiful SVG icons
- **axios**: Promise-based HTTP client
- **better-auth**: Frontend client for handling login, registration, and sessions

### Run the Client
```bash
npm run dev
```
