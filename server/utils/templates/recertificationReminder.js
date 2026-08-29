const emailWrapper = require("./emailWrapper");
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const getRecertificationReminderEmail = (user, cert, moduleTitle, daysRemaining, orgFooterText, supportEmail) => ({
  from: `"DRRM Bacolor Certifications" <${supportEmail || process.env.EMAIL_USER}>`,
  to: user.email,
  subject: `Action Required: Disaster Preparedness Certification Expiring in ${daysRemaining} Days`,
  html: emailWrapper(
    "Recertification Reminder",
    `
    <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">Hello, ${user.name || "Learner"}!</h2>
    <p style="line-height: 1.6; font-size: 15px; color: #52525b;">Your certification for <strong>${moduleTitle}</strong> is scheduled to expire on <strong>${new Date(cert.expires_at).toLocaleDateString()}</strong> (${daysRemaining} days remaining).</p>
    <p style="line-height: 1.6; font-size: 15px; color: #52525b;">To maintain your active responder credential and community disaster compliance status, please complete the recertification refresher training.</p>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="${FRONTEND_URL}/user/modules" style="background-color: #ef4444; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Start Recertification</a>
    </div>

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-top: 30px; border-radius: 0 6px 6px 0;">
      <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">Certificate Control No: ${cert.cert_rec || "CERT-" + cert.cert_id}</p>
    </div>
    `,
    orgFooterText
  ),
});

module.exports = getRecertificationReminderEmail;
