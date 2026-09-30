const express = require("express");
const router = express.Router();

const requireRole = require("../../middleware/requireRole");
const pool = require("../../config/db");
const mdrrmoOverviewService = require("../../services/admin/MdrrmoOverviewService");
const activityLogService = require("../../services/admin/ActivityLogService");

// 1. Health check
router.get("/super/ping", requireRole(["super_admin"]), (req, res) => {
  res.json({ message: "Super admin route connected" });
});

// 2. Real-time Barangay Telemetry & Sector Analytics
router.get(
  "/super/analytics/barangays",
  requireRole(["super_admin"]),
  async (req, res) => {
    try {
      const { formattedData } = await mdrrmoOverviewService.getSectorOverview();

      const barangays = (formattedData || [])
        .filter((b) => b.id !== null && b.barangay !== "Unassigned")
        .map((b) => ({
          id: b.id,
          name: b.barangay,
          residents: b.resident_count || 0,
          trained: b.certified_responders || 0,
          certificates: b.certificates_issued || 0,
          completionRate: b.avg_completion_rate || 0,
        }));

      return res.json({ success: true, data: barangays });
    } catch (error) {
      console.error("SUPER_ADMIN_BARANGAY_ANALYTICS_ERROR:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// 3. Super Admin Dedicated Governance Logs
router.get(
  "/super/activity-log",
  requireRole(["super_admin"]),
  async (req, res) => {
    try {
      const result = await activityLogService.getSuperAdminActivityLog(req.query);
      return res.json({ success: true, ...result });
    } catch (error) {
      console.error("SUPER_ADMIN_LOGS_ERROR:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch Super Admin logs." });
    }
  }
);

router.get(
  "/super/activity-log/export",
  requireRole(["super_admin"]),
  async (req, res) => {
    try {
      const csvContent = await activityLogService.exportSuperAdminActivityLog(req.user?.id);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=super_admin_governance_logs_${Date.now()}.csv`
      );
      return res.status(200).send(csvContent);
    } catch (error) {
      console.error("SUPER_ADMIN_EXPORT_LOGS_ERROR:", error);
      return res.status(500).json({ success: false, message: "Failed to export Super Admin logs." });
    }
  }
);

// 4. POST /api/admin/super/impersonate/:userId
router.post(
  "/super/impersonate/:userId",
  requireRole(["super_admin"]),
  async (req, res) => {
    try {
      const targetUserId = req.params.userId;
      const superAdminId =
        req.user?.id ||
        req.user?.user_id ||
        req.user?._id ||
        req.session?.userId ||
        req.session?.user?.id;

      if (!superAdminId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized: Super Admin context not found on request.",
        });
      }

      if (String(targetUserId) === String(superAdminId)) {
        return res.status(400).json({
          success: false,
          error: "You cannot impersonate your own super admin account.",
        });
      }

      const userResult = await pool.query(
        `SELECT id, name, email, role, barangay_id, barangay_id AS "barangayId"
         FROM public."user"
         WHERE id = $1`,
        [targetUserId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Target user not found.",
        });
      }

      const targetUser = userResult.rows[0];

      // Audit Log: Record impersonation initiation under Super Admin's ID
      try {
        await pool.query(
          `INSERT INTO activity_log (user_id, act_log, act_date)
           VALUES ($1, $2, NOW())`,
          [
            superAdminId,
            `Started impersonating user "${targetUser.name}" (${targetUser.email}, Role: ${targetUser.role}, ID: ${targetUser.id})`,
          ]
        );
      } catch (logErr) {
        console.error("FAILED_TO_LOG_IMPERSONATION_START:", logErr);
      }

      res.cookie("impersonator_id", superAdminId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 1000,
      });

      res.cookie("impersonated_target_id", targetUserId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        message: `Switched identity to ${targetUser.name}`,
        targetUser,
      });
    } catch (error) {
      console.error("IMPERSONATION_ERROR_DETAILS:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to initiate user impersonation.",
      });
    }
  }
);

// 5. POST /api/admin/super/stop-impersonating
router.post("/super/stop-impersonating", async (req, res) => {
  try {
    const rawCookieHeader = req.headers.cookie || "";
    const parseCookie = (name) => {
      const match = rawCookieHeader.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
      return match ? decodeURIComponent(match[2]) : null;
    };

    const impersonatorId =
      req.cookies?.impersonator_id ||
      parseCookie("impersonator_id");

    const targetId =
      req.cookies?.impersonated_target_id ||
      parseCookie("impersonated_target_id");

    res.clearCookie("impersonator_id", { path: "/" });
    res.clearCookie("impersonated_target_id", { path: "/" });

    if (impersonatorId) {
      try {
        await pool.query(
          `INSERT INTO activity_log (user_id, act_log, act_date)
           VALUES ($1, $2, NOW())`,
          [
            impersonatorId,
            `Ended impersonation session${targetId ? ` for target user ID ${targetId}` : ""}`,
          ]
        );
      } catch (logErr) {
        console.error("FAILED_TO_LOG_IMPERSONATION_STOP:", logErr);
      }
    }

    return res.json({
      success: true,
      message: "Exited impersonation mode. Restored Super Admin session.",
    });
  } catch (error) {
    console.error("STOP_IMPERSONATION_ERROR:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to exit impersonation mode.",
    });
  }
});

module.exports = router;