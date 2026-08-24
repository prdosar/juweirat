import { z } from "zod";
import { query } from "../db.js";
import { config } from "../config.js";
import { assertDate } from "../util/dates.js";

// ─── search_reservations ─────────────────────────────────────────────────────

const RESERVATION_STATUSES = ["Pending", "Confirmed", "CheckedIn", "CheckedOut", "Cancelled", "NoShow"] as const;

export const searchInputSchema = z.object({
  status: z.enum(RESERVATION_STATUSES).optional().describe("Filtrer sur un statut."),
  from: z.string().optional().describe("Check-in ≥ cette date (YYYY-MM-DD)."),
  to: z.string().optional().describe("Check-in ≤ cette date (YYYY-MM-DD)."),
  category: z.enum(["T1", "T2", "T3", "T4"]).optional().describe("Filtrer sur catégorie PMS."),
  clientQuery: z.string().optional().describe("Recherche fuzzy sur nom/prénom/email/téléphone du client."),
  limit: z.number().int().min(1).max(200).default(50).describe("Nombre max de résultats."),
});

export const searchDefinition = {
  name: "search_reservations",
  description:
    "Recherche multicritères de réservations. Retourne la liste avec référence, client, catégorie, dates, statut, montants.",
  inputSchema: searchInputSchema,
} as const;

type ReservationRow = {
  id: number;
  reference: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalPrice: number;
  amountPaid: number;
  categoryName: string | null;
  pmsType: string | null;
  clientName: string;
  clientPhone: string | null;
  companyName: string | null;
};

export async function searchHandler(input: z.infer<typeof searchInputSchema>): Promise<string> {
  if (input.from) assertDate("from", input.from);
  if (input.to) assertDate("to", input.to);

  const rows = await query<ReservationRow>(
    `
    SELECT
      r.id, r.reference, r.status,
      to_char(r."checkInDate", 'YYYY-MM-DD')  AS "checkInDate",
      to_char(r."checkOutDate", 'YYYY-MM-DD') AS "checkOutDate",
      r.nights,
      r."totalPrice"::float8 AS "totalPrice",
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p."reservationId" = r.id AND p.status = 'Completed'), 0)::float8 AS "amountPaid",
      c."nameFr" AS "categoryName",
      c."pmsType",
      cl."firstName" || ' ' || cl."lastName" AS "clientName",
      cl.phone AS "clientPhone",
      co.name AS "companyName"
    FROM reservations r
    JOIN "roomCategories" c ON c.id = r."categoryId"
    JOIN clients cl ON cl.id = r."clientId"
    LEFT JOIN companies co ON co.id = cl."companyId"
    WHERE ($1::text IS NULL OR r.status = $1)
      AND ($2::date IS NULL OR r."checkInDate" >= $2::date)
      AND ($3::date IS NULL OR r."checkInDate" <= $3::date)
      AND ($4::text IS NULL OR c."pmsType" = $4)
      AND (
        $5::text IS NULL OR
        cl."firstName" ILIKE '%' || $5 || '%' OR
        cl."lastName"  ILIKE '%' || $5 || '%' OR
        cl.email       ILIKE '%' || $5 || '%' OR
        cl.phone       ILIKE '%' || $5 || '%'
      )
    ORDER BY r."checkInDate" DESC
    LIMIT $6
    `,
    [
      input.status ?? null,
      input.from ?? null,
      input.to ?? null,
      input.category ?? null,
      input.clientQuery ?? null,
      input.limit,
    ],
  );

  return JSON.stringify(
    { count: rows.length, currency: "XOF", reservations: rows },
    null,
    2,
  );
}

// ─── get_reservation ─────────────────────────────────────────────────────────

export const getInputSchema = z.object({
  identifier: z
    .string()
    .describe("ID numérique OU référence (ex. 'JW-2026-00042'). Détection automatique."),
});

export const getDefinition = {
  name: "get_reservation",
  description:
    "Retourne le détail complet d'une réservation : client, catégorie, chambre, montants, paiements, prestations, folio associé s'il existe.",
  inputSchema: getInputSchema,
} as const;

export async function getHandler(input: z.infer<typeof getInputSchema>): Promise<string> {
  const isNumericId = /^\d+$/.test(input.identifier);
  const rows = await query<Record<string, unknown>>(
    `
    SELECT
      r.id, r.reference, r.status,
      to_char(r."checkInDate", 'YYYY-MM-DD')  AS "checkInDate",
      to_char(r."checkOutDate", 'YYYY-MM-DD') AS "checkOutDate",
      r.nights, r.adults, r.children,
      r."pricePerNightSnapshot"::float8 AS "pricePerNightSnapshot",
      r."totalPrice"::float8 AS "totalPrice",
      r.discount, r.currency,
      r.source, r."specialRequests", r."internalNotes",
      r."garantieType", r."garantieMontantCash"::float8 AS "garantieMontantCash",
      r."tvaExonere",
      r."confirmedAt", r."cancelledAt", r."cancellationReason",
      r."createdAt",
      c."nameFr" AS "categoryName", c."pmsType", c."pmsGamme",
      rm."roomNumber", rm."pmsRoomNo",
      cl.id AS "clientId", cl."firstName", cl."lastName", cl.email, cl.phone, cl.nationality, cl.city,
      co.name AS "companyName",
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p."reservationId" = r.id AND p.status = 'Completed'), 0)::float8 AS "amountPaid",
      f.id AS "folioId", f.number AS "folioNumber", f."resaStatus" AS "folioStatus"
    FROM reservations r
    JOIN "roomCategories" c ON c.id = r."categoryId"
    LEFT JOIN rooms rm ON rm.id = r."roomId"
    JOIN clients cl ON cl.id = r."clientId"
    LEFT JOIN companies co ON co.id = cl."companyId"
    LEFT JOIN folios f ON f."reservationId" = r.id
    WHERE ${isNumericId ? "r.id = $1::bigint" : "r.reference = $1"}
    `,
    [isNumericId ? Number(input.identifier) : input.identifier],
  );

  if (rows.length === 0) {
    return JSON.stringify({ found: false, identifier: input.identifier });
  }

  const reservation = rows[0];
  const payments = await query(
    `SELECT id, amount::float8 AS amount, method, status, "paidAt", "internalReference"
     FROM payments WHERE "reservationId" = $1 ORDER BY "createdAt"`,
    [reservation.id],
  );
  const prestations = await query(
    `SELECT rp.id, rp."totalLigne"::float8 AS total, rp.quantite,
            rp."prixUnitaireSnapshot"::float8 AS "prixUnitaireSnapshot",
            pa."nameFr" AS prestation, pa.mode
     FROM "reservationPrestations" rp
     JOIN "prestationsAnnexes" pa ON pa.id = rp."prestationId"
     WHERE rp."reservationId" = $1`,
    [reservation.id],
  );

  return JSON.stringify({ found: true, reservation, payments, prestations }, null, 2);
}

// ─── get_client_history ──────────────────────────────────────────────────────

export const historyInputSchema = z.object({
  clientId: z.number().int().describe("ID du client."),
  limit: z.number().int().min(1).max(200).default(50).describe("Nombre max de réservations."),
});

export const historyDefinition = {
  name: "get_client_history",
  description:
    "Retourne toutes les réservations d'un client (par ID), triées par date décroissante, avec totaux séjour et montants dépensés.",
  inputSchema: historyInputSchema,
} as const;

export async function historyHandler(input: z.infer<typeof historyInputSchema>): Promise<string> {
  const [client] = await query<{
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    companyName: string | null;
  }>(
    `SELECT cl.id, cl."firstName", cl."lastName", cl.email, cl.phone, co.name AS "companyName"
     FROM clients cl LEFT JOIN companies co ON co.id = cl."companyId"
     WHERE cl.id = $1`,
    [input.clientId],
  );
  if (!client) return JSON.stringify({ found: false, clientId: input.clientId });

  const reservations = await query(
    `
    SELECT
      r.id, r.reference, r.status,
      to_char(r."checkInDate", 'YYYY-MM-DD')  AS "checkInDate",
      to_char(r."checkOutDate", 'YYYY-MM-DD') AS "checkOutDate",
      r.nights, r."totalPrice"::float8 AS "totalPrice",
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p."reservationId" = r.id AND p.status = 'Completed'), 0)::float8 AS "amountPaid",
      c."pmsType"
    FROM reservations r
    JOIN "roomCategories" c ON c.id = r."categoryId"
    WHERE r."clientId" = $1
    ORDER BY r."checkInDate" DESC
    LIMIT $2
    `,
    [input.clientId, input.limit],
  );

  const totals = reservations.reduce(
    (acc, r) => {
      acc.totalStays += 1;
      acc.totalNights += (r.nights as number) ?? 0;
      acc.totalSpent += (r.totalPrice as number) ?? 0;
      acc.totalPaid += (r.amountPaid as number) ?? 0;
      return acc;
    },
    { totalStays: 0, totalNights: 0, totalSpent: 0, totalPaid: 0 },
  );

  return JSON.stringify(
    { found: true, client, totals: { ...totals, currency: "XOF" }, reservations },
    null,
    2,
  );
}

// ─── get_no_show_stats ───────────────────────────────────────────────────────

export const noShowInputSchema = z.object({
  from: z.string().describe("Check-in ≥ cette date (YYYY-MM-DD)."),
  to: z.string().describe("Check-in ≤ cette date (YYYY-MM-DD)."),
});

export const noShowDefinition = {
  name: "get_no_show_stats",
  description:
    "Statistiques No Show : nombre de réservations passées en NoShow sur la période, valeur totale du CA raté et retenues (basées sur folio.resaStatus='NoShow').",
  inputSchema: noShowInputSchema,
} as const;

export async function noShowHandler(input: z.infer<typeof noShowInputSchema>): Promise<string> {
  assertDate("from", input.from);
  assertDate("to", input.to);

  const [resaStats] = await query<{ count: number; totalLost: number }>(
    `
    SELECT COUNT(*)::int AS count, COALESCE(SUM("totalPrice"), 0)::float8 AS "totalLost"
    FROM reservations
    WHERE status = 'NoShow'
      AND "checkInDate" >= $1::date
      AND "checkInDate" <= $2::date
    `,
    [input.from, input.to],
  );

  const [folioStats] = await query<{ count: number; totalRetained: number }>(
    `
    SELECT COUNT(*)::int AS count, COALESCE(SUM(paid), 0)::float8 AS "totalRetained"
    FROM folios
    WHERE "resaStatus" = 'NoShow'
      AND arrival >= $1::date
      AND arrival <= $2::date
    `,
    [input.from, input.to],
  );

  const byCategory = await query(
    `
    SELECT c."pmsType" AS category, COUNT(*)::int AS count, COALESCE(SUM(r."totalPrice"), 0)::float8 AS "totalLost"
    FROM reservations r
    JOIN "roomCategories" c ON c.id = r."categoryId"
    WHERE r.status = 'NoShow'
      AND r."checkInDate" >= $1::date
      AND r."checkInDate" <= $2::date
    GROUP BY c."pmsType"
    ORDER BY count DESC
    `,
    [input.from, input.to],
  );

  return JSON.stringify(
    {
      period: { from: input.from, to: input.to },
      currency: "XOF",
      reservations: { count: resaStats.count, totalLost: resaStats.totalLost },
      folios: { count: folioStats.count, totalRetained: folioStats.totalRetained },
      byCategory,
    },
    null,
    2,
  );
}

export async function limitCheck(n: number): Promise<number> {
  return Math.min(n, config.maxRows);
}
