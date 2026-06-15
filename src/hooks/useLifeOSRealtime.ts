import { useEffect, useRef, useState } from "react";
import { createDeviceWebSocketAuthMessage, getStoredDeviceCredentialAsync, rotateDeviceToken } from "../services/lifeosApi";

export type RealtimeStatus = "unbound" | "connecting" | "connected" | "offline";

export function useLifeOSRealtime() {
  const [status, setStatus] = useState<RealtimeStatus>("unbound");
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const retryRef = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;

    const connect = async () => {
      let credential = await getStoredDeviceCredentialAsync();
      if (!credential) {
        setStatus("unbound");
        return;
      }
      if (credential.accessToken && credential.accessTokenExpiresAt && credential.accessTokenExpiresAt - Date.now() < 7 * 24 * 60 * 60 * 1000) {
        credential = await rotateDeviceToken().catch(() => credential);
      }

      setStatus("connecting");
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${protocol}://${window.location.host}/api/v1/ws`);
      socketRef.current = ws;

      let heartbeat: number | undefined;

      ws.onopen = async () => {
        const authMessage = await createDeviceWebSocketAuthMessage();
        if (!authMessage) {
          ws.close(1008, "Missing device credential");
          setStatus("unbound");
          return;
        }
        ws.send(JSON.stringify(authMessage));
        setLastEventAt(Date.now());
        heartbeat = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
          }
        }, 25_000);
      };

      ws.onmessage = async (message) => {
        try {
          const event = JSON.parse(message.data);
          if (event?.type === "auth.ok") {
            retryRef.current = 0;
            setStatus("connected");
          }
          if (event?.type === "device.token.rotate_requested") {
            const currentCredential = await getStoredDeviceCredentialAsync();
            if (currentCredential?.accessToken) rotateDeviceToken().catch(() => null);
          }
        } catch {}
        setLastEventAt(Date.now());
      };

      ws.onerror = () => {
        setStatus("offline");
      };

      ws.onclose = () => {
        if (heartbeat) window.clearInterval(heartbeat);
        if (stoppedRef.current) return;
        setStatus("offline");
        const delay = Math.min(30_000, 1000 * 2 ** retryRef.current);
        retryRef.current += 1;
        window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      stoppedRef.current = true;
      socketRef.current?.close();
    };
  }, []);

  return { status, lastEventAt };
}
