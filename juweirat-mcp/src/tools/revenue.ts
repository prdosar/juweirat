import { z } from "zod";
import { query } from "../db.js";
import { config } from "../config.js";
import { assertPeriod } from "../util/dates.js";

// Source de vérité CA : `accountMovements` avec reason='Encaissement'.
// Convention Juweirat : tout encaissement effectif = mouvement Client → CashRegister.
// Le breakdown par méthode se fait via le compte destinataire (une caisse par canal).

const BREAKDOWNS = ["none", "day", "cash_register", "source_type"] as const;

export const inputSchema = z.object({
  from: z.string().describe("Date de début (YYYY-MM-DD, incluse)."),
  to: z.string().describe("Date de fin (YYYY-MM-DD, incluse)."),
  breakdown: z
    .enum(BREAKDOWNS)
    .default("none")
    .describe(
      "Ventilation : 'none' (total seul), 'day' (par jour), 'cash_register' (par caisse : espèces / banque / mobile money…), 'source_type' (Payment web vs VenteDirecte PMS vs Folio).",
    ),
});

export type RevenueInput = z.infer<typeof inputSchema>;

export const definition = {
  name: "get_revenue",
  description:
    "Retourne le CA encaissé (en FCFA) sur une période depuis `accountMovements` (reason='Encaissement'). " +
    "Ventilation optionnelle par jour, par caisse destinataire ou par type de source métier.",
  inputSchema,
} as const;

type TotalRow = { total: number; count: number };
type BreakdownRow = { key: string; total: number; count: number };

export async function handler(input: RevenueInput): Promise<string> {
  assertPeriod(input.from, input.to);

  const [totalRow] = await query<TotalRow>(
    `
    SELECT COALESCE(SUM(amount), 0)::float8 AS total, COUNT(*)::int AS count
    FROM "accountMovements"
    WHERE reason = 'Encaissement'
      AND date >= $1::date
      AND date <  ($2::date + INTERVAL '1 day')
    `,
    [input.from, input.to],
  );

  const result: Record<string, unknown> = {
    period: { from: input.from, to: input.to },
    currency: "XOF",
    total: totalRow.total,
    encaissementsCount: totalRow.count,
  };

  if (input.breakdown === "day") {
    const rows = await query<BreakdownRow>(
      `
      SELECT to_char(date::date, 'YYYY-MM-DD') AS key,
             SUM(amount)::float8 AS total,
             COUNT(*)::int AS count
      FROM "accountMovements"
      WHERE reason = 'Encaissement'
        AND date >= $1::date
        AND date <  ($2::date + INTERVAL '1 day')
      GROUP BY key
      ORDER BY key
      LIMIT $3
      `,
      [input.from, input.to, config.maxRows],
    );
    result.byDay = rows;
  } else if (input.breakdown === "cash_register") {
    const rows = await query<BreakdownRow>(
      `
      SELECT COALESCE(a.name, '(inconnu)') AS key,
             SUM(m.amount)::float8 AS total,
             COUNT(*)::int AS count
      FROM "accountMovements" m
      JOIN accounts a ON a.id = m."toAccountId"
      WHERE m.reason = 'Encaissement'
        AND m.date >= $1::date
        AND m.date <  ($2::date + INTERVAL '1 day')
      GROUP BY key
      ORDER BY total DESC
      LIMIT $3
      `,
      [input.from, input.to, config.maxRows],
    );
    result.byCashRegister = rows;
  } else if (input.breakdown === "source_type") {
    const rows = await query<BreakdownRow>(
      `
      SELECT COALESCE("sourceType", '(non renseigné)') AS key,
             SUM(amount)::float8 AS total,
             COUNT(*)::int AS count
      FROM "accountMovements"
      WHERE reason = 'Encaissement'
        AND date >= $1::date
        AND date <  ($2::date + INTERVAL '1 day')
      GROUP BY key
      ORDER BY total DESC
      LIMIT $3
      `,
      [input.from, input.to, config.maxRows],
    );
    result.bySourceType = rows;
  }

  return JSON.stringify(result, null, 2);
}
