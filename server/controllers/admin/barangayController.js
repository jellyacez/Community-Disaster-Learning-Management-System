const barangayAdminService = require("../../services/admin/BarangayAdminService");

// 1. GET /api/admin/barangay/analytics
exports.getBarangayAnalytics = async (req, res) => {
  try {
    const barangayId = req.user?.barangay_id;

    if (!barangayId) {
      return res.status(400).json({ 
        error: "SECURITY_FAULT: No barangay associated with this administrator account." 
      });
    }

    const data = await barangayAdminService.getBarangayAnalytics(barangayId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error("DETAILED_BARANGAY_ANALYTICS_ERROR:", error);
    return res.status(500).json({ 
      error: "Failed to load barangay analytics.", 
      detail: error.message 
    });
  }
};

// 2. GET /api/admin/barangay/announcements
exports.getBarangayAnnouncements = async (req, res) => {
  try {
    const barangayId = req.user?.barangay_id;

    if (!barangayId) {
      return res.status(400).json({ error: "No barangay assigned to this administrator account." });
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
    const { title, content } = req.body;
    const barangayId = req.user?.barangay_id;
    const authorId = req.user?.id || req.user?.user_id;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required." });
    }

    if (!barangayId || !authorId) {
      return res.status(400).json({ error: "Unauthorized: Missing administrative credentials." });
    }

    const data = await barangayAdminService.createBarangayAnnouncement(title, content, authorId, barangayId);
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("Error posting barangay announcement:", error);
    res.status(500).json({ error: "Failed to create announcement." });
  }
};

// 4. GET /api/admin/barangay/activity-log
exports.getBarangayActivityLog = async (req, res) => {
  try {
    const barangayId = req.user?.barangay_id;

    if (!barangayId) {
      return res.status(400).json({ error: "No barangay assigned to this administrator account." });
    }

    const result = await barangayAdminService.getBarangayActivityLog(barangayId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error fetching barangay activity logs:", error);
    res.status(500).json({ error: "Failed to fetch activity logs." });
  }
};

// 5. GET /api/admin/barangay/certifications
// @desc    Get scoped resident certification roster with tactical filters and computed status
// @access  Private (barangay_admin only)
exports.getBarangayCertifications = async (req, res) => {
  try {
    const barangayId = req.user?.barangay_id;
    if (!barangayId) {
      return res.status(403).json({
        success: false,
        error: "SECURITY_FAULT: No barangay associated with this account.",
      });
    }

    const result = await barangayAdminService.getBarangayCertifications(barangayId, req.query);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error fetching barangay certifications:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch certifications.",
    });
  }
};