const DashboardService = require("../../services/users/DashboardService");

// @desc    Fetches aggregated dashboard metrics, active announcements, and current enrollments for the user
// @access  Private (authenticated users)
exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: "Unauthorized" } });
    }

    const dashboardData = await DashboardService.getDashboardData(userId);

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error("Dashboard data fetch error:", error);
    res.status(500).json({ success: false, error: { message: "Failed to fetch dashboard data" } });
  }
};
  