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
    // .env absent → variables lues depuis l'environnement uniquement.
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
  pg: {
    host: process.env.MCP_PG_HOST ?? "localhost",
    port: intFromEnv("MCP_PG_PORT", 5432),
    database: process.env.MCP_PG_DATABASE ?? "juweirat",
    user: required("MCP_PG_USER"),
    password: required("MCP_PG_PASSWORD"),
  },
  queryTimeoutMs: intFromEnv("MCP_QUERY_TIMEOUT_MS", 5000),
  maxRows: intFromEnv("MCP_MAX_ROWS", 200),
} as const;
