import { z } from "zod";
import { query } from "../db.js";
import { config } from "../config.js";

// ─── list_rooms_by_status ────────────────────────────────────────────────────

export const roomsInputSchema = z.object({});

export const roomsDefinition = {
  name: "list_rooms_by_status",
  description:
    "État des chambres PMS : compte par (status × statutMenage × horsService) + liste détaillée. Permet de savoir combien de chambres sont à nettoyer, hors service, occupées, etc.",
  inputSchema: roomsInputSchema,
} as const;

export async function roomsHandler(): Promise<string> {
  const summary = await query(
    `
    SELECT
      status,
      "statutMenage",
      "horsService",
      COUNT(*)::int AS count
    FROM rooms
    WHERE "pmsRoomNo" IS NOT NULL
    GROUP BY status, "statutMenage", "horsService"
    ORDER BY status, "statutMenage", "horsService"
    `,
  );

  const rooms = await query(
    `
    SELECT
      id, "pmsRoomNo", "roomNumber", floor,
      "pmsType", "pmsGamme",
      status, "statutMenage", "horsService",
      to_char("lastCleaned", 'YYYY-MM-DD') AS "lastCleaned"
    FROM rooms
    WHERE "pmsRoomNo" IS NOT NULL
    ORDER BY "pmsRoomNo"::int
    LIMIT $1
    `,
    [config.maxRows],
  );

  const [totals] = await query<{ total: number; sale: number; horsService: number; occupied: number }>(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE "statutMenage" = 'Sale')::int AS sale,
      COUNT(*) FILTER (WHERE "horsService")::int AS "horsService",
      COUNT(*) FILTER (WHERE status = 'Occupied')::int AS occupied
    FROM rooms
    WHERE "pmsRoomNo" IS NOT NULL
    `,
  );

  return JSON.stringify({ totals, summary, rooms }, null, 2);
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
