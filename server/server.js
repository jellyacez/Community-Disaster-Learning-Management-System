require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const hpp = require("hpp");
const pool = require("./config/db");
const { toNodeHandler } = require("better-auth/node");
const { auth } = require("./utils/auth");
const { authRateLimiter, globalLimiter } = require("./middleware/rateLimiters");

const app = express();

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
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  }),
);

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:5174",
    ],
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

const apiSecurityMiddleware = require("./middleware/apiSecurityMiddleware");

// API Routes (Business logic protected by security middleware)
app.use("/api/admin", apiSecurityMiddleware, adminRoutes);
app.use("/api/users", apiSecurityMiddleware, userRoutes);
app.use("/api/user/dashboard", apiSecurityMiddleware, userDashboardRoutes);
app.use("/api/modules", apiSecurityMiddleware, moduleRoutes);

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
