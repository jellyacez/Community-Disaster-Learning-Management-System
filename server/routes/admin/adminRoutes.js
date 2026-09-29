const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authenticate");

// All admin routes require authentication first
router.use(authenticate);

const { isMaintenanceActive } = require("../../middleware/maintenanceMiddleware");

// During maintenance mode, ONLY system_admin can access admin routes
router.use(async (req, res, next) => {
  try {
    const isMaintenance = await isMaintenanceActive();
    if (isMaintenance && req.user?.role !== "system_admin") {
      return res.status(503).json({
        success: false,
        error: "MAINTENANCE_MODE",
        message: "The system is currently undergoing scheduled maintenance. Only system administrators may access the console."
      });
    }
  } catch (err) {
    // If check fails, safely proceed
  }
  next();
});

// Mount modular sub-routers
router.use("/", require("./adminUserRoutes"));
router.use("/", require("./adminSystemRoutes"));
router.use("/", require("./adminMdrrmoRoutes"));
router.use("/", require("./adminBarangayRoutes"));

module.exports = router;