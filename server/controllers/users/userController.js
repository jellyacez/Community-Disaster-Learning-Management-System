const pool = require("../../config/db");
const UserService = require("../../services/users/UserService");
const { logActivity } = require("../../utils/logger");
const { sendAccountNotice } = require("../../services/accountNoticeService");

exports.getProviders = async (req, res) => {
  try {
    const providers = await UserService.getProviders(req.user.id);
    res.json({ providers });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Failed to retrieve providers." });
  }
};

// @desc    Completes a new user's profile by saving required demographic information
exports.onboarding = async (req, res) => {
  const { name, barangay } = req.body;

  try {
    await UserService.onboarding(req.user.id, name, barangay);
    logActivity(req.user.id, "Completed profile onboarding", req);
    res.json({ success: true, message: "Profile updated successfully!" });
  } catch (err) {
    if (err.message === "MISSING_DATA") {
      return res.status(400).json({ success: false, message: "Name and Barangay are required." });
    }
    if (err.message.startsWith("FORBIDDEN")) {
      return res.status(403).json({ success: false, message: err.message.replace("FORBIDDEN: ", "") });
    }
    if (err.message.startsWith("ALREADY_ONBOARDED")) {
      return res.status(409).json({ success: false, message: err.message.replace("ALREADY_ONBOARDED: ", "") });
    }
    if (err.message === "INVALID_BARANGAY") {
      return res.status(400).json({ success: false, message: "The specified barangay does not exist." });
    }
    console.error("Onboarding error:", err.message);
    res.status(500).json({ success: false, message: "Failed to complete onboarding." });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const search = req.query.search || "";
    const role = req.query.role || "";
    const status = req.query.status || "";
    const barangay = req.query.barangay || "";

    const result = await UserService.getAllUsers(
      page,
      limit,
      search,
      role,
      status,
      barangay,
      req.user,
    );
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Failed to retrieve users." });
  }
};

// @desc    Hard deletes a user's account and anonymizes their certificates (Right to Be Forgotten)
exports.deleteAccount = async (req, res) => {
  try {
    const deletedUser = await UserService.deleteAccount(req.user.id);

    // deleteAccount wipes this user's own log rows, so record the event without a user id
    pool
      .query(
        `INSERT INTO activity_log (user_id, act_date, act_log, ip_address) VALUES (NULL, NOW(), $1, $2)`,
        [`Self-deleted account (Role: ${deletedUser.role}, Barangay: ${deletedUser.barangay || "None"})`, req.ip || null],
      )
      .catch((err) => console.error("[ActivityLogger Error] Failed to record self-deletion:", err.message));
    sendAccountNotice(deletedUser, "deleted", { byAdmin: false });

    res.json({
      success: true,
      message: "Account and associated data permanently deleted.",
    });
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    console.error("Account deletion error:", err.message);
    res.status(500).json({ success: false, message: "Failed to delete account." });
  }
};

exports.getCertificateData = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ success: false, message: "Token required." });

    const certData = await UserService.getCertificateData(req.user.id, token);
    res.json({ data: certData });
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Certificate not found." });
    }
    console.error("Error fetching certificate data:", err.message);
    res.status(500).json({ success: false, message: "Failed to retrieve certificate." });
  }
};

// @desc    Exports the current user's profile, activity, and learning data as JSON
exports.exportUserData = async (req, res) => {
  try {
    const exportData = await UserService.exportUserData(req.user.id);
    logActivity(req.user.id, "Exported personal data (data privacy request)", req);
    const date = new Date().toISOString().split("T")[0];
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=BacolorLMS_Data_Export_${date}.json`,
    );
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    console.error("Export error:", err.message);
    res.status(500).json({ success: false, message: "Failed to export data." });
  }
};

exports.getUserSettings = async (req, res) => {
  try {
    const settings = await UserService.getUserSettings(req.user.id);
    res.json(settings);
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    console.error("Error fetching settings:", err.message);
    res.status(500).json({ success: false, message: "Failed to retrieve settings." });
  }
};

exports.updateUserSettings = async (req, res) => {
  try {
    const settings = await UserService.updateUserSettings(
      req.user.id,
      req.body,
    );
    res.json({ success: true, settings });
  } catch (err) {
    console.error("Error updating settings:", err.message);
    res.status(500).json({ success: false, message: "Failed to update settings." });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const data = await UserService.getNotifications(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error fetching notifications:", err.message);
    res.status(500).json({ success: false, message: "Failed to retrieve notifications." });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    await UserService.markNotificationsRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Error marking notifications read:", err.message);
    res.status(500).json({ success: false, message: "Failed to update notifications." });
  }
};

