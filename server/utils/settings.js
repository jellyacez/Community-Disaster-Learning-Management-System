const pool = require("../config/db");
const { DEFAULT_SYSTEM_NAME, DEFAULT_ORG_FOOTER } = require("../config/constants");
const { validateSystemName, validateSupportEmail, validateOrgFooter } = require("./branding");

// Org settings for outgoing email. Stored values are re-checked: one that fails today's rules falls back.
async function getOrgSettings() {
  try {
    const result = await pool.query(
      `SELECT key, value FROM public.system_settings WHERE key IN ('system_name', 'org_footer_text', 'support_email')`
    );
    const settings = Object.fromEntries(result.rows.map((row) => [row.key, row.value]));
    const name = validateSystemName(settings.system_name ?? "");
    const footer = validateOrgFooter(settings.org_footer_text ?? "");
    const email = validateSupportEmail(settings.support_email ?? "");
    return {
      systemName: name.error ? DEFAULT_SYSTEM_NAME : name.value,
      orgFooterText: footer.error || !footer.value ? DEFAULT_ORG_FOOTER : footer.value,
      supportEmail: email.error || !email.value ? null : email.value,
    };
  } catch (error) {
    console.error("Failed to fetch org settings for email:", error);
    return { systemName: DEFAULT_SYSTEM_NAME, orgFooterText: DEFAULT_ORG_FOOTER, supportEmail: null };
  }
}

module.exports = { getOrgSettings };
