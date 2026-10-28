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

const Joi = require("joi");
const mdrrmoReportService = require("../../services/admin/MdrrmoReportService");
const { buildMdrrmoReportWorkbook } = require("../../utils/mdrrmoReportWorkbook");

const MAX_REPORT_DAYS = 366 * 3;
// Rejects impossible dates like 2026-02-30 instead of rolling them over
const calendarDate = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .custom((v, helpers) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : helpers.error("any.invalid");
  });
const OPTIONAL_SHEETS = ["monthly", "barangays", "modules"];
const reportRangeSchema = Joi.object({
  from: calendarDate.required(),
  to: calendarDate.required(),
  // Comma-separated; omitted means every sheet, empty means Summary only
  sheets: Joi.string()
    .allow("")
    .pattern(new RegExp(`^(${OPTIONAL_SHEETS.join("|")})(,(${OPTIONAL_SHEETS.join("|")}))*$`)),
});

// @desc    Export the training accomplishment report for a date range as .xlsx
// @route   GET /api/admin/mdrrmo/report/export?from=YYYY-MM-DD&to=YYYY-MM-DD
// @access  Private (system_admin, mdrrmo_admin, head_mdrrmo_admin)
exports.exportAccomplishmentReport = async (req, res) => {
  const { error, value } = reportRangeSchema.validate(req.query, { stripUnknown: true });
  if (error) {
    return res.status(400).json({ success: false, message: "Provide valid from and to dates (YYYY-MM-DD) and sheet names." });
  }
  const { from, to } = value;
  const sheets = new Set(value.sheets === undefined ? OPTIONAL_SHEETS : value.sheets.split(",").filter(Boolean));
  const days = (Date.parse(to) - Date.parse(from)) / 86400000;
  if (days < 0) {
    return res.status(400).json({ success: false, message: "The start date must be on or before the end date." });
  }
  if (days > MAX_REPORT_DAYS) {
    return res.status(400).json({ success: false, message: "The reporting period can be at most 3 years." });
  }

  try {
    const data = await mdrrmoReportService.getAccomplishmentReport(from, to);
    const buffer = await buildMdrrmoReportWorkbook(data, {
      from,
      to,
      sheets,
      preparedBy: { name: req.user.name || req.user.email, role: req.user.role },
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
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
