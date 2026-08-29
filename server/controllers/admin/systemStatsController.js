const systemStatsService = require("../../services/admin/SystemStatsService");

// @desc    Get system-wide statistics
// @access  Private (system_admin only)
exports.getSystemStats = async (req, res) => {
  try {
    const data = await systemStatsService.getSystemStats();
    res.json({ success: true, data });
  } catch (err) {
    console.error("System stats error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get 24h Traffic Analytics
// @access  Private (system_admin only)
exports.getTrafficAnalytics = async (req, res) => {
  try {
    const data = await systemStatsService.getTrafficAnalytics();
    res.json({ success: true, data });
  } catch (err) {
    console.error("Traffic Analytics Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get DB health status
// @access  Private (system_admin only)
exports.getHealthStatus = async (req, res) => {
  try {
    const data = await systemStatsService.getHealthStatus();
    res.json({ success: true, data });
  } catch (_) {
    res.status(500).json({
      success: false,
      data: { db_status: "disconnected", db_latency_ms: null },
    });
  }
};
