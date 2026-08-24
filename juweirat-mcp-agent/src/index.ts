#!/usr/bin/env node
import express from "express";
import { config } from "./config.js";
import { startMcpClient, stopMcpClient, getTools } from "./mcp-client.js";
import { closePool } from "./db.js";
import chatRouter from "./routes/chat.js";

async function main(): Promise<void> {
  await startMcpClient();
  console.log(`[agent] Tools MCP disponibles : ${getTools().map((t) => t.name).join(", ")}`);

  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // Health check public (pas d'auth) — utile pour le nginx healthcheck.
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      model: config.openai.model,
      toolsCount: getTools().length,
    });
  });

  app.use("/api/chat", chatRouter);

  const server = app.listen(config.port, () => {
    console.log(`[agent] Serveur HTTP en écoute sur http://127.0.0.1:${config.port}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[agent] Signal ${signal} reçu, arrêt propre…`);
    server.close();
    await stopMcpClient();
    await closePool();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[agent] Démarrage échoué :", err);
  process.exit(1);
});
