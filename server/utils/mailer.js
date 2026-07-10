const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const originalSendMail = transporter.sendMail.bind(transporter);

transporter.sendMail = async function (mailOptions) {
  try {
    const result = await originalSendMail(mailOptions);
    // Reactive Check: Email sent successfully, clear any lingering SMTP alert
    require("../services/alertMonitorService").removeAlert("SMTP_DOWN");
    return result;
  } catch (error) {
    console.error("SMTP reactive failure intercepted:", error);
    require("../services/alertMonitorService").setAlert("SMTP_DOWN", {
      type: "danger",
      title: "SMTP Service Down",
      message: "Email gateway offline. Password resets and Admin provisioning emails are failing."
    });
    throw error;
  }
};

module.exports = { transporter };
