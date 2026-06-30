const { betterAuth } = require("better-auth");
const pool = require("../config/db");
const { admin, twoFactor } = require("better-auth/plugins");
const { transporter } = require("./mailer");
const { APIError } = require("better-auth/api");
const {
  getResetPasswordEmail,
  getVerificationEmail,
  getPasswordChangedEmail,
  getOTPEmail,
} = require("./emailTemplates");
const { securityHooksPlugin } = require("./authHooks");


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
      twoFactorEnabled: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    },
  },
  appName: "Bacolor Disaster LMS Portal",
  plugins: [
    securityHooksPlugin(),
    admin({
      defaultRole: "resident",
      adminRole: "system_admin",
      roles: {
        barangay_admin: {},
        MDRRMO_admin: {},
      },
    }),
    twoFactor({
      otpOptions: {
        sendOTP: async ({ user, otp }, request) => {
          const mailOptions = getOTPEmail(user, otp);
          await transporter.sendMail(mailOptions);
        },
      },
    }),
  ],
  trustedOrigins: process.env.NODE_ENV === "production" && process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL] 
    : ["http://localhost:5173", "http://localhost:5174"],
  autoSignIn: true,
});

module.exports = { auth };
