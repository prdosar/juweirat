#!/usr/bin/env node
import express from "express";
import { config } from "./config.js";
import { startMcpClient, stopMcpClient, getTools } from "./mcp-client.js";
import { closePool } from "./db.js";
import chatRouter from "./routes/chat.js";
import telegramRouter from "./telegram/webhook.js";
import { startSignalRClient, stopSignalRClient } from "./notifications/signalr-client.js";

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
      telegram: config.telegram.enabled,
    });
  });

  app.use("/api/chat", chatRouter);

  if (config.telegram.enabled) {
    app.use("/telegram", telegramRouter);
    console.log(`[agent] Webhook Telegram monté sur /telegram/webhook (${config.telegram.adminIds.length} admin(s) whitelistés au bootstrap)`);

    // Angèle proactive : écoute le Hub SignalR .NET et broadcast aux staff Telegram.
    // Gated derrière telegram.enabled pour éviter les logs bruyants en dev sans bot.
    await startSignalRClient();
  } else {
    console.log("[agent] Telegram désactivé (TELEGRAM_BOT_TOKEN absent) — notifications SignalR non branchées");
  }

  const server = app.listen(config.port, () => {
    console.log(`[agent] Serveur HTTP en écoute sur http://127.0.0.1:${config.port}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[agent] Signal ${signal} reçu, arrêt propre…`);
    server.close();
    await stopSignalRClient();
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
