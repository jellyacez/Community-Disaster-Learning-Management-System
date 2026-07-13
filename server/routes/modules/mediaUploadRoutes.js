const express = require("express");
const router = express.Router();
const { betterAuthMiddleware } = require("../../middleware/betterAuthMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");
const requirePermission = require("../../middleware/requirePermission");
const uploadMiddleware = require("../../middleware/uploadMiddleware");

router.post("/upload-media", betterAuthMiddleware, adminMiddleware, requirePermission('manage_modules'), uploadMiddleware, (req, res) => {
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
