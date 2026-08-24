import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { config } from "./config.js";

export interface McpTool {
  name: string;
  description: string;
  // Schéma déjà en JSON Schema (compatible directement avec Anthropic.Tool.input_schema).
  inputSchema: Record<string, unknown>;
}

export interface McpToolResult {
  text: string;
  isError: boolean;
}

let client: Client | null = null;
let cachedTools: McpTool[] = [];

export async function startMcpClient(): Promise<void> {
  if (client) return;

  const transport = new StdioClientTransport({
    command: process.execPath, // node
    args: [config.mcp.serverEntry],
    // Le subprocess MCP a besoin de ses propres MCP_PG_* — on ne les passe pas
    // via process.env global pour éviter les collisions avec les vars agent.
    env: {
      ...process.env,
      ...config.mcp.subprocessEnv,
    } as Record<string, string>,
  });

  const c = new Client(
    { name: "juweirat-mcp-agent", version: "0.1.0" },
    { capabilities: {} },
  );
  await c.connect(transport);
  client = c;

  const listed = await c.listTools();
  cachedTools = listed.tools.map((t) => ({
    name: t.name,
    description: t.description ?? "",
    inputSchema: (t.inputSchema ?? { type: "object", properties: {} }) as Record<string, unknown>,
  }));

  console.log(`[agent] MCP client connecté : ${cachedTools.length} tools disponibles.`);
}

export function getTools(): McpTool[] {
  return cachedTools;
}

export async function callTool(name: string, args: unknown): Promise<McpToolResult> {
  if (!client) throw new Error("MCP client non initialisé — appelle startMcpClient() d'abord.");
  const res = await client.callTool({
    name,
    arguments: (args ?? {}) as Record<string, unknown>,
  });
  const contents = (res.content ?? []) as Array<{ type: string; text?: string }>;
  const text = contents
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text!)
    .join("\n\n");
  return { text, isError: res.isError === true };
}

export async function stopMcpClient(): Promise<void> {
  if (!client) return;
  try {
    await client.close();
  } catch (err) {
    console.error("[agent] Erreur close MCP client :", err);
  }
  client = null;
  cachedTools = [];
}
