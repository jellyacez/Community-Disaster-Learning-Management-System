const UserService = require("../../services/users/UserService");

// @desc    Retrieves a list of authentication providers linked to the current user
// @access  Private
exports.getProviders = async (req, res) => {
  try {
    const providers = await UserService.getProviders(req.user.id);
    res.json({ providers });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
// --- End of getProviders ---

// @desc    Completes a new user's profile by saving required demographic information
// @access  Private
exports.onboarding = async (req, res) => {
  const { name, barangay } = req.body;
  
  try {
    await UserService.onboarding(req.user.id, name, barangay);
    res.json({ success: true, message: "Profile updated successfully!" });
  } catch (err) {
    if (err.message === "MISSING_DATA") {
      return res.status(400).json({ error: "Name and Barangay are required" });
    }
    console.error("Onboarding error:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};
// --- End of onboarding ---

// @desc    Retrieves all registered users and their details for the admin dashboard
// @access  Private (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const search = req.query.search || "";
    const role = req.query.role || "";
    const status = req.query.status || "";
    const barangay = req.query.barangay || "";

    const result = await UserService.getAllUsers(page, limit, search, role, status, barangay, req.user);
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
// --- End of getAllUsers ---

// @desc    Hard deletes a user's account and anonymizes their certificates (Right to Be Forgotten)
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    await UserService.deleteAccount(req.user.id);
    res.json({ success: true, message: "Account and associated data permanently deleted." });
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    console.error("Account deletion error:", err.message);
    res.status(500).json({ error: "Server Error during deletion pipeline" });
  }
};
// --- End of deleteAccount ---

// @desc    Retrieves a specific certificate for the logged in user
// @access  Private
exports.getCertificateData = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: "Token required" });
    
    const certData = await UserService.getCertificateData(req.user.id, token);
    res.json({ data: certData });
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ error: "Certificate not found" });
    }
    console.error("Error fetching certificate data:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};
// --- End of getCertificateData ---

// @desc    Exports the current user's profile, activity, and learning data as JSON
// @access  Private
exports.exportUserData = async (req, res) => {
  try {
    const exportData = await UserService.exportUserData(req.user.id);
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename=BacolorLMS_Data_Export_${date}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    console.error("Export error:", err.message);
    res.status(500).json({ error: "Failed to export data" });
  }
};
// --- End of exportUserData ---

// @desc    Get user's notification settings
// @access  Private
exports.getUserSettings = async (req, res) => {
  try {
    const settings = await UserService.getUserSettings(req.user.id);
    res.json(settings);
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    console.error("Error fetching settings:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};
// --- End of getUserSettings ---

exports.updateUserSettings = async (req, res) => {
  try {
    const settings = await UserService.updateUserSettings(req.user.id, req.body);
    res.json({ success: true, settings });
  } catch (err) {
    console.error("Error updating settings:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};
// --- End of updateUserSettings ---
