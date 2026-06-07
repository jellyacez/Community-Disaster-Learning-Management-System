require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const { toNodeHandler } = require("better-auth/node");
const { auth } = require("./utils/auth");

const app = express();

// Configure CORS to allow credentials from Vite's default port
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  }),
);

// Mount Better-Auth BEFORE express.json() so it can read the raw request body
app.use("/api/auth", toNodeHandler(auth));

app.use(express.json());

// Sample API Route
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
