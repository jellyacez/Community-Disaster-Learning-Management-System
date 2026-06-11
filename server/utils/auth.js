const { betterAuth } = require("better-auth");
const pool = require("../config/db");
const { admin } = require("better-auth/plugins");

const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      barangay: {
        type: "string",
        required: true,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "resident",
      },
    },
  },
  plugins: [
    admin({
      defaultRole: "resident",
      adminRole: "system_admin",
      roles: {
        barangay_admin: {},
        MDRRMO_admin: {},
      },
    }),
  ],
  trustedOrigins: ["http://localhost:5173", "http://localhost:5174"],
  autoSignIn: true,
});

module.exports = { auth };
