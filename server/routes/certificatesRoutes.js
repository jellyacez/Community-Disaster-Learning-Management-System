const express = require('express');
const router = express.Router();
const certificatesController = require('../controllers/certificatesController');
const { certificateVerifyLimiter } = require('../middleware/rateLimiters');

// @route   GET /api/certificates/verify/:token
// @desc    Verify a certificate by its public UUID token
// @access  Public (Rate Limited)
router.get('/verify/:token', certificateVerifyLimiter, certificatesController.verifyCertificate);

module.exports = router;
