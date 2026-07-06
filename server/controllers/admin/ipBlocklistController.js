const pool = require("../../config/db");

// @desc    Get all blocked IPs
// @access  Private (system_admin only)
exports.getBlockedIps = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, ip_address, reason, created_at FROM public.blocked_ips ORDER BY created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching blocked IPs:", err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

// @desc    Add a blocked IP
// @access  Private (system_admin only)
exports.addBlockedIp = async (req, res) => {
  const { ip_address, reason } = req.body;
  if (!ip_address) {
    return res.status(400).json({ success: false, error: "IP address is required" });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO public.blocked_ips (ip_address, reason) VALUES ($1, $2) RETURNING *`,
      [ip_address, reason || '']
    );
    res.status(201).json({ success: true, data: result.rows[0], message: "IP blocked successfully" });
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(400).json({ success: false, error: "IP address is already blocked" });
    }
    console.error("Error adding blocked IP:", err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

// @desc    Remove a blocked IP
// @access  Private (system_admin only)
exports.removeBlockedIp = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM public.blocked_ips WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Blocked IP not found" });
    }
    res.json({ success: true, message: "IP unblocked successfully" });
  } catch (err) {
    console.error("Error removing blocked IP:", err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};
