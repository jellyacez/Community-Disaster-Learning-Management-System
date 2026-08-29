const emailWrapper = require("./emailWrapper");
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const getVerificationEmail = (user, token, orgFooterText, supportEmail) => ({
  from: `"DRRM Bacolor" <${supportEmail || process.env.EMAIL_USER}>`,
  to: user.email,
  subject: "Verify Your Email Address - DRRM Bacolor",
  html: emailWrapper(
    "Verify Your Email Address",
    `
    <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">Welcome to DRRM Bacolor, ${user.name}!</h2>
    <p style="line-height: 1.6; font-size: 15px; color: #52525b;">We're excited to have you on board. Please verify your email address to activate your account and gain full access to the system.</p>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="${FRONTEND_URL}/verify-email?token=${token}" style="background-color: #ef4444; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Verify Email Address</a>
    </div>

    <p style="margin-top: 25px; line-height: 1.6; font-size: 13px; color: #a1a1aa;">If you did not create this account, please ignore this email.</p>
    `,
    orgFooterText
  ),
});

module.exports = getVerificationEmail;
