const express = require("express");
const router = express.Router();
const sseService = require("../../services/notif/sseService");
const { authenticate } = require("../../middleware/authenticate");

router.get("/stream", authenticate, (req, res) => {
  // Set headers required for Server-Sent Events
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // Disables reverse-proxy buffering
  });

  // Initial connection ping
  res.write(": connected\n\n");

  const clientId = `${req.user?.id || "anon"}-${Date.now()}`;
  sseService.addClient(clientId, res, req.user);

  // Send a heartbeat every 25 seconds to keep the connection alive
  const heartbeat = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
  });
});

module.exports = router;