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
  cors({
    origin: [process.env.FRONTEND_URL || "http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  }),
);

app.use(helmet());
app.use(hpp());
app.use(globalLimiter);

const customAuthRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRateLimiter);
app.use("/api/auth", customAuthRoutes);
app.use("/api/auth", toNodeHandler(auth));

// Import routes
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const userDashboardRoutes = require("./routes/userDashboardRoutes");

// API Routes
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/user/dashboard", userDashboardRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
