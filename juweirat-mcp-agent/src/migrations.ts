import { readdir, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { query, withTransaction } from "./db.js";

// Résout `migrations/` relatif au fichier compilé.
// En runtime Docker : /app/juweirat-mcp-agent/dist/migrations.js
//   → dossier attendu : /app/juweirat-mcp-agent/migrations/
// En dev (npm run dev) : src/migrations.ts (ts-node)
//   → dossier attendu : /repo/juweirat-mcp-agent/migrations/
const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(HERE, "..", "migrations");

/**
 * Applique toutes les migrations SQL présentes dans `migrations/`, sans rejouer
 * celles déjà enregistrées dans `_agent_migrations`. Ordre alphabétique
 * (convention YYYYMMDD_NNN_description.sql).
 *
 * Chaque migration s'exécute dans sa propre transaction : si elle échoue, l'état
 * de la base est rollbacké et l'agent refuse de démarrer.
 *
 * Les scripts DOIVENT être du SQL pur (pas de meta-commands psql `\d` / `\echo`).
 */
export async function runMigrations(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS "_agent_migrations" (
      "name"       TEXT PRIMARY KEY,
      "appliedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const applied = new Set(
    (await query<{ name: string }>('SELECT "name" FROM "_agent_migrations"'))
      .map((r) => r.name),
  );

  let files: string[];
  try {
    files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.log(`[migrations] Dossier ${MIGRATIONS_DIR} absent, rien à faire`);
      return;
    }
    throw err;
  }

  const pending = files.filter((f) => !applied.has(f));
  if (pending.length === 0) {
    console.log(`[migrations] Aucune migration à appliquer (${applied.size} déjà en base)`);
    return;
  }

  console.log(`[migrations] ${pending.length} migration(s) à appliquer : ${pending.join(", ")}`);

  for (const name of pending) {
    const sql = await readFile(resolve(MIGRATIONS_DIR, name), "utf-8");
    const t0 = Date.now();
    try {
      // Transaction unique par migration : le SQL + l'enregistrement du nom
      // partagent une connexion, on obtient l'atomicité (crash entre les deux
      // = ROLLBACK, retry propre au prochain boot).
      await withTransaction(async (q) => {
        await q(sql);
        await q('INSERT INTO "_agent_migrations" ("name") VALUES ($1)', [name]);
      });
      console.log(`[migrations] ✓ ${name} (${Date.now() - t0}ms)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Migration ${name} a échoué : ${message}`);
    }
  }
}
