// @desc    Retrieves the certificate data (control no, barangay, and admin name)
// @access  Private
exports.getCertificateData = async (req, res) => {
  try {
    const userId = req.user.id; 
    
    // 1. Grab the resident's control number and their assigned barangay
    const userQuery = `
      SELECT "certControl_no", barangay 
      FROM "certificate" 
      WHERE id = $1
    `;
    const userRes = await pool.query(userQuery, [userId]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const resident = userRes.rows[0];

    // 2. Find the Administrator for that specific barangay
    const adminQuery = `
      SELECT name 
      FROM "user" 
      WHERE barangay = $1 AND role = 'barangay_admin'
      LIMIT 1
    `;
    const adminRes = await pool.query(adminQuery, [resident.barangay]);

    const adminName = adminRes.rows.length > 0 
      ? adminRes.rows[0].name 
      : "Pending Admin Assignment";

    // 3. Send all the gathered data back to the React frontend
    res.json({ 
      certControl_no: resident.certControl_no,
      resident_barangay: resident.barangay,
      admin_name: adminName
    });

  } catch (err) {
    console.error("Error fetching certificate data:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};
// --- End of getCertificateData ---