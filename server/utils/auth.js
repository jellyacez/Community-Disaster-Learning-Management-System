const { betterAuth } = require("better-auth");
const pool = require("../config/db");
const { admin } = require("better-auth/plugins");
const { transporter } = require("./mailer");
const { APIError } = require("better-auth/api");
const {
  getResetPasswordEmail,
  getVerificationEmail,
  getPasswordChangedEmail,
} = require("./emailTemplates");

const passwordResetTokens = new Map();

const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disabled for development
    sendResetPassword: async ({ user, url, token }, request) => {
      passwordResetTokens.set(token, user.email);

      setTimeout(
        () => {
          if (passwordResetTokens.has(token)) {
            passwordResetTokens.delete(token);
          }
        },
        60 * 60 * 1000,
      );

      const mailOptions = getResetPasswordEmail(user, token);
      await transporter.sendMail(mailOptions);
    },
  },
  emailVerification: {
    sendOnSignUp: false, // Disabled for development
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }, request) => {
      const mailOptions = getVerificationEmail(user, token);
      await transporter.sendMail(mailOptions);
    },
  },
  user: {
    additionalFields: {
      barangay: {
        type: "string",
        required: true,
        defaultValue: "Unassigned",
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "resident",
      },
      archived: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      lastPasswordChange: {
        type: "date",
        required: false,
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

module.exports = { auth, passwordResetTokens };
