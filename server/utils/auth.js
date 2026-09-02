const { betterAuth } = require("better-auth");
const pool = require("../config/db");
const { admin, twoFactor } = require("better-auth/plugins");
const { transporter } = require("./mailer");

const {
  getResetPasswordEmail,
  getVerificationEmail,
  getOTPEmail,
} = require("./emailTemplates");
const { securityHooksPlugin } = require("./authHooks");
const { getOrgSettings } = require("./settings");

const parseSecrets = () => {
  if (process.env.BETTER_AUTH_SECRETS) {
    return process.env.BETTER_AUTH_SECRETS.split(",").map((part) => {
      const [version, value] = part.split(":");
      return { version: parseInt(version, 10), value };
    });
  }
  return undefined;
};

// Check if valid Google OAuth keys exist before mounting the provider
const isGoogleAuthValid = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  !process.env.GOOGLE_CLIENT_ID.includes("YOUR_CLIENT_ID")
);

const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL,
  ...(process.env.BETTER_AUTH_SECRETS ? { secrets: parseSecrets() } : {}),
  ...(process.env.BETTER_AUTH_SECRET
    ? { secret: process.env.BETTER_AUTH_SECRET }
    : {}),

  // 1. Google OAuth Guard to prevent CLIENT_ID_AND_SECRET_REQUIRED crash
  socialProviders: {
    ...(isGoogleAuthValid
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },

  // 2. Map camelCase queries to PostgreSQL snake_case schema columns
  schema: {
    session: {
      fields: {
        userId: "user_id",
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
      },
    },
    user: {
      fields: {
        emailVerified: "email_verified",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    account: {
      fields: {
        userId: "user_id",
        accountId: "account_id",
        providerId: "provider_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    verification: {
      fields: {
        createdAt: "created_at",
        updatedAt: "updated_at",
        expiresAt: "expires_at",
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // Absolute expiration set to 7 days
    updateAge: 60 * 60 * 24, // Roll the session forward if active within 24 hours
    cookieCache: {
      enabled: false, // Disabled to ensure instant session invalidation for Global Force Logout
      maxAge: 5 * 60,
    },
  },
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    requireEmailVerification: false, // Disabled for development
    passwordResetTokenExpiresIn: 15 * 60, // 15 minutes in seconds
    sendResetPassword: async ({ user, token }) => {
      const { orgFooterText, supportEmail } = await getOrgSettings();
      const mailOptions = getResetPasswordEmail(
        user,
        token,
        orgFooterText,
        supportEmail,
      );
      await transporter.sendMail(mailOptions);
    },
  },
  emailVerification: {
    sendOnSignUp: false, // Disabled for development
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, token }) => {
      const { orgFooterText, supportEmail } = await getOrgSettings();
      const mailOptions = getVerificationEmail(
        user,
        token,
        orgFooterText,
        supportEmail,
      );
      await transporter.sendMail(mailOptions);
    },
  },
  user: {
    additionalFields: {
      barangay_id: {
        type: "number",
        required: false,
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
        mdrrmo_admin: {},
      },
    }),
    twoFactor({
      otpOptions: {
        sendOTP: async ({ user, otp }) => {
          const { orgFooterText, supportEmail } = await getOrgSettings();
          const mailOptions = getOTPEmail(
            user,
            otp,
            orgFooterText,
            supportEmail,
          );
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