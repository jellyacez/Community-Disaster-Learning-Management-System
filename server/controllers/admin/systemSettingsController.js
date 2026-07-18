const SystemSettingsService = require("../../services/admin/SystemSettingsService");

// @desc    Get system settings (including maintenance mode)
// @access  Private (system_admin only)
exports.getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettingsService.getSystemSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: { message: 'Server Error' } });
  }
};

// @desc    Update system branding (Name and Base64 Logo)
// @access  Private (system_admin only)
exports.updateSystemBranding = async (req, res) => {
  const { system_name, system_logo } = req.body;
  try {
    // Upsert System Logo (Hybrid Validation for AWS S3 and Base64)
    if (system_logo) {
      // 1. Check if it's a valid URL (e.g., AWS S3)
      const isUrl = /^(https?:\/\/)/.test(system_logo);
      let isValidLogo = isUrl;

      // 2. If not a URL, validate as Base64 image
      if (!isUrl) {
        const base64Match = system_logo.match(/^data:image\/(png|jpeg|webp|svg\+xml);base64,(.+)$/);
        if (!base64Match) {
          return res.status(400).json({ success: false, error: { message: 'Invalid logo format. Must be a valid HTTPS URL or a Base64 image (PNG, JPG, WEBP, SVG).' } });
        }
        
        // Size Validation: Calculate byte size (max 2MB)
        const base64Data = base64Match[2];
        const sizeInBytes = (base64Data.length * 3) / 4 - (base64Data.endsWith("==") ? 2 : (base64Data.endsWith("=") ? 1 : 0));
        if (sizeInBytes > 2 * 1024 * 1024) {
          return res.status(400).json({ success: false, error: { message: 'Logo image is too large. Maximum size is 2MB.' } });
        }
        isValidLogo = true;
      }

      if (!isValidLogo) {
         return res.status(400).json({ success: false, error: { message: 'Invalid logo format.' } });
      }
    }
    
    await SystemSettingsService.updateSystemBranding(system_name, system_logo);

    require('../../utils/logger').logActivity(req.user.id, 'Updated system branding');
    res.status(200).json({ success: true, data: { message: 'System branding updated successfully' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: { message: 'Failed to update system branding' } });
  }
};

// @desc    Toggle maintenance mode on/off
// @access  Private (system_admin only)
exports.setMaintenanceMode = async (req, res) => {
  const { enabled } = req.body;
  try {
    await SystemSettingsService.setMaintenanceMode(enabled);
    
    require('../../utils/logger').logActivity(req.user.id, enabled ? 'Enabled maintenance mode' : 'Disabled maintenance mode');
    
    res.status(200).json({
      success: true,
      data: { message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: { message: 'Failed to toggle maintenance mode' } });
  }
};

// @desc    Update system-wide broadcast override
// @access  Private (system_admin only)
exports.updateBroadcast = async (req, res) => {
  const { broadcast_message, broadcast_active, broadcast_severity } = req.body;
  try {
    await SystemSettingsService.updateBroadcast(broadcast_message, broadcast_active, broadcast_severity);
    
    require('../../utils/logger').logActivity(req.user.id, 'Updated global broadcast settings');
    res.status(200).json({ success: true, data: { message: 'Broadcast settings updated successfully' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: { message: 'Failed to update broadcast settings' } });
  }
};

// @desc    Update organization details
// @access  Private (system_admin only)
exports.updateOrganizationDetails = async (req, res) => {
  const { support_email, org_footer_text } = req.body;
  try {
    await SystemSettingsService.updateOrganizationDetails(support_email, org_footer_text);
    
    require('../../utils/logger').logActivity(req.user.id, 'Updated organization details');
    res.status(200).json({ success: true, data: { message: 'Organization details updated successfully' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: { message: 'Failed to update organization details' } });
  }
};
