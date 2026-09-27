const verifyTurnstile = async (req, res, next) => {
  const token = req.headers["x-turnstile-token"] || req.body?.turnstileToken;

  if (!token) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Turnstile security token is missing.",
    });
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", process.env.TURNSTILE_SECRET_KEY);
    formData.append("response", token);
    formData.append("remoteip", req.ip);

    const cfResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    const outcome = await cfResponse.json();

    if (!outcome.success) {
      return res.status(403).json({
        error: "CAPTCHA_FAILED",
        message: "Failed security verification. Bot activity suspected.",
        details: outcome["error-codes"],
      });
    }

    next();
  } catch (err) {
    console.error("Turnstile verification error:", err);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Could not verify security challenge.",
    });
  }
};

module.exports = verifyTurnstile;