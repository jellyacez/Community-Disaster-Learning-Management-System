const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authenticate");

// Apply authentication to all routes
router.use(authenticate);
const requireRole = require("../../middleware/requireRole");
const { ADMIN_ROLES } = require("../../config/permissions");
const requirePermission = require("../../middleware/requirePermission");
const uploadMiddleware = require("../../middleware/uploadMiddleware");

router.post("/upload-media", requireRole(ADMIN_ROLES), requirePermission('manage_modules'), uploadMiddleware, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded." });
    }
    
    // multer-s3 populates req.file.location with the public URL
    // multer diskStorage populates req.file.filename
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const fileUrl = req.file.location || `${baseUrl}/uploads/${req.file.filename}`;

    return res.status(201).json({
        success: true,
        message: "File uploaded successfully.",
        url: fileUrl
    });
});

module.exports = router;
