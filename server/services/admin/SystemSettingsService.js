const pool = require("../../config/db");
const { DEFAULT_SYSTEM_NAME } = require("../../config/constants");
const { validateSystemName, parseLogo } = require("../../utils/branding");

// The public branding read is hit by every page load; a save clears this
const BRANDING_TTL_MS = 60 * 1000;
let brandingCache = null;
// Bumped on every clear: a read that started before a save must not re-cache the old value
let brandingGeneration = 0;

const UPSERT = `INSERT INTO public.system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
               ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;

// Allowlist of safe keys that are permitted to be returned to the frontend.
// system_logo is left out on purpose: admin pages poll these settings every minute,
// so the logo (a base64 image) is served separately by getSystemLogo().
const SAFE_SETTINGS_KEYS = new Set([
  'maintenance_mode',
  'system_name',
  'broadcast_active',
  'broadcast_message',
  'broadcast_severity',
  'support_email',
  'org_footer_text',
]);

class SystemSettingsService {
  async getSystemSettings() {
    const result = await pool.query(`SELECT key, value FROM public.system_settings`);
    const settings = {};
    result.rows.forEach(row => {
      if (SAFE_SETTINGS_KEYS.has(row.key)) {
        settings[row.key] = row.value;
      }
    });
    return settings;
  }

  // Admin preview: the stored logo only if it would be served; logo_supported flags a legacy SVG/URL value
  async getSystemLogo() {
    const result = await pool.query(
      `SELECT value FROM public.system_settings WHERE key = 'system_logo'`
    );
    const stored = result.rows[0]?.value || null;
    const supported = !stored || !parseLogo(stored).error;
    return { system_logo: supported ? stored : null, logo_supported: supported };
  }

  // { name, version, logo: { contentType, bytes } | null }, validated on read
  async getBranding() {
    if (brandingCache && Date.now() - brandingCache.at < BRANDING_TTL_MS) return brandingCache.value;
    const generation = brandingGeneration;
    const { rows } = await pool.query(
      `SELECT key, value FROM public.system_settings WHERE key IN ('system_name', 'system_logo', 'branding_version')`
    );
    const raw = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const name = validateSystemName(raw.system_name ?? "");
    const logo = raw.system_logo ? parseLogo(raw.system_logo) : null;
    const version = Number.parseInt(raw.branding_version, 10);
    const value = {
      name: name.error ? DEFAULT_SYSTEM_NAME : name.value,
      version: Number.isInteger(version) && version > 0 ? version : 1,
      logo: logo && !logo.error ? { contentType: logo.contentType, bytes: logo.bytes } : null,
    };
    if (generation === brandingGeneration) brandingCache = { at: Date.now(), value };
    return value;
  }

  clearBrandingCache() {
    brandingGeneration += 1;
    brandingCache = null;
  }

  // Values are already validated. Returns the new branding_version.
  async updateSystemBranding({ name, logo, removeLogo }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (name !== undefined) await client.query(UPSERT, ["system_name", name]);
      if (logo !== undefined) await client.query(UPSERT, ["system_logo", logo]);
      if (removeLogo) await client.query(`DELETE FROM public.system_settings WHERE key = 'system_logo'`);
      const { rows } = await client.query(
        `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('branding_version', '2', NOW())
         ON CONFLICT (key) DO UPDATE
           SET value = (CASE WHEN system_settings.value ~ '^[0-9]{1,9}$' THEN system_settings.value::int ELSE 1 END + 1)::text,
               updated_at = NOW()
         RETURNING value`
      );
      await client.query("COMMIT");
      this.clearBrandingCache();
      return Number(rows[0].value);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async setMaintenanceMode(enabled) {
    await pool.query(
      `INSERT INTO public.system_settings (key, value, updated_at)
       VALUES ('maintenance_mode', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [enabled ? 'true' : 'false']
    );
  }

  async updateBroadcast(broadcast_message, broadcast_active, broadcast_severity) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      if (broadcast_message !== undefined) {
        await client.query(
          `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('broadcast_message', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
          [broadcast_message]
        );
      }
      
      if (broadcast_active !== undefined) {
        await client.query(
          `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('broadcast_active', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
          [broadcast_active ? 'true' : 'false']
        );
      }

      if (broadcast_severity !== undefined) {
        await client.query(
          `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('broadcast_severity', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
          [broadcast_severity]
        );
      }

      const { rows } = await client.query(
        `SELECT key, value FROM public.system_settings WHERE key IN ('broadcast_active', 'broadcast_message', 'broadcast_severity')`
      );

      await client.query('COMMIT');

      const state = { active: false, message: '', severity: 'warning' };
      rows.forEach(row => {
        if (row.key === 'broadcast_active') state.active = row.value === 'true';
        if (row.key === 'broadcast_message') state.message = row.value;
        if (row.key === 'broadcast_severity') state.severity = row.value || 'warning';
      });
      return state;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateOrganizationDetails(support_email, org_footer_text) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      if (support_email !== undefined) {
        await client.query(
          `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('support_email', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
          [support_email]
        );
      }
      
      if (org_footer_text !== undefined) {
        await client.query(
          `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('org_footer_text', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
          [org_footer_text]
        );
      }
      
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new SystemSettingsService();
