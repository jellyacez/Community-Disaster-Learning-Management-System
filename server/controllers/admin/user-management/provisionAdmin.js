const pool = require("../../../config/db");
const { auth } = require("../../../utils/auth");
const crypto = require("crypto");
const { transporter } = require("../../../utils/mailer");
const { getAdminPasswordResetEmail } = require("../../../utils/emailTemplates");
const { getOrgSettings } = require("../../../utils/settings");

// @desc    Provision a new Admin Account
// @access  Private (system_admin only)
exports.provisionAdmin = async (req, res) => {
  const { name, email, role, barangay } = req.body;
  let { password } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ error: "Name, email, and role are required." });
  }

  const validRoles = ['barangay_admin', 'mdrrmo_admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid admin role specified." });
  }

  if (role === 'barangay_admin' && !barangay) {
    return res.status(400).json({ error: "Barangay is required for Barangay Admins." });
  }

  // Auto-generate password if not provided
  let isGenerated = false;
  if (!password) {
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const num = "0123456789";
    const special = "!@#$%^&*";
    const all = upper + lower + num + special;
    
    let pass = "";
    pass += upper[crypto.randomInt(upper.length)];
    pass += lower[crypto.randomInt(lower.length)];
    pass += num[crypto.randomInt(num.length)];
    pass += special[crypto.randomInt(special.length)];
    for(let i=0; i < 8; i++) pass += all[crypto.randomInt(all.length)];
    
    const arr = pass.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    password = arr.join('');
    isGenerated = true;
  }

  try {
    // Check if email already exists
    const existingUser = await pool.query('SELECT id FROM "user" WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "A user with this email already exists." });
    }

    // Let Better Auth handle user and account creation
    const resAuth = await auth.api.createUser({
      body: {
        email,
        password,
        name,
        role,
        data: {
          barangay: role === 'barangay_admin' ? barangay : 'Unassigned'
        }
      }
    });

    // Mark email as verified manually since admin provisioned it
    await pool.query('UPDATE "user" SET "emailVerified" = true WHERE id = $1', [resAuth.user.id]);
    
    const userId = resAuth.user.id;

    // Send email with credentials
    if (isGenerated) {
      try {
        const { orgFooterText, supportEmail } = await getOrgSettings();
        const mailOptions = getAdminPasswordResetEmail({ name, email }, password, orgFooterText, supportEmail);
        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error("Failed to send admin provisioning email:", emailError);
        return res.status(201).json({ 
          message: "Admin account provisioned successfully, but failed to send credentials email.",
          user: { id: userId, name, email, role, barangay },
          generatedPassword: password 
        });
      }
    }

    res.status(201).json({ 
      message: "Admin account provisioned successfully.",
      user: { id: userId, name, email, role, barangay },
      generatedPassword: isGenerated ? password : null
    });
  } catch (err) {
    console.error("Provisioning error:", err);
    res.status(500).json({ error: "Failed to provision admin account." });
  }
};
