import { z } from "zod";
import { query } from "../db.js";
import { config } from "../config.js";

// ─── list_rooms_by_status ────────────────────────────────────────────────────

export const roomsInputSchema = z.object({});

export const roomsDefinition = {
  name: "list_rooms_by_status",
  description:
    "État temps réel des chambres PMS. Pour chaque chambre : type/gamme, statut ménage, hors service, occupation courante (client actuellement dans la chambre), source d'occupation (Folio | Reservation | Block), ET dernier passage ménage (lastCleanedBy = nom du staff, lastCleanedAt = timestamp exact, issu de housekeepingLogs). Une chambre est comptée occupée si un folio PMS actif, une réservation web active OU un blocage manuel (RoomBlock) chevauche la nuit courante — même logique que l'admin (RoomService.GetAvailableAsync). Utilise ce tool pour répondre à \"qui occupe la chambre X\", \"quelles chambres sont libres/occupées\", \"chambres à nettoyer\", \"qui a nettoyé la chambre X\".",
  inputSchema: roomsInputSchema,
} as const;

// CTE partagée : chambres bloquées pour la nuit courante, agrégées depuis
// les 3 sources qui verrouillent une chambre côté admin (RoomService.GetAvailableAsync) :
//   1) Folios PMS actifs (resaStatus ≠ Annulee/NoShow, non clôturés). Si le folio
//      est lié à une résa, on projette sur les dates de la résa (source de vérité).
//   2) Réservations web assignées à une chambre (roomId non null, status ≠ Cancelled/NoShow).
//   3) RoomBlocks manuels.
// L'ordre de priorité (Folio > Reservation > Block) sert uniquement à choisir la
// ligne d'affichage quand plusieurs sources concernent la même chambre — pour
// l'état "Occupied", n'importe laquelle suffit.
const ACTIVE_OCCUPANCY_CTE = `
  active_folio AS (
    SELECT DISTINCT ON (f."unitId")
      f."unitId"                                        AS room_id,
      'Folio'                                           AS source,
      f.id                                              AS "folioId",
      f.number                                          AS "folioNumber",
      f."checkedIn",
      to_char(COALESCE(res."checkInDate",  f.arrival),   'YYYY-MM-DD') AS arrival,
      to_char(COALESCE(res."checkOutDate", f.departure), 'YYYY-MM-DD') AS departure,
      NULLIF(TRIM(COALESCE(f.prenom, '') || ' ' || COALESCE(f.nom, '')), '') AS "namePrenomNom",
      f.guest,
      f.societe,
      NULL::text                                        AS "blockReason"
    FROM folios f
    LEFT JOIN reservations res ON res.id = f."reservationId"
    WHERE f."resaStatus" NOT IN ('Annulee', 'NoShow')
      AND NOT f.closed
      AND (CASE
        WHEN res.id IS NOT NULL
          THEN res."checkInDate"  <= CURRENT_DATE AND res."checkOutDate" > CURRENT_DATE
        ELSE   f.arrival          <= CURRENT_DATE AND f.departure         > CURRENT_DATE
      END)
    ORDER BY f."unitId", f.id DESC
  ),
  active_resa AS (
    SELECT DISTINCT ON (r."roomId")
      r."roomId"                                        AS room_id,
      'Reservation'                                     AS source,
      NULL::bigint                                      AS "folioId",
      NULL::text                                        AS "folioNumber",
      (r.status = 'CheckedIn')                          AS "checkedIn",
      to_char(r."checkInDate",  'YYYY-MM-DD')           AS arrival,
      to_char(r."checkOutDate", 'YYYY-MM-DD')           AS departure,
      NULLIF(TRIM(COALESCE(cl."firstName", '') || ' ' || COALESCE(cl."lastName", '')), '') AS "namePrenomNom",
      NULL::text                                        AS guest,
      co.name                                           AS societe,
      NULL::text                                        AS "blockReason"
    FROM reservations r
    JOIN clients cl ON cl.id = r."clientId"
    LEFT JOIN companies co ON co.id = cl."companyId"
    WHERE r."roomId" IS NOT NULL
      AND r.status NOT IN ('Cancelled', 'NoShow')
      AND r."checkInDate"  <= CURRENT_DATE
      AND r."checkOutDate" >  CURRENT_DATE
      AND r."roomId" NOT IN (SELECT room_id FROM active_folio)
    ORDER BY r."roomId", r.id DESC
  ),
  active_block AS (
    SELECT DISTINCT ON (b."roomId")
      b."roomId"                                        AS room_id,
      'Block'                                           AS source,
      NULL::bigint                                      AS "folioId",
      NULL::text                                        AS "folioNumber",
      FALSE                                             AS "checkedIn",
      to_char(b."startDate", 'YYYY-MM-DD')              AS arrival,
      to_char(b."endDate",   'YYYY-MM-DD')              AS departure,
      NULL::text                                        AS "namePrenomNom",
      NULL::text                                        AS guest,
      NULL::text                                        AS societe,
      b.reason                                          AS "blockReason"
    FROM "roomBlocks" b
    WHERE b."startDate" <= CURRENT_DATE
      AND b."endDate"   >  CURRENT_DATE
      AND b."roomId" NOT IN (SELECT room_id FROM active_folio)
      AND b."roomId" NOT IN (SELECT room_id FROM active_resa)
    ORDER BY b."roomId", b.id DESC
  ),
  active_occupancy AS (
    SELECT * FROM active_folio
    UNION ALL SELECT * FROM active_resa
    UNION ALL SELECT * FROM active_block
  )
`;

export async function roomsHandler(): Promise<string> {
  const rooms = await query(
    `
    WITH ${ACTIVE_OCCUPANCY_CTE}
    SELECT
      r.id, r."pmsRoomNo", r."roomNumber", r.floor,
      r."pmsType", r."pmsGamme",
      r."statutMenage", r."horsService", r.status AS "roomStatus",
      to_char(r."lastCleaned", 'YYYY-MM-DD') AS "lastCleaned",
      hk."lastCleanedAt",
      hk."lastCleanedBy",
      CASE
        WHEN r."horsService"          THEN 'HorsService'
        WHEN r.status = 'Inactive'    THEN 'Inactive'
        WHEN ao.room_id IS NOT NULL   THEN 'Occupied'
        ELSE 'Free'
      END                                 AS "occupancyState",
      ao.source                           AS "occupancySource",
      COALESCE(ao."namePrenomNom", ao.guest, ao.societe) AS "currentGuest",
      ao.societe                          AS "currentCompany",
      ao."folioNumber"                    AS "currentFolioNumber",
      ao."folioId"                        AS "currentFolioId",
      ao."checkedIn"                      AS "currentCheckedIn",
      ao.arrival                          AS "currentArrival",
      ao.departure                        AS "currentDeparture",
      ao."blockReason"                    AS "currentBlockReason"
    FROM rooms r
    LEFT JOIN active_occupancy ao ON ao.room_id = r.id
    LEFT JOIN LATERAL (
      SELECT
        to_char(h."cleanedAt", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "lastCleanedAt",
        NULLIF(TRIM(COALESCE(s."firstName", '') || ' ' || COALESCE(s."lastName", '')), '') AS "lastCleanedBy"
      FROM "housekeepingLogs" h
      LEFT JOIN "maintenanceStaff" s ON s.id = h."staffId"
      WHERE h."roomId" = r.id
      ORDER BY h."cleanedAt" DESC
      LIMIT 1
    ) hk ON true
    WHERE r."pmsRoomNo" IS NOT NULL
    ORDER BY r."pmsRoomNo"::int
    LIMIT $1
    `,
    [config.maxRows],
  );

  const [totals] = await query<{
    total: number;
    occupiedNow: number;
    checkedInNow: number;
    availableNow: number;
    horsService: number;
    inactive: number;
    toClean: number;
  }>(
    `
    WITH ${ACTIVE_OCCUPANCY_CTE}
    SELECT
      COUNT(*)::int                                                                     AS total,
      COUNT(ao.room_id)::int                                                            AS "occupiedNow",
      COUNT(*) FILTER (WHERE ao."checkedIn")::int                                       AS "checkedInNow",
      COUNT(*) FILTER (
        WHERE ao.room_id IS NULL
          AND NOT r."horsService"
          AND r.status != 'Inactive'
      )::int                                                                             AS "availableNow",
      COUNT(*) FILTER (WHERE r."horsService")::int                                      AS "horsService",
      COUNT(*) FILTER (WHERE r.status = 'Inactive')::int                                AS "inactive",
      COUNT(*) FILTER (WHERE r."statutMenage" = 'Sale')::int                            AS "toClean"
    FROM rooms r
    LEFT JOIN active_occupancy ao ON ao.room_id = r.id
    WHERE r."pmsRoomNo" IS NOT NULL
    `,
  );

  // Répartition ménage pour garder l'info sans polluer la réponse racine.
  const housekeepingBreakdown = await query(
    `
    SELECT "statutMenage", "horsService", COUNT(*)::int AS count
    FROM rooms
    WHERE "pmsRoomNo" IS NOT NULL
    GROUP BY "statutMenage", "horsService"
    ORDER BY "statutMenage", "horsService"
    `,
  );

  return JSON.stringify(
    { totals, housekeepingBreakdown, rooms },
    null,
    2,
  );
}

// ─── get_room_cleaning_history ───────────────────────────────────────────────

export const cleaningHistoryInputSchema = z.object({
  pmsRoomNo: z.string().describe("Numéro PMS de la chambre (ex: \"23\"). C'est le même numéro que celui affiché dans l'admin."),
  limit: z.number().int().min(1).max(100).default(20),
});

export const cleaningHistoryDefinition = {
  name: "get_room_cleaning_history",
  description:
    "Historique des N derniers passages ménage d'une chambre donnée : date/heure exacte, staff (nom + téléphone), notes éventuelles. Utile pour \"qui a nettoyé la chambre X et quand\", \"combien de fois nettoyée cette semaine\", \"historique housekeeping du 23\". Retourne les logs les plus récents en premier.",
  inputSchema: cleaningHistoryInputSchema,
} as const;

export async function cleaningHistoryHandler(
  input: z.infer<typeof cleaningHistoryInputSchema>,
): Promise<string> {
  const [room] = await query<{
    id: number;
    pmsRoomNo: string;
    roomNumber: string | null;
    pmsType: string | null;
    statutMenage: string | null;
  }>(
    `SELECT r.id, r."pmsRoomNo", r."roomNumber", r."pmsType", r."statutMenage"
     FROM rooms r
     WHERE r."pmsRoomNo" = $1
     LIMIT 1`,
    [input.pmsRoomNo],
  );

  if (!room) {
    return JSON.stringify(
      { error: `Aucune chambre trouvée avec pmsRoomNo=${input.pmsRoomNo}.` },
      null,
      2,
    );
  }

  const logs = await query(
    `
    SELECT
      h.id,
      to_char(h."cleanedAt", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "cleanedAt",
      h."staffId",
      NULLIF(TRIM(COALESCE(s."firstName", '') || ' ' || COALESCE(s."lastName", '')), '') AS "staffName",
      s.phone AS "staffPhone",
      h.notes
    FROM "housekeepingLogs" h
    LEFT JOIN "maintenanceStaff" s ON s.id = h."staffId"
    WHERE h."roomId" = $1
    ORDER BY h."cleanedAt" DESC
    LIMIT $2
    `,
    [room.id, input.limit],
  );

  return JSON.stringify({ room, count: logs.length, logs }, null, 2);
}

// ─── list_cleanings_on ───────────────────────────────────────────────────────

export const cleaningsOnInputSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : YYYY-MM-DD")
    .optional()
    .describe("Date au format YYYY-MM-DD. Si omis, utilise la date du jour côté serveur (UTC)."),
});

export const cleaningsOnDefinition = {
  name: "list_cleanings_on",
  description:
    "Liste TOUS les nettoyages effectués un jour donné (par défaut aujourd'hui), directement depuis housekeepingLogs. Chaque ligne = 1 passage : chambre, staff, horaire précis, notes. Utilise ce tool pour \"quelles chambres ont été nettoyées aujourd'hui / hier / le 25 août\", \"combien de nettoyages sur telle date\", \"qui a nettoyé aujourd'hui\". Si zéro nettoyage sur la date, retourne count=0 explicitement — ne confonds pas avec un manque de données.",
  inputSchema: cleaningsOnInputSchema,
} as const;

export async function cleaningsOnHandler(
  input: z.infer<typeof cleaningsOnInputSchema>,
): Promise<string> {
  const dateParam = input.date ?? null;

  const [countRow] = await query<{ total: number; distinctRooms: number }>(
    `
    SELECT COUNT(*)::int                                  AS "total",
           COUNT(DISTINCT h."roomId")::int                AS "distinctRooms"
    FROM "housekeepingLogs" h
    WHERE h."cleanedAt"::date = COALESCE($1::date, CURRENT_DATE)
    `,
    [dateParam],
  );

  const cleanings = await query(
    `
    SELECT
      h.id,
      to_char(h."cleanedAt", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "cleanedAt",
      r.id                                                  AS "roomId",
      r."pmsRoomNo",
      r."roomNumber",
      r."pmsType",
      h."staffId",
      NULLIF(TRIM(COALESCE(s."firstName", '') || ' ' || COALESCE(s."lastName", '')), '') AS "staffName",
      s.phone                                               AS "staffPhone",
      h.notes
    FROM "housekeepingLogs" h
    LEFT JOIN rooms r ON r.id = h."roomId"
    LEFT JOIN "maintenanceStaff" s ON s.id = h."staffId"
    WHERE h."cleanedAt"::date = COALESCE($1::date, CURRENT_DATE)
    ORDER BY h."cleanedAt" ASC
    `,
    [dateParam],
  );

  return JSON.stringify(
    {
      date: dateParam ?? "CURRENT_DATE (UTC serveur)",
      count: countRow.total,
      distinctRooms: countRow.distinctRooms,
      cleanings,
    },
    null,
    2,
  );
}

// ─── list_maintenance_incidents ──────────────────────────────────────────────

const TICKET_STATUSES = ["Ouvert", "EnCours", "Resolu", "Annule"] as const;

export const ticketsInputSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional().describe("Filtrer sur un statut. Si omis, ne retourne QUE les tickets ouverts et en cours."),
  limit: z.number().int().min(1).max(200).default(50),
});

export const ticketsDefinition = {
  name: "list_maintenance_incidents",
  description:
    "Liste les tickets de maintenance (par défaut : ouverts + en cours). Retourne titre, catégorie, priorité, chambre, intervenant, coût, statut.",
  inputSchema: ticketsInputSchema,
} as const;

export async function ticketsHandler(input: z.infer<typeof ticketsInputSchema>): Promise<string> {
  const statusFilter = input.status
    ? `t.status = $1`
    : `t.status IN ('Ouvert', 'EnCours')`;

  const params: unknown[] = input.status ? [input.status, input.limit] : [input.limit];
  const limitParam = input.status ? "$2" : "$1";

  const tickets = await query(
    `
    SELECT
      t.id, t.title, t.category, t.priority, t.status, t.zone, t.spot,
      t.cost, t.description, t.note,
      u."pmsRoomNo", u."roomNumber",
      NULLIF(TRIM(COALESCE(s."firstName", '') || ' ' || COALESCE(s."lastName", '')), '') AS "staffName",
      t."createdAt", t."resolvedAt"
    FROM "maintenanceTickets" t
    LEFT JOIN rooms u ON u.id = t."unitId"
    LEFT JOIN "maintenanceStaff" s ON s.id = t."staffId"
    WHERE ${statusFilter}
    ORDER BY
      CASE t.priority WHEN 'Urgente' THEN 0 WHEN 'Haute' THEN 1 WHEN 'Normale' THEN 2 ELSE 3 END,
      t."createdAt" DESC
    LIMIT ${limitParam}
    `,
    params,
  );

  const [counts] = await query<Record<string, number>>(
    `
    SELECT
      COUNT(*) FILTER (WHERE status = 'Ouvert')::int   AS "ouvert",
      COUNT(*) FILTER (WHERE status = 'EnCours')::int  AS "enCours",
      COUNT(*) FILTER (WHERE status = 'Resolu')::int   AS "resolu",
      COUNT(*) FILTER (WHERE status = 'Annule')::int   AS "annule"
    FROM "maintenanceTickets"
    `,
  );

  return JSON.stringify({ counts, filter: input.status ?? "Ouvert+EnCours", tickets }, null, 2);
}
