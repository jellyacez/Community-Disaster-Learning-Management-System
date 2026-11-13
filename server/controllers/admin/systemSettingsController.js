const SystemSettingsService = require("../../services/admin/SystemSettingsService");

exports.getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettingsService.getSystemSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to retrieve system settings." });
  }
};

// @desc    Get the system logo (kept out of getSystemSettings to keep polling light)
exports.getSystemLogo = async (req, res) => {
  try {
    const system_logo = await SystemSettingsService.getSystemLogo();
    res.status(200).json({ success: true, data: { system_logo } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to retrieve system logo." });
  }
};

exports.updateSystemBranding = async (req, res) => {
  const { system_name, system_logo } = req.body;
  try {
    // system_logo is either an S3 URL or a base64 image
    if (system_logo) {
      const isUrl = /^(https?:\/\/)/.test(system_logo);
      let isValidLogo = isUrl;

      if (!isUrl) {
        const base64Match = system_logo.match(/^data:image\/(png|jpeg|webp|svg\+xml);base64,(.+)$/);
        if (!base64Match) {
          return res.status(400).json({ success: false, message: 'Invalid logo format. Must be a valid HTTPS URL or a Base64 image (PNG, JPG, WEBP, SVG).' });
        }
        
        // Max 500 KB: base64 adds ~33%, which keeps the request under the 800kb express.json limit in server.js.
        const base64Data = base64Match[2];
        const sizeInBytes = (base64Data.length * 3) / 4 - (base64Data.endsWith("==") ? 2 : (base64Data.endsWith("=") ? 1 : 0));
        if (sizeInBytes > 500 * 1024) {
          return res.status(400).json({ success: false, message: 'Logo image is too large. Maximum size is 500 KB.' });
        }
        isValidLogo = true;
      }

      if (!isValidLogo) {
         return res.status(400).json({ success: false, message: 'Invalid logo format.' });
      }
    }
    
    await SystemSettingsService.updateSystemBranding(system_name, system_logo);

    require('../../utils/logger').logActivity(req.user.id, 'Updated system branding');
    res.status(200).json({ success: true, data: { message: 'System branding updated successfully' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update system branding.' });
  }
};

exports.setMaintenanceMode = async (req, res) => {
  const { enabled } = req.body;
  try {
    await SystemSettingsService.setMaintenanceMode(enabled);
    const { clearMaintenanceCache } = require("../../middleware/maintenanceMiddleware");
    clearMaintenanceCache();
    
    require('../../utils/logger').logActivity(req.user.id, enabled ? 'Enabled maintenance mode' : 'Disabled maintenance mode');
    
    res.status(200).json({
      success: true,
      data: { message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to toggle maintenance mode.' });
  }
};

exports.updateBroadcast = async (req, res) => {
  const { broadcast_message, broadcast_active, broadcast_severity } = req.body;
  try {
    const state = await SystemSettingsService.updateBroadcast(broadcast_message, broadcast_active, broadcast_severity);

    // Drop the public endpoint's 30s cache so page loads agree with the live push
    require('../../routes/publicRoutes').clearBroadcastCache();
    require('../../services/notif/sseService').broadcast('SYSTEM_BROADCAST_UPDATE', { success: true, ...state });

    require('../../utils/logger').logActivity(req.user.id, 'Updated global broadcast settings');
    res.status(200).json({ success: true, data: { message: 'Broadcast settings updated successfully' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update broadcast settings.' });
  }
};

exports.updateOrganizationDetails = async (req, res) => {
  const { support_email, org_footer_text } = req.body;
  try {
    await SystemSettingsService.updateOrganizationDetails(support_email, org_footer_text);
    
    require('../../utils/logger').logActivity(req.user.id, 'Updated organization details');
    res.status(200).json({ success: true, data: { message: 'Organization details updated successfully' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update organization details.' });
  }
};

