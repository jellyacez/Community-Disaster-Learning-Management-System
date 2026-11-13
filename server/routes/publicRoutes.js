const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { isMfaEnforced } = require('../config/permissions');

// in-memory cache so this public endpoint can't be used to hammer the DB
let cachedBroadcast = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30000;

// @route   GET /api/public/broadcast
router.get('/broadcast', async (req, res) => {
  try {
    const now = Date.now();
    
    if (cachedBroadcast && (now - lastFetchTime < CACHE_TTL_MS)) {
      return res.json(cachedBroadcast);
    }

    const result = await pool.query(
      `SELECT key, value FROM public.system_settings WHERE key IN ('broadcast_active', 'broadcast_message', 'broadcast_severity')`
    );
    
    let active = false;
    let message = '';
    let severity = 'warning';
    
    result.rows.forEach(row => {
      if (row.key === 'broadcast_active') active = row.value === 'true';
      if (row.key === 'broadcast_message') message = row.value;
      if (row.key === 'broadcast_severity') severity = row.value || 'warning';
    });
    
    const responseData = { success: true, active, message, severity };
    
    cachedBroadcast = responseData;
    lastFetchTime = now;

    res.json(responseData);
  } catch (err) {
    console.error('Error fetching broadcast:', err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @route   GET /api/public/status
// @desc    Lightweight check for maintenance mode (for ProtectedRoute)
router.get('/status', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT value FROM public.system_settings WHERE key = 'maintenance_mode'`
    );
    const maintenance = result.rows.length > 0 && result.rows[0].value === 'true';
    
    if (maintenance) {
      return res.status(503).json({ success: false, error: 'MAINTENANCE_MODE', maintenance: true });
    }
    
    return res.status(200).json({ success: true, maintenance: false });
  } catch (err) {
    console.error('Error fetching system status:', err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @route   GET /api/public/auth-policy
// @desc    Whether 2FA is on; the client only uses it to show setup UI and redirects
router.get('/auth-policy', (req, res) => {
  res.json({ success: true, mfaEnabled: isMfaEnforced() });
});

// @route   GET /api/public/barangays
router.get('/barangays', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM public.barangays ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching barangays:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
module.exports.clearBroadcastCache = () => {
  cachedBroadcast = null;
};
