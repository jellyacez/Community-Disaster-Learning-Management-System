const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authenticate");

// All admin routes require authentication first
router.use(authenticate);

// Mount modular sub-routers
router.use("/", require("./adminUserRoutes"));
router.use("/", require("./adminSystemRoutes"));
router.use("/", require("./adminMdrrmoRoutes"));
router.use("/", require("./adminBarangayRoutes"));

module.exports = router;