
class SSEService {
  constructor() {
    this.clients = new Map(); // clientId -> { res, userId, role, barangayId }
  }

  addClient(clientId, res, user) {
    this.clients.set(clientId, {
      res,
      userId: user?.id,
      role: user?.role,
      barangayId: user?.barangay_id,
    });

    res.on("close", () => {
      this.clients.delete(clientId);
    });
  }

  broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [, client] of this.clients) {
      client.res.write(payload);
    }
  }

  broadcastToRole(role, event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [, client] of this.clients) {
      if (client.role === role) {
        client.res.write(payload);
      }
    }
  }

  broadcastToBarangay(barangayId, event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [, client] of this.clients) {
      if (Number(client.barangayId) === Number(barangayId)) {
        client.res.write(payload);
      }
    }
  }

  // Broadcast only to clients matching a predicate on { userId, role, barangayId }
  broadcastWhere(filter, event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [, client] of this.clients) {
      if (filter(client)) {
        client.res.write(payload);
      }
    }
  }
}

module.exports = new SSEService();