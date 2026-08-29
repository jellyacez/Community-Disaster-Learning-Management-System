const emailWrapper = require("./emailWrapper");
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const getAdminPasswordResetEmail = (user, newPassword, orgFooterText, supportEmail) => ({
  from: `"DRRM Bacolor Security" <${supportEmail || process.env.EMAIL_USER}>`,
  to: user.email,
  subject: "Important: Your Password Has Been Reset by an Administrator",
  html: emailWrapper(
    "Password Reset",
    `
    <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">Hello ${user.name || "User"},</h2>
    <p style="line-height: 1.6; font-size: 15px; color: #52525b;">An administrator has securely reset the password for your DRRM Bacolor account.</p>
    
    <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">Your new temporary password is:</p>
      <span style="font-size: 24px; font-weight: 700; font-family: monospace; color: #ef4444; letter-spacing: 2px;">
        ${newPassword}
      </span>
    </div>

    <p style="line-height: 1.6; font-size: 14px; color: #52525b;">For your security, please log in and change this password immediately from your account settings.</p>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="${FRONTEND_URL}/signin" style="background-color: #ef4444; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Log In Now</a>
    </div>
    `,
    orgFooterText
  ),
});

module.exports = getAdminPasswordResetEmail;
