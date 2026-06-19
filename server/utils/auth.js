const { betterAuth } = require("better-auth");
const pool = require("../config/db");
const { admin } = require("better-auth/plugins");
const { transporter } = require("./mailer");

const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }, request) => {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Verify your Email Address",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Welcome to DRRM Bacolor, ${user.name}!</h2>
              <p>Please click the button below to verify your email address and activate your account.</p>
              <a href="http://localhost:5173/verify-email?token=${token}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
                Verify Email
              </a>
              <p style="margin-top: 20px; color: #666; font-size: 12px;">
                If you did not create this account, please ignore this email.
              </p>
            </div>
          `,
      };
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
  trustedOrigins: ["http://localhost:5173", "http://localhost:5174"],
  autoSignIn: true,
});

module.exports = { auth };
