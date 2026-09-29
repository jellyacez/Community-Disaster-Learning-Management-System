const barangayAdminService = require("../../services/admin/BarangayAdminService");
const { cleanRichText } = require("../../utils/sanitizeHtml");
const { UNSCOPED_ACCESS_ROLES } = require("../../config/permissions");
const sseService = require("../../services/notif/sseService");

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
    const { title, content, priority, target_barangay_id } = req.body;
    const authorId = req.user?.user_id || req.user?.id;
    const userRole = req.user?.role;

    if (!title || !content) {
      return res.status(400).json({
        error: "Title and content are required.",
      });
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
      targetBarangay
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