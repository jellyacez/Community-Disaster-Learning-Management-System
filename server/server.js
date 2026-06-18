require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const pool = require("./config/db");
const { toNodeHandler } = require("better-auth/node");
const { auth } = require("./utils/auth");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  }),
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: "Too many login attempts from this IP, please try again later.",
  },
});

app.use("/api/auth", authLimiter, toNodeHandler(auth));

app.use(helmet());
app.use(express.json({ limit: "500kb" }));
app.use(hpp());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests from this IP, please try again later." },
});
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
