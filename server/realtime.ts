import http from "http";
import { WebSocket, WebSocketServer } from "ws";
import { insertAuditLog } from "./audit";
import { getActiveDeviceBySignature } from "./auth";
import { getActiveDeviceByToken, updateDevicePresence } from "./devices";
import { stripConfiguredPublicBasePath } from "./publicBaseUrl";

const wsClients = new Map<string, WebSocket>();

export function broadcastRealtime(payload: unknown) {
  const message = JSON.stringify(payload);
  for (const client of wsClients.values()) {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  }
}

export function sendRealtimeToDevice(deviceId: string, payload: unknown) {
  const client = wsClients.get(deviceId);
  if (!client || client.readyState !== WebSocket.OPEN) return false;
  client.send(JSON.stringify(payload));
  return true;
}

export function getOnlineDeviceCount() {
  return wsClients.size;
}

export function isDeviceOnline(deviceId: string) {
  return wsClients.has(deviceId);
}

export function closeDeviceConnection(deviceId: string, reason = "Device disconnected") {
  const client = wsClients.get(deviceId);
  if (client) client.close(1008, reason);
  wsClients.delete(deviceId);
}

export function attachRealtimeServer(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (stripConfiguredPublicBasePath(url.pathname) !== "/api/v1/ws") {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws: WebSocket) => {
    let authenticatedDeviceId: string | null = null;
    const authTimer = setTimeout(() => {
      if (!authenticatedDeviceId) ws.close(1008, "Authentication required");
    }, 5000);

    ws.on("message", (raw) => {
      try {
        const event = JSON.parse(raw.toString());
        if (!authenticatedDeviceId) {
          if (event?.type !== "auth") {
            ws.send(JSON.stringify({ type: "error", message: "Authentication required", timestamp: Date.now() }));
            return;
          }

          const device = getActiveDeviceByToken(String(event.deviceId || ""), String(event.accessToken || "")) || getActiveDeviceBySignature({
            deviceId: String(event.deviceId || ""),
            method: "WS",
            path: "/api/v1/ws",
            bodyHash: "",
            timestamp: String(event.timestamp || ""),
            nonce: String(event.nonce || ""),
            signature: String(event.signature || ""),
          });
          if (!device) {
            ws.close(1008, "Invalid device credential");
            return;
          }

          clearTimeout(authTimer);
          const now = Date.now();
          authenticatedDeviceId = device.id;
          updateDevicePresence(device.id, "online", now);
          insertAuditLog("device_online", "device", device.id, undefined, "device", device.id);
          wsClients.set(device.id, ws);
          ws.send(JSON.stringify({ type: "auth.ok", deviceId: device.id, timestamp: now }));
          broadcastRealtime({ type: "device.online", deviceId: device.id, timestamp: now });
          return;
        }

        if (event?.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          return;
        }

        broadcastRealtime({
          ...event,
          sourceDeviceId: authenticatedDeviceId,
          timestamp: event?.timestamp || Date.now(),
        });
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "Invalid realtime payload", timestamp: Date.now() }));
      }
    });

    ws.on("close", () => {
      clearTimeout(authTimer);
      if (!authenticatedDeviceId) return;
      const closedAt = Date.now();
      wsClients.delete(authenticatedDeviceId);
      updateDevicePresence(authenticatedDeviceId, "offline", closedAt);
      broadcastRealtime({ type: "device.offline", deviceId: authenticatedDeviceId, timestamp: closedAt });
    });
  });

  return wss;
}
