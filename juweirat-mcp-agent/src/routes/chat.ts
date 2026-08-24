import { Router, type Request, type Response } from "express";
import { requireAuth } from "../auth.js";
import {
  createSession,
  getSession,
  listMessages,
  listSessionsForUser,
} from "../sessions.js";
import { runTurn, type AgentEvent } from "../agent.js";

const router = Router();
router.use(requireAuth);

// ─── POST /api/chat/sessions ─────────────────────────────────────────────────
router.post("/sessions", async (req, res) => {
  const user = req.user!;
  const title = typeof req.body?.title === "string" ? req.body.title.trim().slice(0, 200) : undefined;
  const session = await createSession({ canal: "web", userId: user.id, title });
  res.status(201).json(session);
});

// ─── GET /api/chat/sessions ──────────────────────────────────────────────────
router.get("/sessions", async (req, res) => {
  const user = req.user!;
  const sessions = await listSessionsForUser(user.id);
  res.json({ sessions });
});

// ─── GET /api/chat/sessions/:id ──────────────────────────────────────────────
router.get("/sessions/:id", async (req, res) => {
  const user = req.user!;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id invalide" });
    return;
  }
  const session = await getSession(id);
  if (!session || session.userId !== user.id) {
    res.status(404).json({ error: "Session introuvable" });
    return;
  }
  const messages = await listMessages(id);
  res.json({ session, messages });
});

// ─── POST /api/chat/sessions/:id/message  (SSE) ──────────────────────────────
router.post("/sessions/:id/message", async (req: Request, res: Response) => {
  const user = req.user!;
  const id = Number(req.params.id);
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id invalide" });
    return;
  }
  if (!message) {
    res.status(400).json({ error: "message vide" });
    return;
  }

  const session = await getSession(id);
  if (!session || session.userId !== user.id) {
    res.status(404).json({ error: "Session introuvable" });
    return;
  }

  // ── SSE headers ────────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // désactive le buffering nginx
  res.flushHeaders();

  const sseEmit = (event: AgentEvent): void => {
    try {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (err) {
      // Client déconnecté — l'agent continue en arrière-plan pour terminer
      // la persistance mais on ne peut plus émettre.
      console.error("[agent] SSE write error:", err);
    }
  };

  // Heartbeat toutes les 15s pour garder la connexion ouverte à travers nginx.
  const heartbeat = setInterval(() => {
    try { res.write(": heartbeat\n\n"); } catch { /* client parti */ }
  }, 15_000);

  req.on("close", () => {
    clearInterval(heartbeat);
  });

  try {
    await runTurn({ sessionId: id, userMessage: message, emit: sseEmit });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    sseEmit({ type: "error", message: msg });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

export default router;
