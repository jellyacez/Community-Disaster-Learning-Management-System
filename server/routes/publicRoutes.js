const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Simple in-memory cache to prevent database DoS attacks
let cachedBroadcast = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

// @route   GET /api/public/broadcast
// @desc    Get system-wide active broadcast
// @access  Public
router.get('/broadcast', async (req, res) => {
  try {
    const now = Date.now();
    
    // Serve from cache if valid
    if (cachedBroadcast && (now - lastFetchTime < CACHE_TTL_MS)) {
      return res.json(cachedBroadcast);
    }

    // Otherwise, hit the database
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
    
    // Update cache
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
// @access  Public
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

module.exports = router;
