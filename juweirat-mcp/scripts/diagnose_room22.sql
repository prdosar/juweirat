-- Diagnostic "appartement 22 signalé libre par le bot alors qu'occupé"
-- À exécuter avec :
--   docker exec -i juweirat-postgres psql -U juweirat -d juweirat < diagnose_room22.sql
--
-- Objectif : identifier lequel des 4 maillons décroche.
--   A) Identité de la chambre (id/pmsRoomNo/status/HS)
--   B) Folios candidats (avec ou sans résa liée) touchant appt 22
--   C) Réservations candidates
--   D) Ce que produit exactement le CTE actif du MCP pour appt 22

\echo '─── A. Identité de la chambre ────────────────────────────────'
SELECT id, "pmsRoomNo", "roomNumber", "pmsType", status, "horsService"
FROM rooms
WHERE "pmsRoomNo" = '22';

\echo '─── B. Tous les folios "vivants" touchant appt 22 (direct OR via résa) ─'
WITH target AS (SELECT id FROM rooms WHERE "pmsRoomNo" = '22')
SELECT
  f.id                                        AS folio_id,
  f.number                                    AS folio_num,
  f.closed,
  f."resaStatus"                              AS folio_resa_status,
  f."unitId"                                  AS folio_unit_id,
  f.arrival                                   AS folio_arrival,
  f.departure                                 AS folio_departure,
  f."reservationId"                           AS folio_resa_id,
  r.id                                        AS resa_id,
  r."roomId"                                  AS resa_room_id,
  r.status                                    AS resa_status,
  r."checkInDate"                             AS resa_ci,
  r."checkOutDate"                            AS resa_co,
  CURRENT_DATE                                AS today,
  COALESCE(r."roomId", f."unitId")            AS mcp_room_id,
  COALESCE(r."checkInDate",  f.arrival)       AS mcp_eff_arrival,
  COALESCE(r."checkOutDate", f.departure)     AS mcp_eff_departure,
  -- Le filtre WHERE du CTE active_folio (mêmes conditions)
  (f."resaStatus" NOT IN ('Annulee', 'NoShow')
    AND NOT f.closed
    AND (CASE
      WHEN r.id IS NOT NULL
        THEN r."checkInDate"  <= CURRENT_DATE AND r."checkOutDate" > CURRENT_DATE
      ELSE   f.arrival        <= CURRENT_DATE AND f.departure       > CURRENT_DATE
    END))                                     AS matches_mcp_cte
FROM folios f
LEFT JOIN reservations r ON r.id = f."reservationId"
WHERE (f."unitId" = (SELECT id FROM target) OR r."roomId" = (SELECT id FROM target))
ORDER BY f.id DESC
LIMIT 10;

\echo '─── C. Réservations web assignées à appt 22 ──────────────────'
SELECT
  r.id, r.reference, r."roomId", r.status,
  r."checkInDate", r."checkOutDate",
  CURRENT_DATE AS today,
  (r.status NOT IN ('Cancelled','NoShow')
    AND r."roomId" IS NOT NULL
    AND r."checkInDate"  <= CURRENT_DATE
    AND r."checkOutDate" >  CURRENT_DATE)   AS matches_mcp_resa_cte
FROM reservations r
WHERE r."roomId" = (SELECT id FROM rooms WHERE "pmsRoomNo" = '22')
ORDER BY r.id DESC
LIMIT 10;

\echo '─── D. Résultat exact du CTE active_folio du MCP pour appt 22 ─'
WITH active_folio AS (
  SELECT DISTINCT ON (COALESCE(res."roomId", f."unitId"))
    COALESCE(res."roomId", f."unitId") AS room_id,
    f.id                               AS folio_id,
    f.number                           AS folio_num,
    f."resaStatus"                     AS folio_resa_status,
    COALESCE(res."checkInDate",  f.arrival)   AS eff_arrival,
    COALESCE(res."checkOutDate", f.departure) AS eff_departure
  FROM folios f
  LEFT JOIN reservations res ON res.id = f."reservationId"
  WHERE f."resaStatus" NOT IN ('Annulee', 'NoShow')
    AND NOT f.closed
    AND (CASE
      WHEN res.id IS NOT NULL
        THEN res."checkInDate"  <= CURRENT_DATE AND res."checkOutDate" > CURRENT_DATE
      ELSE   f.arrival          <= CURRENT_DATE AND f.departure         > CURRENT_DATE
    END)
  ORDER BY COALESCE(res."roomId", f."unitId"), f.id DESC
)
SELECT *
FROM active_folio
WHERE room_id = (SELECT id FROM rooms WHERE "pmsRoomNo" = '22');
