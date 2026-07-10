const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Shared Email Wrapper for consistent, premium aesthetics
const emailWrapper = (title, content, orgFooterText = "Community DRRM System - Bacolor, Pampanga.") => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px; color: #3f3f46;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
    <!-- Header -->
    <div style="background-color: #18181b; padding: 30px; text-align: center; border-bottom: 4px solid #ef4444;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">DRRM <span style="color: #ef4444;">Bacolor</span></h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="background-color: #fafafa; padding: 20px 30px; text-align: center; border-top: 1px solid #e4e4e7;">
      <p style="margin: 0; font-size: 13px; color: #71717a;">
        &copy; ${new Date().getFullYear()} ${orgFooterText}
      </p>
      <p style="margin: 5px 0 0; font-size: 12px; color: #a1a1aa;">
        This is an automated security message. Please do not reply directly to this email.
      </p>
    </div>
  </div>
</body>
</html>
`;

// SECURITY NOTE FOR PANEL:
// Tokens passed in the URL below are short-lived (15 minutes) and one-time-use only.
// They are invalidated immediately upon successful reset to mitigate browser history/server log leak risks.
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

// SECURITY NOTE FOR PANEL:
// Similar to password resets, verification tokens in this URL are short-lived and one-time-use.
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

const getPasswordChangedEmail = (user, orgFooterText, supportEmail) => ({
  from: `"DRRM Bacolor Security" <${supportEmail || process.env.EMAIL_USER}>`,
  to: user.email,
  subject: "Security Alert: Password Changed",
  html: emailWrapper(
    "Password Changed",
    `
    <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">Security Alert</h2>
    <p style="line-height: 1.6; font-size: 15px; color: #52525b;">Hello ${user.name || "User"},</p>
    <p style="line-height: 1.6; font-size: 15px; color: #52525b;">Your password for your DRRM Bacolor account was recently changed successfully.</p>
    
    <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; margin-top: 25px; border-radius: 0 6px 6px 0;">
      <p style="margin: 0; color: #1e3a8a; font-size: 14px;">If you made this change, you can safely ignore this email.</p>
    </div>

    <p style="margin-top: 25px; line-height: 1.6; font-size: 14px; color: #ef4444; font-weight: 600;">If you did not request this change, please contact an administrator immediately.</p>
    `,
    orgFooterText
  ),
});

const getNewDeviceLoginEmail = (user, session, orgFooterText, supportEmail) => {
  const deviceName = session.userAgent.includes("Windows")
    ? "Windows PC"
    : session.userAgent.includes("Mac")
      ? "Mac/Apple Device"
      : session.userAgent.includes("iPhone")
        ? "iPhone"
        : session.userAgent.includes("Android")
          ? "Android Device"
          : "Unknown Device";

  return {
    from: `"DRRM Bacolor Security" <${supportEmail || process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Security Alert: New Login Detected",
    html: emailWrapper(
      "New Login Detected",
      `
      <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">New Login Detected</h2>
      <p style="line-height: 1.6; font-size: 15px; color: #52525b;">Hello ${user.name},</p>
      <p style="line-height: 1.6; font-size: 15px; color: #52525b;">We noticed a new login to your account from a device we haven't seen you use recently.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;"><strong>Device/Browser:</strong> ${deviceName} (${session.userAgent.split(" ")[0]})</p>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;"><strong>IP Address:</strong> ${session.ipAddress || "Hidden"}</p>
        <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Time:</strong> ${new Date(session.createdAt).toLocaleString()}</p>
      </div>

      <p style="line-height: 1.6; font-size: 14px; color: #52525b;">If this was you, you can safely ignore this email.</p>
      <p style="margin-top: 15px; line-height: 1.6; font-size: 14px; color: #ef4444; font-weight: 600;">If this wasn't you, please log in immediately, go to your Settings > Active Devices to sign out the unrecognized device, and then change your password.</p>
      `,
      orgFooterText
    ),
  };
};

const getPasswordRecoveredEmail = (user, orgFooterText, supportEmail) => ({
  from: `"DRRM Bacolor Security" <${supportEmail || process.env.EMAIL_USER}>`,
  to: user.email,
  subject: "Security Alert: Account Recovered",
  html: emailWrapper(
    "Account Recovered",
    `
    <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">Account Recovered</h2>
    <p style="line-height: 1.6; font-size: 15px; color: #52525b;">Hello ${user.name || "User"},</p>
    <p style="line-height: 1.6; font-size: 15px; color: #52525b;">Your password was just successfully reset using the "Forgot Password" email link.</p>
    
    <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; margin-top: 25px; border-radius: 0 6px 6px 0;">
      <p style="margin: 0; color: #1e3a8a; font-size: 14px;">For your security, <strong>we have automatically signed out all other devices</strong> currently logged into your account. You will need to log back in using your new password.</p>
    </div>

    <p style="margin-top: 25px; line-height: 1.6; font-size: 14px; color: #ef4444; font-weight: 600;">If you did not request this recovery, please contact a DRRM Administrator immediately as your email inbox may be compromised.</p>
    `,
    orgFooterText
  ),
});

const getOTPEmail = (user, otp, orgFooterText, supportEmail) => ({
  from: `"DRRM Bacolor Security" <${supportEmail || process.env.EMAIL_USER}>`,
  to: user.email,
  subject: "Your Two-Factor Authentication Code",
  html: emailWrapper(
    "Authentication Code",
    `
    <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">Hello, ${user.name}!</h2>
    <p style="line-height: 1.6; font-size: 15px; color: #52525b;">Here is your One-Time Password (OTP) for Two-Factor Authentication:</p>
    
    <div style="text-align: center; margin: 35px 0;">
      <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ef4444; background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px 30px; border-radius: 8px; display: inline-block;">
        ${otp}
      </span>
    </div>

    <p style="line-height: 1.6; font-size: 14px; color: #52525b;">This code will expire shortly. Do not share this code with anyone, including DRRM administrators.</p>
    `,
    orgFooterText
  ),
});

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

module.exports = {
  getResetPasswordEmail,
  getVerificationEmail,
  getPasswordChangedEmail,
  getNewDeviceLoginEmail,
  getPasswordRecoveredEmail,
  getOTPEmail,
  getAdminPasswordResetEmail,
};
