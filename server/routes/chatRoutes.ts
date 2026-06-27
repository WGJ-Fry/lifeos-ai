import type express from "express";
import { insertAuditLog } from "../audit";
import { requireActor } from "../auth";
import { createChatSession, getChatSession, getChatSessions, getMessages, insertMessage } from "../chat";
import { broadcastRealtime } from "../realtime";

export function registerChatRoutes(app: express.Express) {
  app.get("/api/v1/chat/sessions", requireActor, (_req, res) => {
    res.json({ sessions: getChatSessions() });
  });

  app.post("/api/v1/chat/sessions", requireActor, (req, res) => {
    const session = createChatSession(req.body?.title);
    insertAuditLog("chat_session_created", "chat_session", session.id);
    res.json({ session });
  });

  app.get("/api/v1/chat/sessions/:sessionId/messages", requireActor, (req, res) => {
    const session = getChatSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Chat session not found" });
    res.json({ session, messages: getMessages(req.params.sessionId) });
  });

  app.post("/api/v1/chat/sessions/:sessionId/messages", requireActor, (req, res) => {
    const session = getChatSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Chat session not found" });

    const { role, content, sourceDeviceId, metadata } = req.body || {};
    if (!role || !content) return res.status(400).json({ error: "role and content are required" });
    if (!["user", "assistant", "system", "tool"].includes(role)) {
      return res.status(400).json({ error: "Invalid message role" });
    }

    const message = insertMessage(req.params.sessionId, role, content, sourceDeviceId, metadata);
    broadcastRealtime({
      type: "message.created",
      sessionId: req.params.sessionId,
      message,
      timestamp: message.createdAt,
    });
    res.json({ message });
  });
}
