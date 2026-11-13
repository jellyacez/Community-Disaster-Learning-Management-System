// rejects direct browser navigation to the API
const apiSecurityMiddleware = (req, res, next) => {
  if (req.headers['sec-fetch-mode'] === 'navigate') {
    return res.status(403).json({ 
      error: "Forbidden", 
      message: "Direct API access via browser navigation is forbidden for security reasons." 
    });
  }

  // older browsers don't send sec-fetch-mode, so fall back to the Accept header
  const acceptHeader = req.headers['accept'] || "";
  if (acceptHeader.includes('text/html')) {
    return res.status(403).json({ 
      error: "Forbidden", 
      message: "Direct API access via browser navigation is forbidden for security reasons." 
    });
  }

  next();
};

module.exports = apiSecurityMiddleware;
