const express = require('express');
const router = express.Router();
const certificatesController = require('../controllers/certificatesController');
const { certificateVerifyLimiter } = require('../middleware/rateLimiters');
const { optionalAuthenticate } = require('../middleware/authenticate');

// @route   GET /api/certificates/verify/:token
// @desc    Verify a certificate by its public UUID token
// @access  Public (50/15m anon, 500/15m authenticated admin)
router.get('/verify/:token', optionalAuthenticate, certificateVerifyLimiter, certificatesController.verifyCertificate);

module.exports = router;
