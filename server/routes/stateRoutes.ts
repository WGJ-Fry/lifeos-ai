import type express from "express";
import { insertAuditLog } from "../audit";
import { requireActor } from "../auth";
import { getClientState, isAllowedClientStateKey, publicClientState, setClientState } from "../clientState";
import { broadcastRealtime } from "../realtime";

export function registerStateRoutes(app: express.Express) {
  app.get("/api/v1/state/:key", requireActor, (req, res) => {
    const key = req.params.key;
    if (!isAllowedClientStateKey(key)) return res.status(400).json({ error: "Invalid state key" });
    const state = getClientState(key);
    if (!state) return res.status(404).json({ error: "State not found" });
    res.json(publicClientState(state));
  });

  app.put("/api/v1/state/:key", requireActor, (req, res) => {
    const key = req.params.key;
    if (!isAllowedClientStateKey(key)) return res.status(400).json({ error: "Invalid state key" });
    let state;
    try {
      state = setClientState(key, req.body?.value, (req as any).actor);
    } catch (error: any) {
      if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message || "Invalid state payload" });
      return res.status(413).json({ error: error.message || "State payload is too large" });
    }
    insertAuditLog("client_state_updated", "client_state", key, { key }, (req as any).actor?.type, (req as any).actor?.id);
    const publicState = publicClientState(state);
    broadcastRealtime({ type: "client_state.updated", key, state: publicState, timestamp: state?.updatedAt || Date.now() });
    res.json(publicState);
  });
}
