const emailWrapper = require("./emailWrapper");

const getOTPEmail = (user, otp, orgFooterText, supportEmail) => ({
  from: `"DRRM Bacolor Security" <${supportEmail || process.env.EMAIL_USER}>`,
  to: user.email,
  subject: "Your Two-Factor Authentication Code",
  html: emailWrapper(
    "Authentication Code",
    `
    <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">Hello, ${user.name}!</h2>
    <p style="line-height: 1.6; font-size: 15px; color: #52525b;">Here is your One-Time Password (OTP) for Two-Factor Authentication:</p>
    
    <div style="text-align: center; margin: 35px 0;">
      <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ef4444; background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px 30px; border-radius: 8px; display: inline-block;">
        ${otp}
      </span>
    </div>

    <p style="line-height: 1.6; font-size: 14px; color: #52525b;">This code will expire shortly. Do not share this code with anyone, including DRRM administrators.</p>
    `,
    orgFooterText
  ),
});

module.exports = getOTPEmail;
