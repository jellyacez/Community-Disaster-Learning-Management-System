const pool = require("../../config/db");
const ModuleProgressService = require("../../services/modules/ModuleProgressService");
const logger = require("../../utils/logger");
const { notifyUser } = require("../../services/notif/userNotificationService");

const getAllCertificates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "" } = req.query;
    
    // Construct admin context from req.user
    const adminContext = {
      role: req.user.role,
      barangay_id: req.user.barangay_id
    };

    const result = await ModuleProgressService.getAllCertificates(
      page,
      limit,
      search,
      status,
      adminContext
    );

    return res.json({ success: true, ...result });
  } catch (err) {
    if (err.message.startsWith("SECURITY_FAULT")) {
      logger.logError('admin_certificate_access_denied', { 
        userId: req.user?.id, 
        message: err.message 
      });
      return res.status(403).json({ success: false, error: err.message });
    }
    
    logger.logError('admin_certificate_fetch_error', { 
      userId: req.user?.id, 
      message: err.message, 
      stack: err.stack 
    });
    return res.status(500).json({ success: false, message: "`Server error fetching certificates." });
  }
};

const revokeCertificate = async (req, res) => {
  try {
    const { certId } = req.params;
    const { reason } = req.body;

    // Construct admin context from req.user
    const adminContext = {
      role: req.user.role,
      barangay_id: req.user.barangay_id
    };

    const adminUserId = req.user.id;

    await ModuleProgressService.revokeCertificate(certId, reason, adminContext, adminUserId);

    const { rows } = await pool.query(
      `SELECT c.user_id, m.modname FROM certificates c LEFT JOIN module_data m ON c.module_id = m.mod_id WHERE c.cert_id = $1`,
      [certId]
    );
    if (rows[0]) {
      notifyUser(
        rows[0].user_id,
        "certificate_revoked",
        `Your certificate for "${rows[0].modname || "a training module"}" was revoked. Reason: ${reason}`
      );
    }

    return res.json({ success: true, message: "Certificate revoked successfully." });
  } catch (err) {
    if (err.message.startsWith("SECURITY_FAULT")) {
      logger.logError('admin_certificate_revoke_denied', { 
        userId: req.user?.id, 
        certId: req.params.certId,
        message: err.message 
      });
      return res.status(403).json({ success: false, error: err.message });
    }

    if (err.message.startsWith("VALIDATION_ERROR") || err.message.startsWith("NOT_FOUND")) {
      return res.status(400).json({ success: false, error: err.message });
    }

    logger.logError('admin_certificate_revoke_error', { 
      userId: req.user?.id, 
      certId: req.params.certId,
      message: err.message, 
      stack: err.stack 
    });
    return res.status(500).json({ success: false, message: "`Server error revoking certificate." });
  }
};

const reinstateCertificate = async (req, res) => {
  try {
    const { certId } = req.params;
    const { reason } = req.body;

    const adminContext = {
      role: req.user.role,
      barangay_id: req.user.barangay_id
    };

    const adminUserId = req.user.id;

    await ModuleProgressService.reinstateCertificate(certId, reason, adminContext, adminUserId);

    return res.json({ success: true, message: "Certificate reinstated successfully." });
  } catch (err) {
    if (err.message.startsWith("SECURITY_FAULT")) {
      logger.logError('admin_certificate_reinstate_denied', {
        userId: req.user?.id,
        certId: req.params.certId,
        message: err.message
      });
      return res.status(403).json({ success: false, error: err.message });
    }

    if (err.message.startsWith("VALIDATION_ERROR") || err.message.startsWith("NOT_FOUND")) {
      return res.status(400).json({ success: false, error: err.message });
    }

    logger.logError('admin_certificate_reinstate_error', {
      userId: req.user?.id,
      certId: req.params.certId,
      message: err.message,
      stack: err.stack
    });
    return res.status(500).json({ success: false, message: "Server error reinstating certificate." });
  }
};

module.exports = {
  getAllCertificates,
  revokeCertificate,
  reinstateCertificate,
};
