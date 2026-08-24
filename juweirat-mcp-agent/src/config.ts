import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv(): void {
  const path = resolve(process.cwd(), ".env");
  try {
    const raw = readFileSync(path, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^"(.*)"$/, "$1");
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env absent — variables lues depuis l'environnement uniquement.
  }
}

loadDotEnv();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`);
  return v;
}

function intFromEnv(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) throw new Error(`${name} doit être un entier, reçu : ${v}`);
  return n;
}

export const config = {
  port: intFromEnv("PORT", 3010),

  openai: {
    apiKey: required("OPENAI_API_KEY"),
    model: process.env.AGENT_MODEL ?? "gpt-4o-mini",
    maxTokens: intFromEnv("AGENT_MAX_TOKENS", 4096),
    maxToolIterations: intFromEnv("AGENT_MAX_TOOL_ITERATIONS", 8),
  },

  jwt: {
    secret: required("JWT_SECRET"),
    issuer: process.env.JWT_ISSUER ?? "juweirat-api",
    audience: process.env.JWT_AUDIENCE ?? "juweirat-clients",
  },

  pg: {
    host: process.env.AGENT_PG_HOST ?? "127.0.0.1",
    port: intFromEnv("AGENT_PG_PORT", 5432),
    database: process.env.AGENT_PG_DATABASE ?? "juweirat",
    user: required("AGENT_PG_USER"),
    password: required("AGENT_PG_PASSWORD"),
  },

  mcp: {
    // Chemin absolu au bootstrap.
    serverEntry: resolve(process.cwd(), process.env.MCP_SERVER_ENTRY ?? "../juweirat-mcp/dist/index.js"),
    // Env à propager au subprocess MCP — le user RO Postgres est différent.
    subprocessEnv: {
      MCP_PG_HOST: process.env.MCP_PG_HOST ?? "127.0.0.1",
      MCP_PG_PORT: process.env.MCP_PG_PORT ?? "5432",
      MCP_PG_DATABASE: process.env.MCP_PG_DATABASE ?? "juweirat",
      MCP_PG_USER: required("MCP_PG_USER"),
      MCP_PG_PASSWORD: required("MCP_PG_PASSWORD"),
    },
  },
} as const;
