const pool = require("../../config/db");

// Allowlist of safe keys that are permitted to be returned to the frontend.
const SAFE_SETTINGS_KEYS = new Set([
  'maintenance_mode',
  'system_name',
  'system_logo',
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

  async updateSystemBranding(system_name, system_logo) {
    if (system_name) {
      await pool.query(
        `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('system_name', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [system_name]
      );
    }
    
    if (system_logo) {
      await pool.query(
        `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('system_logo', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [system_logo]
      );
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
      
      await client.query('COMMIT');
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
