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

/**
 * Exécute une série d'opérations dans une seule transaction, sur un client
 * dédié du pool. BEGIN/COMMIT/ROLLBACK sont gérés — l'appelant reçoit une
 * fonction `q` qui route ses requêtes sur ce client.
 *
 * Nécessaire quand plusieurs requêtes doivent partager la même connexion
 * (transactions, LOCK, SET LOCAL). `query()` sinon prend un client random du
 * pool à chaque appel → BEGIN d'un côté, COMMIT de l'autre = pas de transaction.
 */
export async function withTransaction<T>(
  fn: (q: (sql: string, params?: readonly unknown[]) => Promise<pg.QueryResult>) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Si `params` absent → mode "simple query" pg (multi-statement autorisé),
    // sinon "extended query" (statement unique + placeholders $1, $2…).
    // Nécessaire pour les migrations SQL qui contiennent parfois plusieurs
    // instructions dans un même fichier.
    const q = (sql: string, params?: readonly unknown[]) =>
      params ? client.query(sql, params as unknown[]) : client.query(sql);
    const result = await fn(q);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
