const emailWrapper = require("./emailWrapper");
const { withDefaults, envelope } = require("./sender");
const { escapeHtml } = require("./escape");
const { normalizeUserAgent } = require("../userAgent");

const getPasswordChangedEmail = (user, orgSettings) => {
  const org = withDefaults(orgSettings);
  return {
  ...envelope(org, "Security"),
  to: user.email,
  subject: "Security Alert: Password Changed",
  html: emailWrapper(
    "Password Changed",
    `
    <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">Security Alert</h2>
    <p style="line-height: 1.6; font-size: 15px; color: #52525b;">Hello ${escapeHtml(user.name || "User")},</p>
    <p style="line-height: 1.6; font-size: 15px; color: #52525b;">Your password for your ${escapeHtml(org.systemName)} account was recently changed successfully.</p>
    
    <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; margin-top: 25px; border-radius: 0 6px 6px 0;">
      <p style="margin: 0; color: #1e3a8a; font-size: 14px;">If you made this change, you can safely ignore this email.</p>
    </div>

    <p style="margin-top: 25px; line-height: 1.6; font-size: 14px; color: #ef4444; font-weight: 600;">If you did not request this change, please contact an administrator immediately.</p>
    `,
    org
  ),
  };
};

const OS_LABELS = {
  ios: "iPhone/iPad",
  android: "Android device",
  windows: "Windows PC",
  chromeos: "Chromebook",
  macos: "Mac",
  linux: "Linux PC",
  other: "unknown device",
};
const BROWSER_LABELS = {
  edge: "Edge",
  opera: "Opera",
  samsung: "Samsung Internet",
  firefox: "Firefox",
  chrome: "Chrome",
  safari: "Safari",
};

// Same parsing as session binding and user_known_devices. iPads in desktop mode send a Mac UA and read as "Mac".
const describeDevice = (userAgent) => {
  const ua = normalizeUserAgent(userAgent);
  if (!ua) return "Unknown device";
  return `${BROWSER_LABELS[ua.family] || "Unknown browser"} on ${OS_LABELS[ua.os]}`;
};

const getNewDeviceLoginEmail = (user, session, orgSettings) => {
  const org = withDefaults(orgSettings);
  const deviceName = describeDevice(session.userAgent);

  return {
    ...envelope(org, "Security"),
    to: user.email,
    subject: "Security Alert: New Login Detected",
    html: emailWrapper(
      "New Login Detected",
      `
      <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">New Login Detected</h2>
      <p style="line-height: 1.6; font-size: 15px; color: #52525b;">Hello ${escapeHtml(user.name)},</p>
      <p style="line-height: 1.6; font-size: 15px; color: #52525b;">We noticed a new login to your account from a device we haven't seen you use recently.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;"><strong>Device/Browser:</strong> ${escapeHtml(deviceName)}</p>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;"><strong>IP Address:</strong> ${escapeHtml(session.ipAddress || "Hidden")}</p>
        <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Time:</strong> ${escapeHtml(new Date(session.createdAt).toLocaleString())}</p>
      </div>

      <p style="line-height: 1.6; font-size: 14px; color: #52525b;">If this was you, you can safely ignore this email.</p>
      <p style="margin-top: 15px; line-height: 1.6; font-size: 14px; color: #ef4444; font-weight: 600;">If this wasn't you, please log in immediately, go to your Settings > Active Devices to sign out the unrecognized device, and then change your password.</p>
      `,
      org
    ),
  };
};

const getPasswordRecoveredEmail = (user, orgSettings) => {
  const org = withDefaults(orgSettings);
  return {
  ...envelope(org, "Security"),
  to: user.email,
  subject: "Security Alert: Account Recovered",
  html: emailWrapper(
    "Account Recovered",
    `
    <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">Account Recovered</h2>
    <p style="line-height: 1.6; font-size: 15px; color: #52525b;">Hello ${escapeHtml(user.name || "User")},</p>
    <p style="line-height: 1.6; font-size: 15px; color: #52525b;">Your password was just successfully reset using the "Forgot Password" email link.</p>
    
    <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; margin-top: 25px; border-radius: 0 6px 6px 0;">
      <p style="margin: 0; color: #1e3a8a; font-size: 14px;">For your security, <strong>we have automatically signed out all other devices</strong> currently logged into your account. You will need to log back in using your new password.</p>
    </div>

    <p style="margin-top: 25px; line-height: 1.6; font-size: 14px; color: #ef4444; font-weight: 600;">If you did not request this recovery, please contact a DRRM Administrator immediately as your email inbox may be compromised.</p>
    `,
    org
  ),
  };
};

module.exports = {
  getPasswordChangedEmail,
  getNewDeviceLoginEmail,
  getPasswordRecoveredEmail,
};
