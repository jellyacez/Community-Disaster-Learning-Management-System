// @desc    Prevents direct API access via browser navigation by inspecting headers
// @access  Global API routes
const apiSecurityMiddleware = (req, res, next) => {
  // SEC-009 Fix: Removed the x-lms-client header check as it was security theater.
  // We rely on standard session cookies, CORS policies, and CSRF protection instead.

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
