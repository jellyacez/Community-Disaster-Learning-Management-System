// @desc    Prevents direct API access via browser navigation by inspecting headers
// @access  Global API routes
const apiSecurityMiddleware = (req, res, next) => {
  // Enforce custom client header (prevents basic Postman/CURL access without header)
  if (req.headers['x-lms-client'] !== 'true') {
    return res.status(403).json({ 
      error: "Forbidden", 
      message: "Direct API access is forbidden. Missing required client header." 
    });
  }

  // If the browser natively reports that the user is trying to navigate to this API as a webpage
  if (req.headers['sec-fetch-mode'] === 'navigate') {
    return res.status(403).json({ 
      error: "Forbidden", 
      message: "Direct API access via browser navigation is forbidden for security reasons." 
    });
  }

  // Fallback for older browsers: Check if they are explicitly asking for an HTML webpage
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
