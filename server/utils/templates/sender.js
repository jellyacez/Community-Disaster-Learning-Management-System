const { DEFAULT_SYSTEM_NAME, DEFAULT_ORG_FOOTER } = require("../../config/constants");

// Fills defaults so a template called without org settings still renders
const withDefaults = (org = {}) => ({
  systemName: org.systemName || DEFAULT_SYSTEM_NAME,
  orgFooterText: org.orgFooterText || DEFAULT_ORG_FOOTER,
  supportEmail: org.supportEmail || null,
});

// From is always the authenticated account (SPF/DMARC); the support email is only Reply-To.
// An address object lets nodemailer encode the display name, so it can't inject a header.
const envelope = (org, suffix) => {
  const sender = String(process.env.EMAIL_USER || "");
  const replyTo =
    org.supportEmail && org.supportEmail.toLowerCase() !== sender.toLowerCase() ? { replyTo: org.supportEmail } : {};
  return {
    from: { name: suffix ? `${org.systemName} ${suffix}` : org.systemName, address: sender },
    ...replyTo,
  };
};

module.exports = { withDefaults, envelope };
