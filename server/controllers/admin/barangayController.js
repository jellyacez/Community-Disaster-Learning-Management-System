const barangayAdminService = require("../../services/admin/BarangayAdminService");
const { cleanRichText } = require("../../utils/sanitizeHtml");
const { UNSCOPED_ACCESS_ROLES } = require("../../config/permissions");
const sseService = require("../../services/notif/sseService");
const { logActivity } = require("../../utils/logger");
const { URGENT_DURATION_HOURS, DEFAULT_URGENT_HOURS } = require("../../utils/validators");

function resolveBarangayId(req) {
  const userRole = req.user?.role;
  const isUnscoped = UNSCOPED_ACCESS_ROLES.includes(userRole);

  if (isUnscoped) {
    const rawId = req.headers["x-barangay-scope"] || req.query.barangay_id;
    return rawId ? parseInt(rawId, 10) : null;
  }

  return req.user?.barangay_id || null;
}

// 1. GET /api/admin/barangay/analytics
exports.getBarangayAnalytics = async (req, res) => {
  try {
    const barangayId = resolveBarangayId(req);

    if (!barangayId) {
      return res.status(400).json({
        error: "NO_BARANGAY_SELECTED",
        message: "A target barangay must be selected to view this dashboard.",
      });
    }

    const data = await barangayAdminService.getBarangayAnalytics(barangayId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error("DETAILED_BARANGAY_ANALYTICS_ERROR:", error);
    return res.status(500).json({
      error: "Failed to load barangay analytics.",
      detail: error.message,
    });
  }
};

// 2. GET /api/admin/barangay/announcements
exports.getBarangayAnnouncements = async (req, res) => {
  try {
    const barangayId = resolveBarangayId(req);
    const userRole = req.user?.role;

    if (!UNSCOPED_ACCESS_ROLES.includes(userRole) && !barangayId) {
      return res.status(400).json({
        error: "No barangay assigned to this administrator account.",
      });
    }

    const data = await barangayAdminService.getBarangayAnnouncements(barangayId);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching barangay announcements:", error);
    res.status(500).json({ error: "Failed to fetch announcements." });
  }
};

// 3. POST /api/admin/barangay/announcements
exports.createBarangayAnnouncement = async (req, res) => {
  try {
    const { title, content, priority, target_barangay_id, duration_hours } = req.body;
    const authorId = req.user?.user_id || req.user?.id;
    const userRole = req.user?.role;

    if (!title || !content) {
      return res.status(400).json({
        error: "Title and content are required.",
      });
    }

    // Checked here too because the MDRRMO route posts here without the Joi schema
    const isUrgent = String(priority).toLowerCase() === "urgent";
    let durationHours = null;
    if (isUrgent) {
      durationHours = duration_hours === undefined || duration_hours === null ? DEFAULT_URGENT_HOURS : Number(duration_hours);
      if (!URGENT_DURATION_HOURS.includes(durationHours)) {
        return res.status(400).json({
          error: `Choose how long the urgent advisory stays in effect: ${URGENT_DURATION_HOURS.join(", ")} hours.`,
        });
      }
    }

    if (!authorId) {
      return res.status(401).json({
        error: "Unauthorized: Missing administrative credentials.",
      });
    }

    let targetBarangay = null;
    const isUnscoped = UNSCOPED_ACCESS_ROLES.includes(userRole);

    if (userRole === "barangay_admin") {
      targetBarangay = req.user?.barangay_id;
      if (!targetBarangay) {
        return res.status(400).json({
          error: "No barangay assigned to this administrator account.",
        });
      }
    } else if (isUnscoped) {
      targetBarangay = target_barangay_id 
        ? parseInt(target_barangay_id, 10) 
        : resolveBarangayId(req);
    }

    const data = await barangayAdminService.createBarangayAnnouncement(
      title,
      cleanRichText(content),
      priority,
      authorId,
      targetBarangay,
      durationHours
    );

    logActivity(
      authorId,
      `Posted announcement "${title}" to ${targetBarangay ? `Barangay ${targetBarangay}` : "all barangays"}`,
      req,
    );

    if (targetBarangay) {
      sseService.broadcastToBarangay(targetBarangay, "ANNOUNCEMENT_CREATED", data);
    } else {
      sseService.broadcast("ANNOUNCEMENT_CREATED", data);
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("Error posting announcement:", error);
    res.status(500).json({ error: "Failed to create announcement." });
  }
};

// PATCH /api/admin/barangay/announcements/:id/lift
exports.liftAnnouncement = async (req, res) => {
  try {
    const announcementId = parseInt(req.params.id, 10);
    if (!Number.isInteger(announcementId) || announcementId <= 0) {
      return res.status(400).json({ error: "Invalid announcement ID." });
    }

    // Barangay admins can only lift their own barangay's advisories; unscoped admins can lift any
    const isUnscoped = UNSCOPED_ACCESS_ROLES.includes(req.user?.role);
    const scopeBarangayId = isUnscoped ? null : req.user?.barangay_id;
    if (!isUnscoped && !scopeBarangayId) {
      return res.status(400).json({ error: "No barangay assigned to this administrator account." });
    }

    const { row, error } = await barangayAdminService.liftAnnouncement(announcementId, req.user.id, scopeBarangayId);
    if (error === "NOT_FOUND") {
      return res.status(404).json({ error: "Announcement not found." });
    }
    if (error === "NOT_IN_EFFECT") {
      return res.status(409).json({ error: "This advisory has already ended." });
    }

    logActivity(req.user.id, `Lifted urgent advisory "${row.title}" (ID: ${row.id})`, req);

    if (row.barangay_id) {
      sseService.broadcastToBarangay(row.barangay_id, "ANNOUNCEMENT_UPDATED", row);
    } else {
      sseService.broadcast("ANNOUNCEMENT_UPDATED", row);
    }

    res.json({ success: true, data: row });
  } catch (error) {
    console.error("Error lifting announcement:", error);
    res.status(500).json({ error: "Failed to lift announcement." });
  }
};

// 4. GET /api/admin/barangay/activity-log
exports.getBarangayActivityLog = async (req, res) => {
  try {
    const barangayId = resolveBarangayId(req);

    if (!barangayId) {
      return res.status(400).json({
        error: "NO_BARANGAY_SELECTED",
        message: "A target barangay must be selected to view logs.",
      });
    }

    const result = await barangayAdminService.getBarangayActivityLog(
      barangayId,
      req.query
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error fetching barangay activity logs:", error);
    res.status(500).json({ error: "Failed to fetch activity logs." });
  }
};

// 5. GET /api/admin/barangay/certifications
exports.getBarangayCertifications = async (req, res) => {
  try {
    const barangayId = resolveBarangayId(req);

    if (!barangayId) {
      return res.status(400).json({
        success: false,
        error: "NO_BARANGAY_SELECTED",
        message: "A target barangay must be selected to view certifications.",
      });
    }

    const result = await barangayAdminService.getBarangayCertifications(
      barangayId,
      req.query
    );
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error fetching barangay certifications:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch certifications.",
    });
  }
};
// 6. GET /api/admin/barangay/report/export?from=YYYY-MM-DD&to=YYYY-MM-DD&sheets=...
// Same accomplishment report as the MDRRMO one, limited to this barangay's residents
const mdrrmoReportService = require("../../services/admin/MdrrmoReportService");
const { buildMdrrmoReportWorkbook } = require("../../utils/mdrrmoReportWorkbook");
const { parseReportQuery, XLSX_TYPE } = require("../../utils/reportQuery");

exports.exportBarangayReport = async (req, res) => {
  // Barangay admins always get their own barangay; only unscoped roles may choose one
  const barangayId = resolveBarangayId(req);
  if (!barangayId) {
    return res.status(400).json({
      success: false,
      error: "NO_BARANGAY_SELECTED",
      message: "A target barangay must be selected to export a report.",
    });
  }

  const { error, from, to, sheets } = parseReportQuery(req.query, ["monthly", "residents", "modules"]);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }

  try {
    const data = await mdrrmoReportService.getAccomplishmentReport(from, to, { barangayId });
    if (!data) {
      return res.status(404).json({ success: false, message: "Barangay not found." });
    }
    const buffer = await buildMdrrmoReportWorkbook(data, {
      from,
      to,
      sheets,
      barangayName: data.barangayName,
      preparedBy: { name: req.user.name || req.user.email, role: req.user.role },
    });
    logActivity(req.user.id, `Exported accomplishment report for Barangay ${data.barangayName} (${from} to ${to})`, req);
    const safeName = data.barangayName.replace(/[^A-Za-z0-9]+/g, "_");
    res.setHeader("Content-Type", XLSX_TYPE);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Barangay_${safeName}_Accomplishment_Report_${from}_to_${to}.xlsx"`
    );
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Barangay Accomplishment Report Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
