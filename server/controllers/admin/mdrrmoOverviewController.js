const mdrrmoOverviewService = require("../../services/admin/MdrrmoOverviewService");

// @desc    Get MDRRMO dashboard metrics
// @access  Private (mdrrmo_admin, system_admin)
exports.getMetrics = async (req, res) => {
  try {
    const data = await mdrrmoOverviewService.getMetrics();
    res.json({ success: true, data });
  } catch (err) {
    console.error("MDRRMO Metrics Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get module distribution by category
// @access  Private (mdrrmo_admin, system_admin)
exports.getModuleDistribution = async (req, res) => {
  try {
    const data = await mdrrmoOverviewService.getModuleDistribution();
    res.json({ success: true, data });
  } catch (err) {
    console.error("MDRRMO Module Distribution Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get 7-day enrollment trend
// @access  Private (mdrrmo_admin, system_admin)
exports.getEnrollmentTrend = async (req, res) => {
  try {
    const data = await mdrrmoOverviewService.getEnrollmentTrend();
    res.json({ success: true, data });
  } catch (err) {
    console.error("MDRRMO Enrollment Trend Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get recent activity logs
// @access  Private (mdrrmo_admin, system_admin)
exports.getRecentActivity = async (req, res) => {
  try {
    const data = await mdrrmoOverviewService.getRecentActivity();
    res.json({ success: true, data });
  } catch (err) {
    console.error("MDRRMO Recent Activity Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get aggregate data per barangay for Sector Overview
// @access  Private (mdrrmo_admin, head_mdrrmo_admin, system_admin)
exports.getSectorOverview = async (req, res) => {
  try {
    const { formattedData, trends } = await mdrrmoOverviewService.getSectorOverview();
    res.json({ success: true, data: formattedData, trends });
  } catch (error) {
    console.error("Error fetching sector overview data:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get category breakdown for certificates (Sector Overview deep dive)
// @access  Private (mdrrmo_admin, head_mdrrmo_admin, system_admin)
exports.getSectorOverviewCategoryBreakdown = async (req, res) => {
  try {
    const barangayId = req.query.barangay_id;
    const data = await mdrrmoOverviewService.getSectorOverviewCategoryBreakdown(barangayId);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching sector category breakdown:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get municipal-wide certification analytics and compliance data
// @route   GET /api/admin/mdrrmo/certifications/analytics
// @access  Private (system_admin, mdrrmo_admin, head_mdrrmo_admin)
exports.getMunicipalCertAnalytics = async (req, res) => {
  try {
    const data = await mdrrmoOverviewService.getMunicipalCertAnalytics();
    return res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching municipal cert analytics:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get municipal-wide paginated certificate action feed
// @route   GET /api/admin/mdrrmo/certifications/feed
// @access  Private (system_admin, mdrrmo_admin, head_mdrrmo_admin)
exports.getMunicipalCertFeed = async (req, res) => {
  try {
    const result = await mdrrmoOverviewService.getMunicipalCertFeed(req.query);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching municipal cert feed:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
