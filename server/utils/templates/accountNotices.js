const emailWrapper = require("./emailWrapper");

// Reasons, names and module titles are typed by people, so escape before putting them in HTML
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

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

const contactLine = (supportEmail) =>
  `<p style="margin-top: 25px; line-height: 1.6; font-size: 14px; color: #52525b;">If you have questions or believe this was a mistake, contact <a href="mailto:${escapeHtml(supportEmail)}" style="color: #ef4444;">${escapeHtml(supportEmail)}</a>.</p>`;

const warningLine = (text) =>
  `<p style="margin-top: 25px; line-height: 1.6; font-size: 14px; color: #ef4444; font-weight: 600;">${text}</p>`;

// Each builder returns { subject, title, body } given the recipient and event details
const NOTICES = {
  banned: ({ reason, expiresAt }, supportEmail) => ({
    subject: "Your account has been suspended",
    title: "Account Suspended",
    body: `
      ${p("Your DRRM Bacolor account has been suspended by an administrator. You have been signed out of all devices.")}
      ${infoBox(`
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>
        <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Suspended until:</strong> ${expiresAt ? escapeHtml(new Date(expiresAt).toLocaleString()) : "Further notice"}</p>
      `)}
      ${contactLine(supportEmail)}`,
  }),

  unbanned: (_details, supportEmail) => ({
    subject: "Your account has been reinstated",
    title: "Account Reinstated",
    body: `
      ${p("Your DRRM Bacolor account suspension has been lifted. You can sign in again.")}
      ${contactLine(supportEmail)}`,
  }),

  archived: (_details, supportEmail) => ({
    subject: "Your account has been archived",
    title: "Account Archived",
    body: `
      ${p("Your DRRM Bacolor account has been archived by an administrator and you have been signed out. Your records are kept, but you cannot sign in until the account is restored.")}
      ${contactLine(supportEmail)}`,
  }),

  restored: (_details, supportEmail) => ({
    subject: "Your account has been restored",
    title: "Account Restored",
    body: `
      ${p("Your DRRM Bacolor account has been restored. You can sign in again.")}
      ${contactLine(supportEmail)}`,
  }),

  deleted: ({ byAdmin }, supportEmail) => ({
    subject: "Your account has been deleted",
    title: "Account Deleted",
    body: `
      ${p(byAdmin
        ? "Your DRRM Bacolor account has been permanently deleted by a system administrator."
        : "Your DRRM Bacolor account has been permanently deleted, as you requested.")}
      ${p("Your profile, sign-in details and learning progress were removed. Certificates you earned were kept in anonymized form so they can still be verified.")}
      ${byAdmin ? contactLine(supportEmail) : warningLine("If you did not request this, contact an administrator immediately.")}`,
  }),

  roleChanged: ({ fromRole, toRole }, supportEmail) => ({
    subject: "Your account role has changed",
    title: "Role Changed",
    body: `
      ${p("An administrator changed the role on your DRRM Bacolor account. You have been signed out so the new permissions take effect when you sign in again.")}
      ${infoBox(`
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;"><strong>Previous role:</strong> ${escapeHtml(formatRole(fromRole))}</p>
        <p style="margin: 0; font-size: 14px; color: #334155;"><strong>New role:</strong> ${escapeHtml(formatRole(toRole))}</p>
      `)}
      ${contactLine(supportEmail)}`,
  }),

  twoFactorEnabled: () => ({
    subject: "Security Alert: Two-factor authentication turned on",
    title: "Two-Factor Authentication On",
    body: `
      ${p("Two-factor authentication was turned on for your DRRM Bacolor account. You will be asked for a verification code when you sign in.")}
      ${warningLine("If you did not make this change, contact an administrator immediately.")}`,
  }),

  twoFactorDisabled: () => ({
    subject: "Security Alert: Two-factor authentication turned off",
    title: "Two-Factor Authentication Off",
    body: `
      ${p("Two-factor authentication was turned off for your DRRM Bacolor account. Signing in now only requires your password.")}
      ${warningLine("If you did not make this change, change your password and contact an administrator immediately.")}`,
  }),

  certificateRevoked: ({ moduleName, certRec, reason }, supportEmail) => ({
    subject: "Your certificate has been revoked",
    title: "Certificate Revoked",
    body: `
      ${p("An administrator revoked one of your DRRM Bacolor training certificates. It will no longer pass verification.")}
      ${infoBox(`
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;"><strong>Module:</strong> ${escapeHtml(moduleName)}</p>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;"><strong>Certificate No.:</strong> ${escapeHtml(certRec)}</p>
        <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>
      `)}
      ${p("You can earn a new certificate by retaking the module's final assessment.")}
      ${contactLine(supportEmail)}`,
  }),
};

const getAccountNoticeEmail = (kind, user, details, orgFooterText, supportEmail) => {
  const { subject, title, body } = NOTICES[kind](details || {}, supportEmail);
  return {
    from: `"DRRM Bacolor" <${supportEmail || process.env.EMAIL_USER}>`,
    to: user.email,
    subject,
    html: emailWrapper(
      title,
      `
      <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">${title}</h2>
      ${p(`Hello ${escapeHtml(user.name || "User")},`)}
      ${body}
      `,
      orgFooterText
    ),
  };
};

module.exports = { getAccountNoticeEmail };
