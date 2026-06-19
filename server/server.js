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

app.set("trust proxy", 1);

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  }),
);

app.use("/api/auth", authRateLimiter, toNodeHandler(auth));

app.use(helmet());
app.use(express.json({ limit: "500kb" }));
app.use(hpp());

app.use(globalLimiter);

// Import routes
const adminController = require("./controllers/adminController");
const userController = require("./controllers/getUserController");
const userDashboardController = require("./controllers/userDashboardController");

// API Routes
app.use("/api/admin", adminController);
app.use("/api/users", userController);
app.use("/api/user/dashboard", userDashboardController);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
