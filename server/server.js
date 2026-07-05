require("dotenv").config();

// Check if required env variables are present
const requiredEnvVars = ["DB_USER", "DB_PASSWORD", "DB_DATABASE", "BETTER_AUTH_SECRET"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`\x1b[31m[FATAL ERROR] Missing critical environment variables: ${missingEnvVars.join(", ")}\x1b[0m`);
  console.error("The server will not start. Please check your .env file.");
  process.exit(1);
}

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const hpp = require("hpp");
const pool = require("./config/db");
const { toNodeHandler } = require("better-auth/node");
const { auth } = require("./utils/auth");
const { authRateLimiter, globalLimiter } = require("./middleware/rateLimiters");
const { startLogRetentionCron } = require("./utils/logRetention");

const app = express();

// Start background cron jobs
startLogRetentionCron();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(express.json({ limit: "500kb" }));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        mediaSrc: ["'self'", "https:"], // Allow HTML5 <video> from AWS S3
        frameSrc: ["'self'"], // Removed youtube and vimeo
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
    origin: process.env.NODE_ENV === "production" 
      ? [process.env.FRONTEND_URL]
      : [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:5174"].filter(Boolean),
    credentials: true,
  }),
);

app.use(hpp());
app.use(globalLimiter);

const maintenanceMiddleware = require("./middleware/maintenanceMiddleware");
app.use(maintenanceMiddleware);

const customAuthRoutes = require("./routes/auth/authRoutes");
app.use("/api/auth", authRateLimiter);
app.use("/api/auth", customAuthRoutes);
app.use("/api/auth", toNodeHandler(auth));

// Import routes
const adminRoutes = require("./routes/admin/adminRoutes");
const userRoutes = require("./routes/users/userRoutes");
const userDashboardRoutes = require("./routes/users/userDashboardRoutes");
const moduleRoutes = require("./routes/modules/moduleRoutes");

const levelCreationRoute = require("./routes/modules/levelCreationRoute");
const levelQuestionAndChoicesRoutes = require("./routes/modules/levelQuestionAndChoicesRoutes");
const levelResultRoutes = require("./routes/modules/levelResultRoutes");
const moduleCompleteRoutes = require("./routes/modules/moduleCompleteRoutes");
const moduleStepsRoutes = require("./routes/modules/moduleStepsRoutes");
const apiSecurityMiddleware = require("./middleware/apiSecurityMiddleware");

// API Routes (Business logic protected by security middleware)
app.use("/api/admin", apiSecurityMiddleware, adminRoutes);
app.use("/api/users", apiSecurityMiddleware, userRoutes);
app.use("/api/user/dashboard", apiSecurityMiddleware, userDashboardRoutes);
app.use("/api/modules", apiSecurityMiddleware, moduleRoutes);

app.use("/api/modules", apiSecurityMiddleware, levelCreationRoute);
app.use("/api/modules", apiSecurityMiddleware, levelQuestionAndChoicesRoutes);
app.use("/api/modules", apiSecurityMiddleware, levelResultRoutes);
app.use("/api/modules", apiSecurityMiddleware, moduleCompleteRoutes);
app.use("/api/modules", apiSecurityMiddleware, moduleStepsRoutes);

// 404 Catch-All Route
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong"
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
