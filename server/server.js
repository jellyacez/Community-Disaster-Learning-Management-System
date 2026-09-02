require("dotenv").config();

// Check if required env variables are present
const requiredEnvVars = ["DB_USER", "DB_PASSWORD", "DB_DATABASE"];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (!process.env.BETTER_AUTH_SECRET && !process.env.BETTER_AUTH_SECRETS) {
  missingVars.push("BETTER_AUTH_SECRET or BETTER_AUTH_SECRETS");
}

if (missingVars.length > 0) {
  console.error(
    `\x1b[31m[FATAL ERROR] Missing critical environment variables: ${missingVars.join(", ")}\x1b[0m`,
  );
  console.error("The server will not start. Please check your .env file.");
  process.exit(1);
}

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const hpp = require("hpp");
const path = require("path");
const { Pool } = require("pg");

const sanitizeMiddleware = require("./middleware/sanitizeMiddleware");
const { toNodeHandler } = require("better-auth/node");
const { auth } = require("./utils/auth");
const { startLogRetentionCron } = require("./utils/logRetention");
const { startCertificateExpiryCron } = require("./utils/certificateExpiryCron");
const { startAlertMonitor } = require("./services/alertMonitorService");

async function startServer() {
  // ── 1. DB CLEANUP FIX (Connects strictly to DB_DATABASE) ─────────────────────
  const cleanupPool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  });

  try {
    const client = await cleanupPool.connect();
    const dbInfo = await client.query("SELECT current_database(), current_user;");
    console.log(`[DB FIX] Connected to target database: "${dbInfo.rows[0].current_database}"`);

    // Drops only rate-limiting and tracking tables, leaving the session table intact
    await client.query(`
      DROP SCHEMA IF EXISTS rate_limit CASCADE;

      DO $$ 
      DECLARE 
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT tablename FROM pg_tables 
          WHERE schemaname = 'public' 
          AND (tablename LIKE '%rate_limit%' OR tablename = 'migrations' OR tablename = 'pgmigrations')
        ) LOOP
          EXECUTE 'DROP TABLE IF EXISTS public."' || r.tablename || '" CASCADE';
        END LOOP;

        FOR r IN (
          SELECT conname, conrelid::regclass AS table_name
          FROM pg_constraint
          WHERE conname LIKE '%unique_session_key%'
        ) LOOP
          EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT IF EXISTS "' || r.conname || '" CASCADE';
        END LOOP;
      END $$;
    `);
      
    console.log("[DB FIX] Target database cleaned successfully.");
    client.release();
  } catch (err) {
    console.warn("[DB FIX] Warning during cleanup:", err.message);
  } finally {
    await cleanupPool.end();
  }

  // ── 2. IMPORT RATE LIMITERS AFTER CLEANUP ────────────────────────────────────
  const { authRateLimiter, globalLimiter } = require("./middleware/rateLimiters");

  const app = express();

  // Start background cron jobs
  startLogRetentionCron();
  startCertificateExpiryCron();
  startAlertMonitor();

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(express.json({ limit: "500kb" }));
  app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"), {
      setHeaders: (res) => {
        res.setHeader("Content-Disposition", "attachment");
        res.setHeader("X-Content-Type-Options", "nosniff");
      },
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'wasm-unsafe-eval'", "blob:"],
          workerSrc: ["'self'", "blob:"],
          connectSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          mediaSrc: ["'self'", "https:", "blob:"],
          frameSrc: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    }),
  );

  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "production"
          ? [process.env.FRONTEND_URL]
          : [
              process.env.FRONTEND_URL,
              "http://localhost:5173",
              "http://localhost:5174",
            ].filter(Boolean),
      credentials: true,
    }),
  );

  app.use(hpp());
  app.use(sanitizeMiddleware);
  app.use(globalLimiter);

  const ipBlocklistMiddleware = require("./middleware/ipBlocklistMiddleware");
  app.use(ipBlocklistMiddleware);

  const maintenanceMiddleware = require("./middleware/maintenanceMiddleware");
  app.use(maintenanceMiddleware);

  const customAuthRoutes = require("./routes/auth/authRoutes");
  const apiCacheMiddleware = require("./middleware/apiCacheMiddleware");

  // Apply no-store caching globally to all API routes to prevent 304 ghost caching
  app.use("/api", apiCacheMiddleware);

  app.use("/api/auth", authRateLimiter);
  app.use("/api/auth", customAuthRoutes);
  app.use("/api/auth", toNodeHandler(auth));

  // Import routes
  const adminRoutes = require("./routes/admin/adminRoutes");
  const userRoutes = require("./routes/users/userRoutes");
  const userDashboardRoutes = require("./routes/users/userDashboardRoutes");
  const moduleRoutes = require("./routes/modules/moduleRoutes");
  const publicRoutes = require("./routes/publicRoutes");
  const feedbackRoutes = require("./routes/users/userFeedbacksRoutes");
  const certificatesRoutes = require("./routes/certificatesRoutes");
  const levelResultRoutes = require("./routes/modules/levelResultRoutes");
  const mediaUploadRoutes = require("./routes/modules/mediaUploadRoutes");
  const apiSecurityMiddleware = require("./middleware/apiSecurityMiddleware");

  // API Routes
  app.use("/api/public", publicRoutes);
  app.use("/api/certificates", certificatesRoutes);
  app.use("/api/admin", apiSecurityMiddleware, adminRoutes);
  app.use("/api/users", apiSecurityMiddleware, userRoutes);
  app.use("/api/user/dashboard", apiSecurityMiddleware, userDashboardRoutes);
  app.use("/api/modules", apiSecurityMiddleware, moduleRoutes);
  app.use("/api/feedbacks", apiSecurityMiddleware, feedbackRoutes);
  app.use("/api/modules", apiSecurityMiddleware, mediaUploadRoutes);
  app.use("/api/modules", apiSecurityMiddleware, levelResultRoutes);

  // 404 Catch-All Route
  app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  // Global Error Handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    require("./utils/logger").logError("global_unhandled_error", {
      message: err.message,
      stack: err.stack,
      route: req.originalUrl,
      method: req.method,
    });
    res.status(err.status || 500).json({
      error: "Internal Server Error",
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Something went wrong",
    });
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(
      `[BOOT] Server is running on port ${PORT} at ${new Date().toISOString()}`,
    );
  });
}

startServer();