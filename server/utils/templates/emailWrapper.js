const emailWrapper = (title, content, orgFooterText = "Community DRRM System - Bacolor, Pampanga.") => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px; color: #3f3f46;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
    <!-- Header -->
    <div style="background-color: #18181b; padding: 30px; text-align: center; border-bottom: 4px solid #ef4444;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">DRRM <span style="color: #ef4444;">Bacolor</span></h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="background-color: #fafafa; padding: 20px 30px; text-align: center; border-top: 1px solid #e4e4e7;">
      <p style="margin: 0; font-size: 13px; color: #71717a;">
        &copy; ${new Date().getFullYear()} ${orgFooterText}
      </p>
      <p style="margin: 5px 0 0; font-size: 12px; color: #a1a1aa;">
        This is an automated security message. Please do not reply directly to this email.
      </p>
    </div>
  </div>
</body>
</html>
`;

module.exports = emailWrapper;
