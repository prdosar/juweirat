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

  // Chambre effective = résa liée (source de vérité) sinon f.unitId (folio direct PMS).
  // Idem dates : la résa fait autorité si présente. Cf. PmsService.GetUnitsAsync et
  // le bug de drift remonté 2026-09-07 (folio FL-2026-0019 / appt 61).
  const rows = await query<Record<string, unknown>>(
    `
    SELECT
      f.id, f.number,
      COALESCE(r."roomId", f."unitId")    AS "unitId",
      u."roomNumber", u."pmsRoomNo", u."pmsType",
      -- Flag exposé pour que le staff sache si la chambre affichée provient de la résa
      -- ou du folio (utile en cas de drift à investiguer).
      (r."roomId" IS NOT NULL AND r."roomId" <> f."unitId") AS "unitDriftDetected",
      f.guest, f.nom, f.prenom, f.societe, f.reservataire,
      f.segment, f.pax,
      to_char(COALESCE(r."checkInDate",  f.arrival),   'YYYY-MM-DD') AS arrival,
      to_char(COALESCE(r."checkOutDate", f.departure), 'YYYY-MM-DD') AS departure,
      f.rate, f.heb, f."tarifTier", f."elecIncluded",
      f."pdjParJour", f."pdjPrix", f.kwh, f.debiteur, f.dependances,
      f.arrhes, f.paid, f."payMode", f."factRecipient",
      -- Exonération TVA : autoritative sur la résa liée si elle existe.
      COALESCE(r."tvaExonere", f."tvaExonere") AS "tvaExonere",
      f."resaStatus", f."checkedIn", f.closed,
      to_char(f."checkoutDate", 'YYYY-MM-DD') AS "checkoutDate",
      f.note,
      f."reservationId", r.reference AS "reservationRef",
      f."factureId", fa.number AS "factureNumber", fa.status AS "factureStatus",
      f."createdAt"
    FROM folios f
    LEFT JOIN reservations r ON r.id = f."reservationId"
    LEFT JOIN rooms u ON u.id = COALESCE(r."roomId", f."unitId")
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
    "Liste les folios avec un solde restant dû, triés par montant dû décroissant. Formule alignée sur TarifEngine.ComputeSolde (admin) : solde = max(0, TTC_total − paid − arrhes) où TTC_total = HT × 1,18 sauf tvaExonere, et HT = hébergement + prestations résa + PDJ + débiteur + dépendances. Exclut folios clôturés, Annulés et NoShow.",
  inputSchema: unpaidInputSchema,
} as const;

export async function unpaidHandler(input: z.infer<typeof unpaidInputSchema>): Promise<string> {
  // Aligné sur TarifEngine.ComputeSolde (TarifEngine.cs:27) :
  //   totalHt  = totalHeb + totalPrestations + totalPdj + totalDebiteur + totalDependances
  //   tva      = tvaExonere ? 0 : round(totalHt * 0.18)
  //   solde    = max(0, totalHt + tva - paid - arrhes)
  // Prestations : sum(reservationPrestations.totalLigne) via la résa liée.
  // Chambre/dates/tvaExonere : projetées via la résa liée (drift fix).
  const rows = await query(
    `
    WITH folios_calc AS (
      SELECT
        f.id, f.number,
        u."pmsRoomNo",
        f.guest, f.societe,
        to_char(COALESCE(r."checkInDate",  f.arrival),   'YYYY-MM-DD') AS arrival,
        to_char(COALESCE(r."checkOutDate", f.departure), 'YYYY-MM-DD') AS departure,
        f."resaStatus", f."checkedIn", f.closed,
        CASE
          WHEN f.heb = 0 THEN f.rate * (COALESCE(r."checkOutDate", f.departure) - COALESCE(r."checkInDate", f.arrival))
          ELSE f.heb
        END AS heb_effectif,
        f.paid, f.arrhes,
        COALESCE(r."tvaExonere", f."tvaExonere") AS tva_exonere,
        COALESCE(f."pdjParJour" * f."pdjPrix" * (COALESCE(r."checkOutDate", f.departure) - COALESCE(r."checkInDate", f.arrival)), 0) AS total_pdj,
        COALESCE(f.debiteur, 0)   AS total_debiteur,
        COALESCE(f.dependances, 0) AS total_dependances,
        COALESCE((
          SELECT SUM(rp."totalLigne")
          FROM "reservationPrestations" rp
          WHERE rp."reservationId" = f."reservationId"
        ), 0)::int AS total_prestations
      FROM folios f
      LEFT JOIN reservations r ON r.id = f."reservationId"
      LEFT JOIN rooms u ON u.id = COALESCE(r."roomId", f."unitId")
      WHERE NOT f.closed
        AND f."resaStatus" NOT IN ('Annulee', 'NoShow')
    ),
    folios_ttc AS (
      SELECT
        *,
        (heb_effectif + total_prestations + total_pdj + total_debiteur + total_dependances)::int AS total_ht
      FROM folios_calc
    ),
    folios_solde AS (
      SELECT
        *,
        CASE WHEN tva_exonere THEN 0 ELSE ROUND(total_ht * 0.18)::int END AS tva,
        (total_ht + CASE WHEN tva_exonere THEN 0 ELSE ROUND(total_ht * 0.18)::int END)::int AS total_ttc
      FROM folios_ttc
    )
    SELECT
      id, number, "pmsRoomNo", guest, societe, arrival, departure, "resaStatus", "checkedIn",
      tva_exonere AS "tvaExonere",
      total_ht    AS "totalHt",
      tva         AS "tva",
      total_ttc   AS "totalTtc",
      paid,
      arrhes,
      GREATEST(0, total_ttc - paid - arrhes)::int AS remaining
    FROM folios_solde
    WHERE GREATEST(0, total_ttc - paid - arrhes) >= $1
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
    "Rapport TVA sur la période : CA HT / TVA / TTC sourcé depuis accountMovements (reason=Vente + reason=TvaCollectee) — même source authoritative que AccountingService.GetTvaReportAsync côté admin. Inclut hébergement, prestations, PDJ, remises, ventes directes, retenues NoShow. Ventilé par SourceType (Payment | VenteDirecte | Facture | Folio | Manual). Si vide sur une période, ça signifie que la compta n'a pas encore été utilisée en prod pour cette période — dis-le explicitement.",
  inputSchema: tvaInputSchema,
} as const;

export async function tvaHandler(input: z.infer<typeof tvaInputSchema>): Promise<string> {
  assertPeriod(input.from, input.to);

  // Source authoritative : accountMovements. reason=Vente = HT, reason=TvaCollectee = TVA.
  // Regroupe par (SourceType, SourceId) — 1 ligne = 1 opération métier (paiement,
  // facture, vente directe…). Cf. AccountingService.GetTvaReportAsync (AccountingService.cs:239).
  // Fenêtre inclusive : date >= from AND date < (to + 1 jour) pour capturer toute la journée `to`.
  const [totals] = await query<{
    countLines: number;
    ht: number;
    tva: number;
    ttc: number;
  }>(
    `
    WITH grouped AS (
      SELECT
        "sourceType",
        "sourceId",
        SUM(amount) FILTER (WHERE reason = 'Vente')        AS ht,
        SUM(amount) FILTER (WHERE reason = 'TvaCollectee') AS tva
      FROM "accountMovements"
      WHERE date >= $1::date
        AND date <  ($2::date + INTERVAL '1 day')
        AND "sourceType" IS NOT NULL
        AND "sourceId"   IS NOT NULL
      GROUP BY "sourceType", "sourceId"
      HAVING COALESCE(SUM(amount) FILTER (WHERE reason = 'Vente'), 0) <> 0
          OR COALESCE(SUM(amount) FILTER (WHERE reason = 'TvaCollectee'), 0) <> 0
    )
    SELECT
      COUNT(*)::int                                AS "countLines",
      COALESCE(SUM(ht), 0)::float8                 AS ht,
      COALESCE(SUM(tva), 0)::float8                AS tva,
      COALESCE(SUM(ht) + SUM(tva), 0)::float8      AS ttc
    FROM grouped
    `,
    [input.from, input.to],
  );

  const bySourceType = await query(
    `
    SELECT
      "sourceType",
      COUNT(*) FILTER (WHERE reason = 'Vente')::int              AS "linesCount",
      COALESCE(SUM(amount) FILTER (WHERE reason = 'Vente'), 0)::float8         AS ht,
      COALESCE(SUM(amount) FILTER (WHERE reason = 'TvaCollectee'), 0)::float8  AS tva
    FROM "accountMovements"
    WHERE date >= $1::date
      AND date <  ($2::date + INTERVAL '1 day')
      AND "sourceType" IS NOT NULL
      AND reason IN ('Vente', 'TvaCollectee')
    GROUP BY "sourceType"
    ORDER BY ht DESC
    `,
    [input.from, input.to],
  );

  return JSON.stringify(
    {
      period: { from: input.from, to: input.to },
      currency: "XOF",
      tvaRate: TVA_RATE,
      source: "accountMovements (reason=Vente + reason=TvaCollectee)",
      totals: {
        operations: totals.countLines,
        ht: Math.round(totals.ht),
        tva: Math.round(totals.tva),
        ttc: Math.round(totals.ttc),
      },
      bySourceType: bySourceType.map((r) => ({
        sourceType: r.sourceType,
        linesCount: r.linesCount,
        ht: Math.round(r.ht as number),
        tva: Math.round(r.tva as number),
        ttc: Math.round((r.ht as number) + (r.tva as number)),
      })),
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
