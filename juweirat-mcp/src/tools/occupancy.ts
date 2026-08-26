import { z } from "zod";
import { query } from "../db.js";
import { assertPeriod, daysBetweenInclusive } from "../util/dates.js";

// Alignement avec RoomService.GetAvailableAsync (admin) : une chambre est comptée
// occupée sur la nuit N si N est verrouillée par AU MOINS l'une des 3 sources :
//   1) Folio PMS (resaStatus ≠ Annulee/NoShow, non clôturé). Dates projetées depuis
//      la résa liée si présente (source de vérité), sinon dates propres du folio.
//   2) Réservation web (roomId non null, status ≠ Cancelled/NoShow).
//   3) RoomBlock (blocage manuel : maintenance, propriétaire…).
// La dédup par (room_id, night) évite le double-comptage folio↔résa liée.

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
    "Compte comme occupée toute nuit verrouillée par un folio PMS actif, une réservation web assignée à une chambre OU un blocage manuel — même logique que l'admin. Optionnellement filtré par catégorie T1..T4.",
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
    WITH nights AS (
      SELECT generate_series($1::date, $2::date, INTERVAL '1 day')::date AS night
    ),
    pms_rooms AS (
      SELECT id
      FROM rooms
      WHERE "pmsRoomNo" IS NOT NULL
        AND status != 'Inactive'
        AND NOT "horsService"
        AND ($3::text IS NULL OR "pmsType" = $3)
    ),
    folio_nights AS (
      SELECT COALESCE(res."roomId", f."unitId") AS room_id, n.night
      FROM folios f
      LEFT JOIN reservations res ON res.id = f."reservationId"
      CROSS JOIN nights n
      WHERE f."resaStatus" NOT IN ('Annulee', 'NoShow')
        AND NOT f.closed
        AND (CASE
          WHEN res.id IS NOT NULL
            THEN res."checkInDate"  <= n.night AND res."checkOutDate" > n.night
          ELSE   f.arrival          <= n.night AND f.departure         > n.night
        END)
        AND COALESCE(res."roomId", f."unitId") IN (SELECT id FROM pms_rooms)
    ),
    resa_nights AS (
      SELECT r."roomId" AS room_id, n.night
      FROM reservations r
      CROSS JOIN nights n
      WHERE r."roomId" IS NOT NULL
        AND r.status NOT IN ('Cancelled', 'NoShow')
        AND r."checkInDate"  <= n.night
        AND r."checkOutDate" >  n.night
        AND r."roomId" IN (SELECT id FROM pms_rooms)
    ),
    block_nights AS (
      SELECT b."roomId" AS room_id, n.night
      FROM "roomBlocks" b
      CROSS JOIN nights n
      WHERE b."startDate" <= n.night
        AND b."endDate"   >  n.night
        AND b."roomId" IN (SELECT id FROM pms_rooms)
    ),
    occupied_room_nights AS (
      SELECT room_id, night FROM folio_nights
      UNION
      SELECT room_id, night FROM resa_nights
      UNION
      SELECT room_id, night FROM block_nights
    )
    SELECT
      (SELECT COUNT(*) FROM pms_rooms) * $4::int          AS "totalRoomNights",
      COALESCE(COUNT(*)::int, 0)                          AS "occupiedRoomNights",
      COALESCE(COUNT(DISTINCT room_id)::int, 0)           AS "distinctRoomsOccupied",
      (SELECT COUNT(*)::int FROM pms_rooms)               AS "totalRooms"
    FROM occupied_room_nights
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
