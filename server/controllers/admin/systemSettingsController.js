const SystemSettingsService = require("../../services/admin/SystemSettingsService");
const { validateSystemName, parseLogo, validateSupportEmail, validateOrgFooter } = require("../../utils/branding");

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
    const data = await SystemSettingsService.getSystemLogo();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to retrieve system logo." });
  }
};

// Spec: docs/specs/branding.md. Everything is validated before anything is written.
exports.updateSystemBranding = async (req, res) => {
  const { system_name, system_logo, remove_logo } = req.body || {};
  const update = {};
  const parts = [];
  const refuse = (message) => res.status(400).json({ success: false, message });

  if (system_name !== undefined) {
    const name = validateSystemName(system_name);
    if (name.error) return refuse(name.error);
    update.name = name.value;
    parts.push("name");
  }
  if (system_logo !== undefined && system_logo !== null && system_logo !== "") {
    if (remove_logo === true) return refuse("Upload a new logo or remove the current one, not both.");
    const logo = parseLogo(system_logo);
    if (logo.error) return refuse(logo.error);
    update.logo = system_logo;
    parts.push("logo");
  }
  if (remove_logo === true) {
    update.removeLogo = true;
    parts.push("removed logo");
  }
  if (!parts.length) return refuse("Nothing to update.");

  try {
    const version = await SystemSettingsService.updateSystemBranding(update);
    require("../../services/notif/sseService").broadcast("BRANDING_UPDATED", { version });
    require("../../utils/logger").logActivity(req.user.id, `Updated system branding (${parts.join(", ")})`);
    res.status(200).json({ success: true, data: { message: "System branding updated successfully", version } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update system branding." });
  }
};

exports.setMaintenanceMode = async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ success: false, message: "Send enabled: true or false." });
  }
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
  if (broadcast_message === undefined && broadcast_active === undefined && broadcast_severity === undefined) {
    return res.status(400).json({ success: false, message: "Nothing to update." });
  }
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
  const { support_email, org_footer_text } = req.body || {};
  let email, footer;
  if (support_email !== undefined) {
    const checked = validateSupportEmail(support_email);
    if (checked.error) return res.status(400).json({ success: false, message: checked.error });
    email = checked.value;
  }
  if (org_footer_text !== undefined) {
    const checked = validateOrgFooter(org_footer_text);
    if (checked.error) return res.status(400).json({ success: false, message: checked.error });
    footer = checked.value;
  }
  try {
    await SystemSettingsService.updateOrganizationDetails(email, footer);
    
    require('../../utils/logger').logActivity(req.user.id, 'Updated organization details');
    res.status(200).json({ success: true, data: { message: 'Organization details updated successfully' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update organization details.' });
  }
};

