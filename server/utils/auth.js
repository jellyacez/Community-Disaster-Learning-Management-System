const { betterAuth } = require("better-auth");
const pool = require("../config/db");
const { admin } = require("better-auth/plugins");
const { transporter } = require("./mailer");
const { passwordChangeNotificationHook } = require("./authHooks");
const {
  getResetPasswordEmail,
  getVerificationEmail,
  getPasswordChangedEmail,
} = require("./emailTemplates");

const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      const mailOptions = getResetPasswordEmail(user, token);
      await transporter.sendMail(mailOptions);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
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
  hooks: {
    after: passwordChangeNotificationHook,
  },
  trustedOrigins: ["http://localhost:5173", "http://localhost:5174"],
  autoSignIn: true,
});

module.exports = { auth };
