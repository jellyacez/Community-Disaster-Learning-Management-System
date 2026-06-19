const { createAuthMiddleware } = require("better-auth/api");
const { transporter } = require("./mailer");
const { getPasswordChangedEmail } = require("./emailTemplates");

const passwordChangeNotificationHook = createAuthMiddleware(async (ctx) => {
  if (
    ctx.path &&
    ctx.path.includes("change-password") &&
    ctx.response?.status === 200
  ) {
    const session = ctx.context?.session;
    const user = session?.user || ctx.context?.user;

    if (user && user.email) {
      const mailOptions = getPasswordChangedEmail(user);
      try {
        await transporter.sendMail(mailOptions);
        console.log("Password change notification email sent to", user.email);
      } catch (err) {
        console.error("Failed to send password change email:", err);
      }
    }
  }
});

module.exports = {
  passwordChangeNotificationHook,
};
