import { z } from "zod";
import { query } from "../db.js";

// ─── get_revpar_snapshot ────────────────────────────────────────────────────
//
// Instantané financier pour la nuit courante. Répond à :
//   « quel est le vrai taux d'occupation ? » (pondéré par le tarif)
//   « combien je gagne cette nuit ? » (ADR, RevPAR)
//   « combien je perds en remise tarifaire ? » (discount loss)
//
// 3 vues d'occupation :
//   - byCount            : 14/19 = 73.68 %
//   - byStandardRateWeight : occupation pondérée par tarifNuit de la catégorie
//   - byRevenueCapture   : revenu réel / revenu potentiel max (au tarif standard)
//                          → seule vue qui reflète la remise consentie aux entreprises

export const inputSchema = z.object({});

export const definition = {
  name: "get_revpar_snapshot",
  description:
    "Instantané financier pour la nuit courante : occupation (par comptage ET pondérée par tarif catégorie), revenus (potentiel max, standard, réel encaissable), ADR, RevPAR, ventilation par type T1/T2/T3/T4. Répond à \"vrai taux d'occupation\", \"combien je gagne cette nuit\", \"perte due aux tarifs négociés\".",
  inputSchema,
} as const;

interface TotalsRow {
  total: number;
  occupied: number;
  potentialAtStandardRate: number;
  occupiedAtStandardRate: number;
  actualRevenue: number;
}

interface CategoryRow {
  pmsType: string;
  total: number;
  occupied: number;
  avgStandardRate: number;
  avgActualRate: number;
  potentialAtStandardRate: number;
  actualRevenue: number;
}

const CTE = `
  WITH pms_rooms AS (
    SELECT r.id, r."pmsType", rc."tarifNuit"
    FROM rooms r
    JOIN "roomCategories" rc ON rc.id = r."categoryId"
    WHERE r."pmsRoomNo" IS NOT NULL
  ),
  active_folio AS (
    SELECT DISTINCT ON (f."unitId")
      f."unitId", f.rate
    FROM folios f
    WHERE f.arrival <= CURRENT_DATE
      AND f.departure > CURRENT_DATE
      AND NOT f.closed
    ORDER BY f."unitId", f.id DESC
  )
`;

export async function handler(): Promise<string> {
  const [row] = await query<TotalsRow>(
    `
    ${CTE}
    SELECT
      COUNT(*)::int                                                                       AS total,
      COUNT(af."unitId")::int                                                             AS occupied,
      COALESCE(SUM(pms."tarifNuit"), 0)::bigint                                           AS "potentialAtStandardRate",
      COALESCE(SUM(pms."tarifNuit") FILTER (WHERE af."unitId" IS NOT NULL), 0)::bigint    AS "occupiedAtStandardRate",
      COALESCE(SUM(af.rate), 0)::bigint                                                   AS "actualRevenue"
    FROM pms_rooms pms
    LEFT JOIN active_folio af ON af."unitId" = pms.id
    `,
  );

  const byCategory = await query<CategoryRow>(
    `
    ${CTE}
    SELECT
      pms."pmsType",
      COUNT(*)::int                                                                       AS total,
      COUNT(af."unitId")::int                                                             AS occupied,
      AVG(pms."tarifNuit")::int                                                           AS "avgStandardRate",
      COALESCE(ROUND(AVG(af.rate) FILTER (WHERE af."unitId" IS NOT NULL))::int, 0)        AS "avgActualRate",
      COALESCE(SUM(pms."tarifNuit"), 0)::bigint                                           AS "potentialAtStandardRate",
      COALESCE(SUM(af.rate), 0)::bigint                                                   AS "actualRevenue"
    FROM pms_rooms pms
    LEFT JOIN active_folio af ON af."unitId" = pms.id
    GROUP BY pms."pmsType"
    ORDER BY pms."pmsType"
    `,
  );

  const today = new Date().toISOString().slice(0, 10);
  const potential = Number(row.potentialAtStandardRate);
  const occStd = Number(row.occupiedAtStandardRate);
  const actual = Number(row.actualRevenue);
  const occ = row.occupied;
  const total = row.total;

  const pct = (num: number, denom: number, digits = 2) =>
    denom === 0 ? 0 : Number(((num / denom) * 100).toFixed(digits));
  const rate = (num: number, denom: number) =>
    denom === 0 ? 0 : Number((num / denom).toFixed(4));

  return JSON.stringify(
    {
      date: today,
      currency: "XOF",
      rooms: { total, occupied: occ, free: total - occ },
      occupancy: {
        byCount: {
          value: rate(occ, total),
          percent: pct(occ, total),
          description: "Ratio brut chambres occupées / chambres disponibles",
        },
        byStandardRateWeight: {
          value: rate(occStd, potential),
          percent: pct(occStd, potential),
          description:
            "Occupation pondérée par le tarif standard (tarifNuit) de chaque catégorie — occuper une T4 pèse plus qu'occuper une T1",
        },
        byRevenueCapture: {
          value: rate(actual, potential),
          percent: pct(actual, potential),
          description:
            "Revenu réel de la nuit / revenu potentiel si TOUTES les chambres étaient louées au tarif standard. Reflète l'effet cumulé de la vacance ET des remises accordées (tarifs entreprise, forfaits mensuels).",
        },
      },
      revenue: {
        potentialAtStandardRate: potential,
        occupiedAtStandardRate: occStd,
        actualTonight: actual,
        discountLoss: occStd - actual,
        discountLossPct: pct(occStd - actual, occStd),
      },
      adr: occ ? Math.round(actual / occ) : 0,
      revpar: total ? Math.round(actual / total) : 0,
      byCategory: byCategory.map((c) => ({
        pmsType: c.pmsType,
        total: c.total,
        occupied: c.occupied,
        occupancyByCount: pct(c.occupied, c.total),
        avgStandardRate: c.avgStandardRate,
        avgActualRate: c.avgActualRate,
        potentialAtStandardRate: Number(c.potentialAtStandardRate),
        actualRevenue: Number(c.actualRevenue),
      })),
    },
    null,
    2,
  );
}
