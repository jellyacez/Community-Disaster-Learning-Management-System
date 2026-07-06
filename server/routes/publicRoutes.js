const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// @route   GET /api/public/broadcast
// @desc    Get system-wide active broadcast
// @access  Public
router.get('/broadcast', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT key, value FROM public.system_settings WHERE key IN ('broadcast_active', 'broadcast_message')`
    );
    
    let active = false;
    let message = '';
    
    result.rows.forEach(row => {
      if (row.key === 'broadcast_active') active = row.value === 'true';
      if (row.key === 'broadcast_message') message = row.value;
    });
    
    res.json({ success: true, active, message });
  } catch (err) {
    console.error('Error fetching broadcast:', err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;
