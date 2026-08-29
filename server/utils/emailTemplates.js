const getResetPasswordEmail = require("./templates/resetPassword");
const getVerificationEmail = require("./templates/verification");
const {
  getPasswordChangedEmail,
  getNewDeviceLoginEmail,
  getPasswordRecoveredEmail,
} = require("./templates/securityAlerts");
const getOTPEmail = require("./templates/otp");
const getAdminPasswordResetEmail = require("./templates/adminPasswordReset");
const getRecertificationReminderEmail = require("./templates/recertificationReminder");

module.exports = {
  getResetPasswordEmail,
  getVerificationEmail,
  getPasswordChangedEmail,
  getNewDeviceLoginEmail,
  getPasswordRecoveredEmail,
  getOTPEmail,
  getAdminPasswordResetEmail,
  getRecertificationReminderEmail,
};
