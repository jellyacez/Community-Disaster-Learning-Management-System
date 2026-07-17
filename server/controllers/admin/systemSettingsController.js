const pool = require("../../config/db");

// Allowlist of safe keys that are permitted to be returned to the frontend.
// Sensitive or future internal keys stored in system_settings are excluded by default.
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

// @desc    Get system settings (including maintenance mode)
// @access  Private (system_admin only)
exports.getSystemSettings = async (req, res) => {
  try {
    const result = await pool.query(`SELECT key, value FROM public.system_settings`);
    const settings = {};
    result.rows.forEach(row => {
      // Only expose keys on the safe allowlist — prevents accidental leak of
      // any sensitive keys added to system_settings in the future.
      if (SAFE_SETTINGS_KEYS.has(row.key)) {
        settings[row.key] = row.value;
      }
    });
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Update system branding (Name and Base64 Logo)
// @access  Private (system_admin only)
exports.updateSystemBranding = async (req, res) => {
  const { system_name, system_logo } = req.body;
  try {
    // Upsert System Name
    if (system_name) {
      await pool.query(
        `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('system_name', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [system_name]
      );
    }
    
    // Upsert System Logo (Hybrid Validation for AWS S3 and Base64)
    if (system_logo) {
      // 1. Check if it's a valid URL (e.g., AWS S3)
      const isUrl = /^(https?:\/\/)/.test(system_logo);
      let isValidLogo = isUrl;

      // 2. If not a URL, validate as Base64 image
      if (!isUrl) {
        const base64Match = system_logo.match(/^data:image\/(png|jpeg|webp|svg\+xml);base64,(.+)$/);
        if (!base64Match) {
          return res.status(400).json({ success: false, error: 'Invalid logo format. Must be a valid HTTPS URL or a Base64 image (PNG, JPG, WEBP, SVG).' });
        }
        
        // Size Validation: Calculate byte size (max 2MB)
        const base64Data = base64Match[2];
        const sizeInBytes = (base64Data.length * 3) / 4 - (base64Data.endsWith("==") ? 2 : (base64Data.endsWith("=") ? 1 : 0));
        if (sizeInBytes > 2 * 1024 * 1024) {
          return res.status(400).json({ success: false, error: 'Logo image is too large. Maximum size is 2MB.' });
        }
        isValidLogo = true;
      }

      if (isValidLogo) {
        await pool.query(
          `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('system_logo', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
          [system_logo]
        );
      }
    }
    
    require('../../utils/logger').logActivity(req.user.id, 'Updated system branding');
    res.json({ success: true, message: 'System branding updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update system branding' });
  }
};

// @desc    Toggle maintenance mode on/off
// @access  Private (system_admin only)
exports.setMaintenanceMode = async (req, res) => {
  const { enabled } = req.body;
  try {
    await pool.query(
      `INSERT INTO public.system_settings (key, value, updated_at)
       VALUES ('maintenance_mode', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [enabled ? 'true' : 'false']
    );
    
    require('../../utils/logger').logActivity(req.user.id, enabled ? 'Enabled maintenance mode' : 'Disabled maintenance mode');
    
    res.json({
      success: true,
      message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to toggle maintenance mode' });
  }
};

// @desc    Update system-wide broadcast override
// @access  Private (system_admin only)
exports.updateBroadcast = async (req, res) => {
  const { broadcast_message, broadcast_active, broadcast_severity } = req.body;
  try {
    await pool.query('BEGIN');
    
    if (broadcast_message !== undefined) {
      await pool.query(
        `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('broadcast_message', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [broadcast_message]
      );
    }
    
    if (broadcast_active !== undefined) {
      await pool.query(
        `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('broadcast_active', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [broadcast_active ? 'true' : 'false']
      );
    }

    if (broadcast_severity !== undefined) {
      await pool.query(
        `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('broadcast_severity', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [broadcast_severity]
      );
    }
    
    await pool.query('COMMIT');
    require('../../utils/logger').logActivity(req.user.id, 'Updated global broadcast settings');
    res.json({ success: true, message: 'Broadcast settings updated successfully' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update broadcast settings' });
  }
};

// @desc    Update organization details
// @access  Private (system_admin only)
exports.updateOrganizationDetails = async (req, res) => {
  const { support_email, org_footer_text } = req.body;
  try {
    await pool.query('BEGIN');
    
    if (support_email !== undefined) {
      await pool.query(
        `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('support_email', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [support_email]
      );
    }
    
    if (org_footer_text !== undefined) {
      await pool.query(
        `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('org_footer_text', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [org_footer_text]
      );
    }
    
    await pool.query('COMMIT');
    require('../../utils/logger').logActivity(req.user.id, 'Updated organization details');
    res.json({ success: true, message: 'Organization details updated successfully' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update organization details' });
  }
};
