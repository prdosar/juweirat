import { z } from "zod";
import { query } from "../db.js";
import { config } from "../config.js";

// ─── list_rooms_by_status ────────────────────────────────────────────────────

export const roomsInputSchema = z.object({});

export const roomsDefinition = {
  name: "list_rooms_by_status",
  description:
    "État temps réel des chambres PMS. Pour chaque chambre : type/gamme, statut ménage, hors service, occupation courante (client actuellement dans la chambre, via folio actif où arrival ≤ aujourd'hui < departure), ET dernier passage ménage (lastCleanedBy = nom du staff, lastCleanedAt = timestamp exact, issu de housekeepingLogs). Utilise ce tool pour répondre à \"qui occupe la chambre X\", \"quelles chambres sont libres/occupées\", \"chambres à nettoyer\", \"qui a nettoyé la chambre X\".",
  inputSchema: roomsInputSchema,
} as const;

export async function roomsHandler(): Promise<string> {
  // Folio actif = englobe aujourd'hui et pas encore clôturé. Une chambre peut
  // techniquement avoir plusieurs folios sur la même date (overlap accidentel) ;
  // on prend le plus récent par id pour rester déterministe.
  const rooms = await query(
    `
    WITH active_folio AS (
      SELECT DISTINCT ON (f."unitId")
        f."unitId",
        f.id                                              AS "folioId",
        f.number                                          AS "folioNumber",
        f."checkedIn",
        to_char(f.arrival, 'YYYY-MM-DD')                  AS "arrival",
        to_char(f.departure, 'YYYY-MM-DD')                AS "departure",
        NULLIF(
          TRIM(COALESCE(f.prenom, '') || ' ' || COALESCE(f.nom, '')),
          ''
        )                                                 AS "namePrenomNom",
        f.guest,
        f.societe
      FROM folios f
      WHERE f.arrival <= CURRENT_DATE
        AND f.departure > CURRENT_DATE
        AND NOT f.closed
      ORDER BY f."unitId", f.id DESC
    )
    SELECT
      r.id, r."pmsRoomNo", r."roomNumber", r.floor,
      r."pmsType", r."pmsGamme",
      r."statutMenage", r."horsService",
      to_char(r."lastCleaned", 'YYYY-MM-DD') AS "lastCleaned",
      hk."lastCleanedAt",
      hk."lastCleanedBy",
      CASE WHEN af."folioId" IS NOT NULL THEN 'Occupied' ELSE 'Free' END AS "occupancyState",
      COALESCE(af."namePrenomNom", af.guest, af.societe) AS "currentGuest",
      af.societe                          AS "currentCompany",
      af."folioNumber"                    AS "currentFolioNumber",
      af."folioId"                        AS "currentFolioId",
      af."checkedIn"                      AS "currentCheckedIn",
      af."arrival"                        AS "currentArrival",
      af."departure"                      AS "currentDeparture"
    FROM rooms r
    LEFT JOIN active_folio af ON af."unitId" = r.id
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
    toClean: number;
  }>(
    `
    WITH active_folio AS (
      SELECT DISTINCT ON (f."unitId")
        f."unitId", f."checkedIn"
      FROM folios f
      WHERE f.arrival <= CURRENT_DATE
        AND f.departure > CURRENT_DATE
        AND NOT f.closed
      ORDER BY f."unitId", f.id DESC
    )
    SELECT
      COUNT(*)::int                                                        AS total,
      COUNT(af."unitId")::int                                              AS "occupiedNow",
      COUNT(*) FILTER (WHERE af."checkedIn")::int                          AS "checkedInNow",
      (COUNT(*) - COUNT(af."unitId"))::int                                 AS "availableNow",
      COUNT(*) FILTER (WHERE r."horsService")::int                         AS "horsService",
      COUNT(*) FILTER (WHERE r."statutMenage" = 'Sale')::int               AS "toClean"
    FROM rooms r
    LEFT JOIN active_folio af ON af."unitId" = r.id
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
