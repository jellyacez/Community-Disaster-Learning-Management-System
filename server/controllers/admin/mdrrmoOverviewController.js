const mdrrmoOverviewService = require("../../services/admin/MdrrmoOverviewService");
const { logActivity } = require("../../utils/logger");

exports.getMetrics = async (req, res) => {
  try {
    const data = await mdrrmoOverviewService.getMetrics();
    res.json({ success: true, data });
  } catch (err) {
    console.error("MDRRMO Metrics Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

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
exports.getEnrollmentTrend = async (req, res) => {
  try {
    const data = await mdrrmoOverviewService.getEnrollmentTrend();
    res.json({ success: true, data });
  } catch (err) {
    console.error("MDRRMO Enrollment Trend Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const data = await mdrrmoOverviewService.getRecentActivity();
    res.json({ success: true, data });
  } catch (err) {
    console.error("MDRRMO Recent Activity Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getSectorOverview = async (req, res) => {
  try {
    const { formattedData, trends } = await mdrrmoOverviewService.getSectorOverview();
    res.json({ success: true, data: formattedData, trends });
  } catch (error) {
    console.error("Error fetching sector overview data:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

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

// @route   GET /api/admin/mdrrmo/certifications/analytics
exports.getMunicipalCertAnalytics = async (req, res) => {
  try {
    const data = await mdrrmoOverviewService.getMunicipalCertAnalytics();
    return res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching municipal cert analytics:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/admin/mdrrmo/certifications/feed
exports.getMunicipalCertFeed = async (req, res) => {
  try {
    const result = await mdrrmoOverviewService.getMunicipalCertFeed(req.query);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching municipal cert feed:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const mdrrmoReportService = require("../../services/admin/MdrrmoReportService");
const { buildMdrrmoReportWorkbook } = require("../../utils/mdrrmoReportWorkbook");
const { parseReportQuery, XLSX_TYPE } = require("../../utils/reportQuery");

// @desc    Export the training accomplishment report for a date range as .xlsx
// @route   GET /api/admin/mdrrmo/report/export?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.exportAccomplishmentReport = async (req, res) => {
  const { error, from, to, sheets } = parseReportQuery(req.query, ["monthly", "barangays", "modules"]);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }

  try {
    const data = await mdrrmoReportService.getAccomplishmentReport(from, to);
    const buffer = await buildMdrrmoReportWorkbook(data, {
      from,
      to,
      sheets,
      preparedBy: { name: req.user.name || req.user.email, role: req.user.role },
    });
    res.setHeader("Content-Type", XLSX_TYPE);
    logActivity(req.user.id, `Exported MDRRMO accomplishment report (${from} to ${to})`, req);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="MDRRMO_Accomplishment_Report_${from}_to_${to}.xlsx"`
    );
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("MDRRMO Accomplishment Report Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
