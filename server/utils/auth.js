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

const parseSecrets = () => {
  if (process.env.BETTER_AUTH_SECRETS) {
    return process.env.BETTER_AUTH_SECRETS.split(',').map(part => {
      const [version, value] = part.split(':');
      return { version: parseInt(version, 10), value };
    });
  }
  return undefined;
};

const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL,
  ...(process.env.BETTER_AUTH_SECRETS 
    ? { secrets: parseSecrets() } 
    : { secret: process.env.BETTER_AUTH_SECRET }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // Absolute expiration set to 7 days
    updateAge: 60 * 60 * 24, // Roll the session forward if active within 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60 // Cache for 5 minutes to reduce DB reads
    }
  },
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    requireEmailVerification: false, // Disabled for development
    passwordResetTokenExpiresIn: 15 * 60, // 15 minutes in seconds
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
        // SEC-008: Removed barangay_admin and MDRRMO_admin from here to strictly enforce 
        // row-level scoping in custom API routes instead of relying on the unscoped admin plugin.
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
  trustedOrigins:
    process.env.NODE_ENV === "production" && process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL]
      : ["http://localhost:5173", "http://localhost:5174"],
  autoSignIn: true,
});

module.exports = { auth };
