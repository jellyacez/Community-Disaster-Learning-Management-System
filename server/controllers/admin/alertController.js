const alertMonitorService = require("../../services/alertMonitorService");

exports.getActiveAlerts = (req, res) => {
  try {
    const alerts = alertMonitorService.getActiveAlerts();
    return res.status(200).json({ data: alerts });
  } catch (error) {
    console.error("Failed to fetch active alerts", error);
    return res.status(500).json({ error: "Failed to fetch active alerts" });
  }
};
