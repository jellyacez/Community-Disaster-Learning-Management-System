// Impersonation swaps req.user for the target, so writes that are attributed to a user (module
// authorship, reviews) must come from the real account. Mount after authenticate.
const refuseWhileImpersonating = (action) => (req, res, next) => {
  if (req.isImpersonating || req.impersonator || req.user?.isImpersonated) {
    return res.status(403).json({
      success: false,
      code: "IMPERSONATION_FORBIDDEN",
      message: `Exit impersonation before ${action}.`,
    });
  }
  next();
};

module.exports = refuseWhileImpersonating;
