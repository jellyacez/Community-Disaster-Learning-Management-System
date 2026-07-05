const pool = require("../../config/db");

// @desc    Get system settings (including maintenance mode)
// @access  Private (system_admin only)
exports.getSystemSettings = async (req, res) => {
  try {
    const result = await pool.query(`SELECT key, value FROM public.system_settings`);
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    // Also return runtime info
    settings.node_env = process.env.NODE_ENV || 'development';
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
    res.json({
      success: true,
      message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to toggle maintenance mode' });
  }
};
