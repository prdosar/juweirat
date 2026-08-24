import pg from "pg";
import { config } from "./config.js";

// Postgres retourne les NUMERIC en string par défaut pour préserver la précision.
// Nos montants (FCFA) sont des entiers ou 2 décimales max → on peut parser en number.
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v))); // NUMERIC
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));   // BIGINT (Juweirat : IDs restent < 2^53)

const pool = new pg.Pool({
  host: config.pg.host,
  port: config.pg.port,
  database: config.pg.database,
  user: config.pg.user,
  password: config.pg.password,
  max: 4,
  idleTimeoutMillis: 30_000,
  statement_timeout: config.queryTimeoutMs,
});

pool.on("error", (err) => {
  // Log sur stderr : stdout est réservé au protocole MCP (JSON-RPC).
  console.error("[juweirat-mcp] Pool error:", err.message);
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const res = await pool.query<T>(sql, params as unknown[]);
  return res.rows;
}

export async function closePool(): Promise<void> {
  await pool.end();
}
