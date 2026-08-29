const activityLogService = require("../../services/admin/ActivityLogService");

// @desc    Get paginated activity log
// @access  Private (system_admin only)
exports.getActivityLog = async (req, res) => {
  try {
    const result = await activityLogService.getActivityLog(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Activity log fetch error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Export activity log to CSV
// @access  Private (system_admin only)
exports.exportActivityLog = async (req, res) => {
  try {
    const csvContent = await activityLogService.exportActivityLog(req.user?.id);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="system_activity_logs.csv"');
    return res.send(csvContent);
  } catch (err) {
    console.error("Export logs error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get paginated MDRRMO activity log (excludes system admin actions)
// @access  Private (mdrrmo_admin, head_mdrrmo_admin)
exports.getMdrrmoActivityLog = async (req, res) => {
  try {
    const result = await activityLogService.getMdrrmoActivityLog(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("MDRRMO activity log fetch error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Export MDRRMO activity log to CSV (excludes system admin actions)
// @access  Private (mdrrmo_admin, head_mdrrmo_admin)
exports.exportMdrrmoActivityLog = async (req, res) => {
  try {
    const csvContent = await activityLogService.exportMdrrmoActivityLog(req.user?.id);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="mdrrmo_activity_logs.csv"');
    return res.send(csvContent);
  } catch (err) {
    console.error("Export MDRRMO logs error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
