import { z } from "zod";
import { query } from "../db.js";
import { config } from "../config.js";
import { assertDate, assertPeriod } from "../util/dates.js";

// ─── get_folio ───────────────────────────────────────────────────────────────

export const getInputSchema = z.object({
  identifier: z
    .string()
    .describe("Numéro folio (ex. 'FL-2026-0001'), ID numérique, ou ID de réservation liée (préfixer 'res:')."),
});

export const getDefinition = {
  name: "get_folio",
  description:
    "Retourne le détail complet d'un folio PMS : logement, client, dates, tarif, hébergement, prestations, encaissement, postings (main courante).",
  inputSchema: getInputSchema,
} as const;

export async function getHandler(input: z.infer<typeof getInputSchema>): Promise<string> {
  let where: string;
  let param: string | number;

  if (input.identifier.startsWith("res:")) {
    where = `f."reservationId" = $1::bigint`;
    param = Number(input.identifier.slice(4));
  } else if (/^\d+$/.test(input.identifier)) {
    where = "f.id = $1::bigint";
    param = Number(input.identifier);
  } else {
    where = "f.number = $1";
    param = input.identifier;
  }

  const rows = await query<Record<string, unknown>>(
    `
    SELECT
      f.id, f.number,
      f."unitId", u."roomNumber", u."pmsRoomNo", u."pmsType",
      f.guest, f.nom, f.prenom, f.societe, f.reservataire,
      f.segment, f.pax,
      to_char(f.arrival, 'YYYY-MM-DD')   AS arrival,
      to_char(f.departure, 'YYYY-MM-DD') AS departure,
      f.rate, f.heb, f."tarifTier", f."elecIncluded",
      f."pdjParJour", f."pdjPrix", f.kwh, f.debiteur, f.dependances,
      f.arrhes, f.paid, f."payMode", f."factRecipient",
      f."tvaExonere",
      f."resaStatus", f."checkedIn", f.closed,
      to_char(f."checkoutDate", 'YYYY-MM-DD') AS "checkoutDate",
      f.note,
      f."reservationId", r.reference AS "reservationRef",
      f."factureId", fa.number AS "factureNumber", fa.status AS "factureStatus",
      f."createdAt"
    FROM folios f
    JOIN rooms u ON u.id = f."unitId"
    LEFT JOIN reservations r ON r.id = f."reservationId"
    LEFT JOIN factures fa ON fa.id = f."factureId"
    WHERE ${where}
    `,
    [param],
  );

  if (rows.length === 0) {
    return JSON.stringify({ found: false, identifier: input.identifier });
  }

  const folio = rows[0];
  const postings = await query(
    `SELECT id, to_char("dateHotel", 'YYYY-MM-DD') AS "dateHotel", famille, libelle, montant
     FROM postings WHERE "folioId" = $1 ORDER BY "dateHotel", id
     LIMIT $2`,
    [folio.id, config.maxRows],
  );

  return JSON.stringify({ found: true, folio, postings }, null, 2);
}

// ─── list_unpaid_folios ──────────────────────────────────────────────────────

export const unpaidInputSchema = z.object({
  minAmount: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Filtrer sur folios avec un dû ≥ à ce montant (FCFA)."),
  limit: z.number().int().min(1).max(200).default(50),
});

export const unpaidDefinition = {
  name: "list_unpaid_folios",
  description:
    "Liste les folios avec un solde restant dû (heb + prestations - paid > 0), triés par montant dû décroissant.",
  inputSchema: unpaidInputSchema,
} as const;

export async function unpaidHandler(input: z.infer<typeof unpaidInputSchema>): Promise<string> {
  // heb : si 0 → rate × (departure - arrival) ; sinon valeur directe.
  const rows = await query(
    `
    WITH folios_calc AS (
      SELECT
        f.id, f.number,
        u."pmsRoomNo",
        f.guest, f.societe,
        to_char(f.arrival, 'YYYY-MM-DD')   AS arrival,
        to_char(f.departure, 'YYYY-MM-DD') AS departure,
        f."resaStatus", f."checkedIn", f.closed,
        CASE WHEN f.heb = 0 THEN f.rate * (f.departure - f.arrival) ELSE f.heb END AS heb_effectif,
        f.paid,
        COALESCE(f."pdjParJour" * f."pdjPrix" * (f.departure - f.arrival), 0)
          + COALESCE(f.debiteur, 0)
          + COALESCE(f.dependances, 0) AS supplements
      FROM folios f
      JOIN rooms u ON u.id = f."unitId"
      WHERE NOT f.closed
    )
    SELECT
      id, number, "pmsRoomNo", guest, societe, arrival, departure, "resaStatus", "checkedIn",
      (heb_effectif + supplements)::int AS "totalDue",
      paid,
      (heb_effectif + supplements - paid)::int AS remaining
    FROM folios_calc
    WHERE (heb_effectif + supplements - paid) >= $1
    ORDER BY remaining DESC
    LIMIT $2
    `,
    [input.minAmount, input.limit],
  );

  const totalRemaining = rows.reduce((sum, r) => sum + ((r.remaining as number) ?? 0), 0);

  return JSON.stringify(
    { count: rows.length, currency: "XOF", totalRemaining, folios: rows },
    null,
    2,
  );
}

// ─── get_cash_report ─────────────────────────────────────────────────────────

export const cashInputSchema = z.object({
  date: z.string().describe("Jour concerné (YYYY-MM-DD)."),
});

export const cashDefinition = {
  name: "get_cash_report",
  description:
    "Rapport de caisse d'un jour : tous les mouvements accountMovements de cette date, groupés par raison et par caisse. Nécessite que le module compta ait été utilisé.",
  inputSchema: cashInputSchema,
} as const;

export async function cashHandler(input: z.infer<typeof cashInputSchema>): Promise<string> {
  assertDate("date", input.date);

  const byReason = await query(
    `
    SELECT reason, COUNT(*)::int AS count, SUM(amount)::float8 AS total
    FROM "accountMovements"
    WHERE date >= $1::date AND date < ($1::date + INTERVAL '1 day')
    GROUP BY reason
    ORDER BY total DESC
    `,
    [input.date],
  );

  const byRegister = await query(
    `
    SELECT COALESCE(dest.name, '(inconnu)') AS "cashRegister",
           SUM(m.amount)::float8 AS "amountIn",
           COUNT(*) FILTER (WHERE m.reason = 'Encaissement')::int AS "encaissements"
    FROM "accountMovements" m
    JOIN accounts dest ON dest.id = m."toAccountId"
    WHERE dest.kind = 'CashRegister'
      AND m.date >= $1::date AND m.date < ($1::date + INTERVAL '1 day')
    GROUP BY dest.name
    ORDER BY "amountIn" DESC
    `,
    [input.date],
  );

  const [total] = await query<{ totalMovements: number }>(
    `SELECT COUNT(*)::int AS "totalMovements"
     FROM "accountMovements"
     WHERE date >= $1::date AND date < ($1::date + INTERVAL '1 day')`,
    [input.date],
  );

  return JSON.stringify(
    { date: input.date, currency: "XOF", totalMovements: total.totalMovements, byReason, byRegister },
    null,
    2,
  );
}

// ─── get_tva_report ──────────────────────────────────────────────────────────

const TVA_RATE = 0.18;

export const tvaInputSchema = z.object({
  from: z.string().describe("Date de début (YYYY-MM-DD)."),
  to: z.string().describe("Date de fin (YYYY-MM-DD)."),
});

export const tvaDefinition = {
  name: "get_tva_report",
  description:
    "Rapport TVA sur la période : CA HT/TTC/TVA basé sur les folios (arrival dans la période), séparé exonéré vs assujetti (TVA 18%).",
  inputSchema: tvaInputSchema,
} as const;

export async function tvaHandler(input: z.infer<typeof tvaInputSchema>): Promise<string> {
  assertPeriod(input.from, input.to);

  const [row] = await query<{
    countAll: number;
    countExonere: number;
    revenuExonereTtc: number;
    revenuAssujettiTtc: number;
  }>(
    `
    SELECT
      COUNT(*)::int AS "countAll",
      COUNT(*) FILTER (WHERE "tvaExonere")::int AS "countExonere",
      COALESCE(SUM(
        CASE WHEN "tvaExonere"
          THEN (CASE WHEN heb = 0 THEN rate * (departure - arrival) ELSE heb END)
          ELSE 0
        END
      ), 0)::float8 AS "revenuExonereTtc",
      COALESCE(SUM(
        CASE WHEN NOT "tvaExonere"
          THEN (CASE WHEN heb = 0 THEN rate * (departure - arrival) ELSE heb END)
          ELSE 0
        END
      ), 0)::float8 AS "revenuAssujettiTtc"
    FROM folios
    WHERE arrival >= $1::date AND arrival <= $2::date
    `,
    [input.from, input.to],
  );

  const ht = row.revenuAssujettiTtc / (1 + TVA_RATE);
  const tva = row.revenuAssujettiTtc - ht;

  return JSON.stringify(
    {
      period: { from: input.from, to: input.to },
      currency: "XOF",
      tvaRate: TVA_RATE,
      folios: { total: row.countAll, exonere: row.countExonere, assujetti: row.countAll - row.countExonere },
      exonere: { ht: Math.round(row.revenuExonereTtc), tva: 0, ttc: Math.round(row.revenuExonereTtc) },
      assujetti: { ht: Math.round(ht), tva: Math.round(tva), ttc: Math.round(row.revenuAssujettiTtc) },
    },
    null,
    2,
  );
}

// ─── list_checkins_on ────────────────────────────────────────────────────────

export const checkinsOnInputSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : YYYY-MM-DD")
    .optional()
    .describe("Date au format YYYY-MM-DD. Si omis, utilise la date du jour côté serveur (UTC)."),
});

export const checkinsOnDefinition = {
  name: "list_checkins_on",
  description:
    "Liste les VRAIS check-ins effectués un jour donné (par défaut aujourd'hui) : filtre sur folios.checkedInAt (horodatage de l'événement, posé au moment où le staff appuie sur \"check-in\"). Utilise ce tool pour \"qui vient de faire un check-in\", \"combien de check-ins aujourd'hui\", \"check-ins du 25 août\". ⚠️ Différent de \"arrivées prévues\" (date planifiée) : Arrival est une date théorique, checkedInAt est l'événement réel. Les folios importés en batch au launch (checkedInAt null) N'apparaissent PAS ici.",
  inputSchema: checkinsOnInputSchema,
} as const;

export async function checkinsOnHandler(
  input: z.infer<typeof checkinsOnInputSchema>,
): Promise<string> {
  const dateParam = input.date ?? null;

  const [countRow] = await query<{ total: number }>(
    `
    SELECT COUNT(*)::int AS "total"
    FROM folios f
    WHERE f."checkedInAt" IS NOT NULL
      AND f."checkedInAt"::date = COALESCE($1::date, CURRENT_DATE)
    `,
    [dateParam],
  );

  const checkins = await query(
    `
    SELECT
      f.id                                                    AS "folioId",
      f.number                                                AS "folioNumber",
      to_char(f."checkedInAt", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "checkedInAt",
      to_char(f.arrival,   'YYYY-MM-DD')                     AS "arrival",
      to_char(f.departure, 'YYYY-MM-DD')                     AS "departure",
      f.pax,
      NULLIF(TRIM(COALESCE(f.prenom, '') || ' ' || COALESCE(f.nom, '')), '') AS "namePrenomNom",
      f.guest,
      f.societe,
      f."reservationId",
      r.reference                                             AS "reservationRef",
      f."unitId"                                              AS "roomId",
      u."pmsRoomNo",
      u."roomNumber",
      u."pmsType"
    FROM folios f
    LEFT JOIN reservations r ON r.id = f."reservationId"
    LEFT JOIN rooms u        ON u.id = f."unitId"
    WHERE f."checkedInAt" IS NOT NULL
      AND f."checkedInAt"::date = COALESCE($1::date, CURRENT_DATE)
    ORDER BY f."checkedInAt" ASC
    `,
    [dateParam],
  );

  return JSON.stringify(
    {
      date: dateParam ?? "CURRENT_DATE (UTC serveur)",
      count: countRow.total,
      checkins,
    },
    null,
    2,
  );
}

// ─── list_checkouts_on ───────────────────────────────────────────────────────

export const checkoutsOnInputSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : YYYY-MM-DD")
    .optional()
    .describe("Date au format YYYY-MM-DD. Si omis, utilise la date du jour côté serveur (UTC)."),
});

export const checkoutsOnDefinition = {
  name: "list_checkouts_on",
  description:
    "Liste les VRAIS check-outs effectués un jour donné (par défaut aujourd'hui) : filtre sur folios.checkoutDate (date posée au moment où le staff clique \"Départ\" dans le PMS). Utilise ce tool pour \"qui est parti\", \"quels clients ont quitté l'hôtel\", \"combien de départs aujourd'hui\", \"checkouts du 27 août\". ⚠️ Différent de \"départs prévus\" (date planifiée) : Departure est une date théorique, checkoutDate est l'événement réel. Les folios importés (checkoutDate null) N'apparaissent PAS ici.",
  inputSchema: checkoutsOnInputSchema,
} as const;

export async function checkoutsOnHandler(
  input: z.infer<typeof checkoutsOnInputSchema>,
): Promise<string> {
  const dateParam = input.date ?? null;

  const [countRow] = await query<{ total: number }>(
    `
    SELECT COUNT(*)::int AS "total"
    FROM folios f
    WHERE f."checkoutDate" IS NOT NULL
      AND f."checkoutDate" = COALESCE($1::date, CURRENT_DATE)
    `,
    [dateParam],
  );

  const checkouts = await query(
    `
    SELECT
      f.id                                           AS "folioId",
      f.number                                       AS "folioNumber",
      to_char(f."checkoutDate", 'YYYY-MM-DD')        AS "checkoutDate",
      to_char(f.arrival,   'YYYY-MM-DD')             AS "arrival",
      to_char(f.departure, 'YYYY-MM-DD')             AS "departure",
      f.pax,
      NULLIF(TRIM(COALESCE(f.prenom, '') || ' ' || COALESCE(f.nom, '')), '') AS "namePrenomNom",
      f.guest,
      f.societe,
      f."reservationId",
      r.reference                                    AS "reservationRef",
      f."unitId"                                     AS "roomId",
      u."pmsRoomNo",
      u."roomNumber",
      u."pmsType"
    FROM folios f
    LEFT JOIN reservations r ON r.id = f."reservationId"
    LEFT JOIN rooms u        ON u.id = f."unitId"
    WHERE f."checkoutDate" IS NOT NULL
      AND f."checkoutDate" = COALESCE($1::date, CURRENT_DATE)
    ORDER BY f.id ASC
    `,
    [dateParam],
  );

  return JSON.stringify(
    {
      date: dateParam ?? "CURRENT_DATE (UTC serveur)",
      count: countRow.total,
      checkouts,
    },
    null,
    2,
  );
}
