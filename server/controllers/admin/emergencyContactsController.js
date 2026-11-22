const EmergencyContactsService = require("../../services/admin/EmergencyContactsService");
const sseService = require("../../services/notif/sseService");
const { logActivity } = require("../../utils/logger");

// GET /api/public/emergency-contacts (no auth)
exports.getPublicContacts = async (req, res) => {
  try {
    const contacts = await EmergencyContactsService.listPublic();
    // Overrides the /api no-store default: a short browser cache is fine for public hotlines
    res.removeHeader("Pragma");
    res.removeHeader("Expires");
    res.removeHeader("Surrogate-Control");
    res.set("Cache-Control", "public, max-age=30");
    res.json({ success: true, contacts });
  } catch (err) {
    console.error("Error fetching emergency contacts:", err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

// GET /api/admin/emergency-contacts
exports.getAdminContacts = async (req, res) => {
  try {
    const data = await EmergencyContactsService.listAdmin();
    res.json({ success: true, ...data });
  } catch (err) {
    console.error("Error fetching emergency contacts (admin):", err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

// PUT /api/admin/emergency-contacts
exports.replaceContacts = async (req, res) => {
  try {
    const result = await EmergencyContactsService.replace(req.user.id, req.body);
    if (result.status === "invalid") {
      return res.status(400).json({ success: false, error: "VALIDATION_FAILED", errors: result.errors });
    }
    if (result.status === "conflict") {
      return res.status(409).json({
        success: false,
        error: "VERSION_CONFLICT",
        message: "Someone else saved the hotlines first. Reload to see their changes.",
        version: result.version,
      });
    }
    if (result.changed) {
      await logActivity(req.user.id, result.summary, req);
      sseService.broadcast("EMERGENCY_CONTACTS_UPDATED", { version: result.version });
    }
    const data = await EmergencyContactsService.listAdmin();
    res.json({ success: true, ...data });
  } catch (err) {
    console.error("Error saving emergency contacts:", err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};
