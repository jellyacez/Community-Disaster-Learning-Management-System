require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const { toNodeHandler } = require("better-auth/node");
const { auth } = require("./utils/auth");

const app = express();
app.use(cors());
app.use(express.json());

// Better Auth Middleware for all /api/auth/* routes
app.all("/api/auth/*", toNodeHandler(auth));

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
