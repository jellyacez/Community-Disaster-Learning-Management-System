const getResetPasswordEmail = (user, token) => ({
  from: process.env.EMAIL_USER,
  to: user.email,
  subject: "Reset your Password",
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Hello, ${user.name}!</h2>
      <p>You recently requested to reset your password for your DRRM Bacolor account. Click the button below to reset it.</p>
      <a href="http://localhost:5173/reset-password?token=${token}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
        Reset Password
      </a>
      <p style="margin-top: 20px; color: #666; font-size: 12px;">
        If you did not request a password reset, please ignore this email or contact support if you have concerns.
      </p>
    </div>
  `,
});

const getVerificationEmail = (user, token) => ({
  from: process.env.EMAIL_USER,
  to: user.email,
  subject: "Verify your Email Address",
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Welcome to DRRM Bacolor, ${user.name}!</h2>
      <p>Please click the button below to verify your email address and activate your account.</p>
      <a href="http://localhost:5173/verify-email?token=${token}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
        Verify Email
      </a>
      <p style="margin-top: 20px; color: #666; font-size: 12px;">
        If you did not create this account, please ignore this email.
      </p>
    </div>
  `,
});

const getPasswordChangedEmail = (user) => ({
  from: process.env.EMAIL_USER,
  to: user.email,
  subject: "Security Alert: Password Changed",
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Security Alert</h2>
      <p>Hello ${user.name || "User"},</p>
      <p>Your password for your DRRM Bacolor account was recently changed.</p>
      <p>If you did this, you can safely ignore this email.</p>
      <p style="color: #dc2626; font-weight: bold; margin-top: 20px;">
        If you did not request this change, please contact an administrator immediately.
      </p>
    </div>
  `,
});

module.exports = {
  getResetPasswordEmail,
  getVerificationEmail,
  getPasswordChangedEmail,
};
