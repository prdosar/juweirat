#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { closePool } from "./db.js";
import { tools } from "./tools/index.js";

async function main(): Promise<void> {
  const server = new McpServer({
    name: "juweirat-mcp",
    version: "0.1.0",
  });

  for (const tool of tools) {
    // McpServer.tool attend un ZodRawShape (l'objet .shape d'un ZodObject).
    // Toutes nos inputSchema sont des z.object(...), donc `.shape` existe.
    const shape = (tool.inputSchema as unknown as z.ZodObject<z.ZodRawShape>).shape;

    server.tool(tool.name, tool.description, shape, async (input) => {
      try {
        const text = await tool.handler(input);
        return { content: [{ type: "text", text }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: "text", text: `Erreur ${tool.name}: ${message}` }],
        };
      }
    });
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[juweirat-mcp] serveur MCP démarré (${tools.length} tools).`);

  const shutdown = async (): Promise<void> => {
    await closePool();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[juweirat-mcp] Démarrage échoué :", err);
  process.exit(1);
});
