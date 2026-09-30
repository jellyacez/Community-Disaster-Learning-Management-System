const pool = require("../../../config/db");
const { auth } = require("../../../utils/auth");
const { transporter } = require("../../../utils/mailer");
const { getAdminPasswordResetEmail } = require("../../../utils/emailTemplates");
const { getOrgSettings } = require("../../../utils/settings");
const { generateSecurePassword } = require("../../../utils/passwordGenerator");
const { assertCanProvision } = require("../../../config/roleHierarchy");

// @desc    Provision a new Admin Account
// @access  Private (super_admin, system_admin, head_mdrrmo_admin, mdrrmo_admin)
exports.provisionAdmin = async (req, res) => {
  const { name, email, role, barangay } = req.body;
  let { password } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({
      success: false,
      error: "Name, email, and role are required.",
      message: "Name, email, and role are required.",
    });
  }

  const provisionableRoles = [
    "barangay_admin",
    "mdrrmo_admin",
    "head_mdrrmo_admin",
    "system_admin",
  ];

  if (!provisionableRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      error: "Invalid admin role specified.",
      message: "Invalid admin role specified.",
    });
  }

  // Hierarchy enforcement: super_admin bypasses
  if (req.user?.role !== "super_admin") {
    try {
      assertCanProvision(req.user.role, role);
    } catch (hierarchyErr) {
      require("../../../utils/logger").logError("provision_hierarchy_violation", {
        actorId: req.user?.id,
        actorRole: req.user?.role,
        requestedRole: role,
        message: hierarchyErr.message,
      });
      return res.status(403).json({
        success: false,
        error: hierarchyErr.message,
        message: hierarchyErr.message,
      });
    }
  }

  if (role === "barangay_admin" && !barangay) {
    return res.status(400).json({
      success: false,
      error: "Barangay is required for Barangay Admins.",
      message: "Barangay is required for Barangay Admins.",
    });
  }

  let isGenerated = false;
  if (!password) {
    password = generateSecurePassword();
    isGenerated = true;
  }

  try {
    const existingUser = await pool.query(
      'SELECT id FROM "user" WHERE email = $1',
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "A user with this email already exists.",
        message: "A user with this email already exists.",
      });
    }

    const resAuth = await auth.api.createUser({
      body: {
        email,
        password,
        name,
        role,
        data: {
          barangay: role === "barangay_admin" ? barangay : "Unassigned",
        },
      },
    });

    await pool.query('UPDATE "user" SET "emailVerified" = true WHERE id = $1', [
      resAuth.user.id,
    ]);

    const userId = resAuth.user.id;
    let emailSent = false;

    if (isGenerated) {
      try {
        const { orgFooterText, supportEmail } = await getOrgSettings();
        const mailOptions = getAdminPasswordResetEmail(
          { name, email },
          password,
          orgFooterText,
          supportEmail
        );
        await transporter.sendMail(mailOptions);
        emailSent = true;
      } catch (emailError) {
        console.warn(
          "SMTP gateway unavailable. Could not send provisioning email:",
          emailError.message
        );
      }
    }

    require("../../../utils/logger").logActivity(
      req.user.id,
      `Provisioned new admin account (${email} - ${role})`
    );

    return res.status(201).json({
      success: true,
      message: emailSent
        ? "Admin account provisioned successfully. Credentials sent to email."
        : "Admin account provisioned successfully. Email gateway offline.",
      user: { id: userId, name, email, role, barangay },
      generatedPassword: isGenerated ? password : undefined,
    });
  } catch (err) {
    console.error("Provisioning error:", err);

    const authMessage = err?.message || err?.body?.message || "";
    const authStatus = err?.status || err?.statusCode;

    if (
      authStatus === 422 ||
      authMessage.toLowerCase().includes("already exist") ||
      authMessage.toLowerCase().includes("duplicate")
    ) {
      return res.status(409).json({
        success: false,
        error: "A user with this email already exists in the auth system.",
        message: "A user with this email already exists in the auth system.",
      });
    }

    if (authStatus === 400 || authMessage.toLowerCase().includes("invalid")) {
      return res.status(400).json({
        success: false,
        error: `Invalid provisioning data: ${authMessage}`,
        message: `Invalid provisioning data: ${authMessage}`,
      });
    }

    return res.status(500).json({
      success: false,
      error: authMessage || "Failed to provision admin account. Check server logs.",
      message: authMessage || "Failed to provision admin account. Check server logs.",
    });
  }
};