import pg from "pg";
import { config } from "./config.js";

// BIGINT en number (nos IDs restent < 2^53).
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

const pool = new pg.Pool({
  host: config.pg.host,
  port: config.pg.port,
  database: config.pg.database,
  user: config.pg.user,
  password: config.pg.password,
  max: 8,
  idleTimeoutMillis: 30_000,
  statement_timeout: 10_000,
});

pool.on("error", (err) => {
  console.error("[agent] Pool error:", err.message);
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const res = await pool.query<T>(sql, params as unknown[]);
  return res.rows;
}

export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function closePool(): Promise<void> {
  await pool.end();
}
