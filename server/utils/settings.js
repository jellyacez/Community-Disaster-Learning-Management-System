const pool = require("../config/db");

async function getOrgSettings() {
  try {
    const result = await pool.query(`SELECT key, value FROM public.system_settings WHERE key IN ('org_footer_text', 'support_email')`);
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    return {
      orgFooterText: settings.org_footer_text || "Community DRRM System - Bacolor, Pampanga.",
      supportEmail: settings.support_email || process.env.EMAIL_USER
    };
  } catch (error) {
    console.error("Failed to fetch org settings for email:", error);
    return {
      orgFooterText: "Community DRRM System - Bacolor, Pampanga.",
      supportEmail: process.env.EMAIL_USER
    };
  }
}

module.exports = { getOrgSettings };
