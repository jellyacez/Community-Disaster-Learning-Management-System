const ModuleProgressService = require("../services/modules/ModuleProgressService");
const logger = require("../utils/logger");
const { validate: isUUID } = require("uuid");

const verifyCertificate = async (req, res) => {
  const { token } = req.params;

  // same response for malformed and unknown tokens
  const notFoundResponse = { success: false, message: "`Certificate not found." };

  if (!token || !isUUID(token)) {
    return res.status(404).json(notFoundResponse);
  }

  try {
    const cert = await ModuleProgressService.verifyCertificateByToken(token);

    if (!cert) {
      return res.status(404).json(notFoundResponse);
    }

    // public endpoint: learner name, module title, dates and status only; no PII (email, user_id, cert_rec)
    return res.json({
      success: true,
      data: {
        learner_name: cert.learner_name,
        module_title: cert.module_title,
        completion_date: cert.completion_date,
        expires_at: cert.expires_at,
        status: cert.status, // computed in the query: expired once expires_at < NOW()
      }
    });

  } catch (err) {
    logger.logError('certificate_verification_failure', { 
      token, 
      message: err.message, 
      stack: err.stack 
    });
    return res.status(500).json({ success: false, message: "`Server error during verification." });
  }
};

module.exports = {
  verifyCertificate
};

