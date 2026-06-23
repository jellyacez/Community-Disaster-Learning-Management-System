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
      archived: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    },
  },
  plugins: [
    admin({
      defaultRole: "resident",
      adminRole: "system_admin",
    }),
  ],
  trustedOrigins: ["http://localhost:5173", "http://localhost:5174"],
  autoSignIn: true,
  onAPIError: {
    throw: false,
    onError: (error, ctx) => {
      console.log("BETTER AUTH API ERROR:", error, ctx.path);
    }
  }
});

module.exports = { auth };
