const emailWrapper = require("./emailWrapper");
const { withDefaults, envelope } = require("./sender");
const { escapeHtml } = require("./escape");

const formatRole = (role) =>
  String(role || "")
    .split("_")
    .map((w) => (w === "mdrrmo" ? "MDRRMO" : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

const p = (text) => `<p style="line-height: 1.6; font-size: 15px; color: #52525b;">${text}</p>`;

const infoBox = (text) => `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 25px 0;">
      ${text}
    </div>`;

// No support email set: point at the sending account, as before
const contactLine = (org) => {
  const email = org.supportEmail || process.env.EMAIL_USER;
  return `<p style="margin-top: 25px; line-height: 1.6; font-size: 14px; color: #52525b;">If you have questions or believe this was a mistake, contact <a href="mailto:${escapeHtml(email)}" style="color: #ef4444;">${escapeHtml(email)}</a>.</p>`;
};

const warningLine = (text) =>
  `<p style="margin-top: 25px; line-height: 1.6; font-size: 14px; color: #ef4444; font-weight: 600;">${text}</p>`;

// Each builder returns { subject, title, body } given the recipient and event details
const NOTICES = {
  banned: ({ reason, expiresAt }, org) => ({
    subject: "Your account has been suspended",
    title: "Account Suspended",
    body: `
      ${p(`Your ${escapeHtml(org.systemName)} account has been suspended by an administrator. You have been signed out of all devices.`)}
      ${infoBox(`
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>
        <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Suspended until:</strong> ${expiresAt ? escapeHtml(new Date(expiresAt).toLocaleString()) : "Further notice"}</p>
      `)}
      ${contactLine(org)}`,
  }),

  unbanned: (_details, org) => ({
    subject: "Your account has been reinstated",
    title: "Account Reinstated",
    body: `
      ${p(`Your ${escapeHtml(org.systemName)} account suspension has been lifted. You can sign in again.`)}
      ${contactLine(org)}`,
  }),

  archived: (_details, org) => ({
    subject: "Your account has been archived",
    title: "Account Archived",
    body: `
      ${p(`Your ${escapeHtml(org.systemName)} account has been archived by an administrator and you have been signed out. Your records are kept, but you cannot sign in until the account is restored.`)}
      ${contactLine(org)}`,
  }),

  restored: (_details, org) => ({
    subject: "Your account has been restored",
    title: "Account Restored",
    body: `
      ${p(`Your ${escapeHtml(org.systemName)} account has been restored. You can sign in again.`)}
      ${contactLine(org)}`,
  }),

  deleted: ({ byAdmin }, org) => ({
    subject: "Your account has been deleted",
    title: "Account Deleted",
    body: `
      ${p(byAdmin
        ? `Your ${escapeHtml(org.systemName)} account has been permanently deleted by a system administrator.`
        : `Your ${escapeHtml(org.systemName)} account has been permanently deleted, as you requested.`)}
      ${p("Your profile, sign-in details and learning progress were removed. Certificates you earned were kept in anonymized form so they can still be verified.")}
      ${byAdmin ? contactLine(org) : warningLine("If you did not request this, contact an administrator immediately.")}`,
  }),

  roleChanged: ({ fromRole, toRole }, org) => ({
    subject: "Your account role has changed",
    title: "Role Changed",
    body: `
      ${p(`An administrator changed the role on your ${escapeHtml(org.systemName)} account. You have been signed out so the new permissions take effect when you sign in again.`)}
      ${infoBox(`
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;"><strong>Previous role:</strong> ${escapeHtml(formatRole(fromRole))}</p>
        <p style="margin: 0; font-size: 14px; color: #334155;"><strong>New role:</strong> ${escapeHtml(formatRole(toRole))}</p>
      `)}
      ${contactLine(org)}`,
  }),

  twoFactorEnabled: (_details, org) => ({
    subject: "Security Alert: Two-factor authentication turned on",
    title: "Two-Factor Authentication On",
    body: `
      ${p(`Two-factor authentication was turned on for your ${escapeHtml(org.systemName)} account. You will be asked for a verification code when you sign in.`)}
      ${warningLine("If you did not make this change, contact an administrator immediately.")}`,
  }),

  twoFactorDisabled: (_details, org) => ({
    subject: "Security Alert: Two-factor authentication turned off",
    title: "Two-Factor Authentication Off",
    body: `
      ${p(`Two-factor authentication was turned off for your ${escapeHtml(org.systemName)} account. Signing in now only requires your password.`)}
      ${warningLine("If you did not make this change, change your password and contact an administrator immediately.")}`,
  }),
};

const getAccountNoticeEmail = (kind, user, details, orgSettings) => {
  const org = withDefaults(orgSettings);
  const { subject, title, body } = NOTICES[kind](details || {}, org);
  return {
    ...envelope(org),
    to: user.email,
    subject,
    html: emailWrapper(
      title,
      `
      <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">${title}</h2>
      ${p(`Hello ${escapeHtml(user.name || "User")},`)}
      ${body}
      `,
      org
    ),
  };
};

module.exports = { getAccountNoticeEmail };
