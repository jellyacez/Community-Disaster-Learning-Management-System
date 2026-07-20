const ModuleProgressService = require("../services/modules/ModuleProgressService");
const logger = require("../utils/logger");
const { validate: isUUID } = require("uuid");

const verifyCertificate = async (req, res) => {
  const { token } = req.params;

  // 1. Identical generic response for malformed and not-found
  const notFoundResponse = { success: false, error: "Certificate not found." };

  if (!token || !isUUID(token)) {
    return res.status(404).json(notFoundResponse);
  }

  try {
    const cert = await ModuleProgressService.verifyCertificateByToken(token);

    if (!cert) {
      return res.status(404).json(notFoundResponse);
    }

    // 2. Return ONLY learner display name, module title, completion_date, expires_at, status
    // No PII (email, user_id, cert_rec, etc.)
    return res.json({
      success: true,
      data: {
        learner_name: cert.learner_name,
        module_title: cert.module_title,
        completion_date: cert.completion_date,
        expires_at: cert.expires_at,
        status: cert.status, // Live-computed in the query (expired if expires_at < NOW())
      }
    });

  } catch (err) {
    // 3. Any new catch blocks use logger.logError
    logger.logError('certificate_verification_failure', { 
      token, 
      message: err.message, 
      stack: err.stack 
    });
    return res.status(500).json({ success: false, error: "Server error during verification." });
  }
};

module.exports = {
  verifyCertificate
};
