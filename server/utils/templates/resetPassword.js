const emailWrapper = require("./emailWrapper");
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const getResetPasswordEmail = (user, token, orgFooterText, supportEmail) => ({
  from: `"DRRM Bacolor Security" <${supportEmail || process.env.EMAIL_USER}>`,
  to: user.email,
  subject: "Reset Your Password - DRRM Bacolor",
  html: emailWrapper(
    "Reset Your Password",
    `
    <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">Hello, ${user.name}!</h2>
    <p style="line-height: 1.6; font-size: 15px; color: #52525b;">You recently requested to reset the password for your DRRM Bacolor account. Click the button below to securely reset it.</p>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="${FRONTEND_URL}/reset-password?token=${token}" style="background-color: #ef4444; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Reset Password</a>
    </div>

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-top: 30px; border-radius: 0 6px 6px 0;">
      <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">For your security, this link will automatically expire in 15 minutes.</p>
    </div>

    <p style="margin-top: 25px; line-height: 1.6; font-size: 13px; color: #a1a1aa;">If you did not request a password reset, please ignore this email or contact your administrator immediately.</p>
    `,
    orgFooterText
  ),
});

module.exports = getResetPasswordEmail;
