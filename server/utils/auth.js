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
const { isMfaEnforced } = require("../config/permissions");

const parseSecrets = () => {
  if (process.env.BETTER_AUTH_SECRETS) {
    return process.env.BETTER_AUTH_SECRETS.split(",").map((part) => {
      const [version, value] = part.split(":");
      return { version: parseInt(version, 10), value };
    });
  }
  return undefined;
};

const isGoogleAuthValid = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  !process.env.GOOGLE_CLIENT_ID.includes("YOUR_CLIENT_ID"),
);

const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL,
  ...(process.env.BETTER_AUTH_SECRETS ? { secrets: parseSecrets() } : {}),
  ...(process.env.BETTER_AUTH_SECRET
    ? { secret: process.env.BETTER_AUTH_SECRET }
    : {}),

  // without valid keys better-auth crashes with CLIENT_ID_AND_SECRET_REQUIRED
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

  // map better-auth's camelCase fields to our snake_case columns
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
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24, // Roll the session forward if active within 24 hours
    cookieCache: {
      enabled: false, // off so a global force logout takes effect immediately
      maxAge: 5 * 60,
    },
  },
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    requireEmailVerification: false, // Disabled for development
    passwordResetTokenExpiresIn: 15 * 60,
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
      // Nullable for existing accounts and Google sign-in. Email signup is
      // validated by securityHooksPlugin before creating the account.
      first_name: { type: "string", required: false, input: true },
      middle_name: { type: "string", required: false, input: true },
      last_name: { type: "string", required: false, input: true },
      barangay_id: {
        type: "number",
        required: false,
        input: false,
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
        input: false,
      },
      lastPasswordChange: {
        type: "date",
        required: false,
        input: false,
      },
      twoFactorEnabled: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  appName: "Bacolor Disaster LMS Portal",
  plugins: [
    securityHooksPlugin(),
    admin({
      defaultRole: "resident",
      adminRole: "super_admin",
      roles: {
        super_admin: {},
        system_admin: {},
        head_mdrrmo_admin: {},
        mdrrmo_admin: {},
        barangay_admin: {},
        resident: {},
      },
    }),
    // Registered only with MFA_ENABLED=true, so the 2FA endpoints and sign-in challenge follow the same flag
    ...(isMfaEnforced()
      ? [
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
        ]
      : []),
  ],
  advanced: {
    ...(process.env.NODE_ENV === "production"
      ? {
          useSecureCookies: false,
          cookiePrefix: "__Host-better-auth",
          defaultCookieAttributes: {
            secure: true,
            path: "/",
            sameSite: "lax",
            httpOnly: true,
          },
        }
      : {}),

    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for"],
    },
  },
  trustedOrigins: (() => {
    if (process.env.NODE_ENV === "production") {
      if (!process.env.FRONTEND_URL) {
        throw new Error("FATAL: FRONTEND_URL is required in production mode.");
      }
      return [process.env.FRONTEND_URL];
    }
    return [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:4173",
    ];
  })(),
  autoSignIn: true,
});


module.exports = { auth };
