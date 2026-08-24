import { z } from "zod";
import { query } from "../db.js";
import { assertPeriod, daysBetweenInclusive } from "../util/dates.js";

// Source d'occupation = table `folios` (PMS).
// Les 13 occupations réelles en prod sont toutes des folios (résas web sans folio ≠ occupation réelle).
// Une nuit N est "occupée" par un folio F si arrival <= N AND departure > N.

export const inputSchema = z.object({
  from: z.string().describe("Date de début de la période (YYYY-MM-DD, incluse)."),
  to: z.string().describe("Date de fin de la période (YYYY-MM-DD, incluse — dernière nuit comptée)."),
  category: z
    .enum(["T1", "T2", "T3", "T4"])
    .optional()
    .describe("Filtrer sur un type de chambre PMS (T1/T2/T3/T4). Si omis, toutes catégories."),
});

export type OccupancyInput = z.infer<typeof inputSchema>;

export const definition = {
  name: "get_occupancy",
  description:
    "Retourne le taux d'occupation Juweirat sur une période (nuit-chambres occupées / nuit-chambres disponibles). " +
    "Compte les folios PMS (arrival ≤ nuit < departure). Optionnellement filtré par catégorie T1..T4.",
  inputSchema,
} as const;

type Row = {
  totalRoomNights: number;
  occupiedRoomNights: number;
  distinctRoomsOccupied: number;
  totalRooms: number;
};

export async function handler(input: OccupancyInput): Promise<string> {
  assertPeriod(input.from, input.to);
  const nights = daysBetweenInclusive(input.from, input.to);

  const rows = await query<Row>(
    `
    WITH pms_rooms AS (
      SELECT id
      FROM rooms
      WHERE "pmsRoomNo" IS NOT NULL
        AND ($3::text IS NULL OR "pmsType" = $3)
    ),
    occupied AS (
      SELECT
        f."unitId" AS room_id,
        GREATEST(f.arrival, $1::date) AS eff_arrival,
        LEAST(f.departure, ($2::date + INTERVAL '1 day')::date) AS eff_departure
      FROM folios f
      WHERE f."unitId" IN (SELECT id FROM pms_rooms)
        AND f.arrival < ($2::date + INTERVAL '1 day')::date
        AND f.departure > $1::date
    )
    SELECT
      (SELECT COUNT(*) FROM pms_rooms) * $4::int AS "totalRoomNights",
      COALESCE(SUM(GREATEST(0, (eff_departure - eff_arrival)))::int, 0) AS "occupiedRoomNights",
      COALESCE(COUNT(DISTINCT room_id)::int, 0) AS "distinctRoomsOccupied",
      (SELECT COUNT(*)::int FROM pms_rooms) AS "totalRooms"
    FROM occupied
    `,
    [input.from, input.to, input.category ?? null, nights],
  );

  const r = rows[0];
  const rate = r.totalRoomNights === 0 ? 0 : r.occupiedRoomNights / r.totalRoomNights;

  return JSON.stringify(
    {
      period: { from: input.from, to: input.to, nights },
      category: input.category ?? "all",
      rooms: { total: r.totalRooms, distinctOccupied: r.distinctRoomsOccupied },
      roomNights: { total: r.totalRoomNights, occupied: r.occupiedRoomNights },
      occupancyRate: Number(rate.toFixed(4)),
      occupancyPercent: Number((rate * 100).toFixed(2)),
    },
    null,
    2,
  );
}
