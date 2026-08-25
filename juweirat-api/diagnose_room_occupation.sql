-- ─────────────────────────────────────────────────────────────────────────────
-- Diagnostic : POURQUOI la chambre N apparaît-elle occupée ?
--
-- Liste TOUTES les sources d'occupation actives sur une chambre donnée à la
-- date du jour : réservations, folios (effectifs + drift raw), blocks manuels.
--
-- Usage prod :
--   docker exec -i juweirat-postgres psql -U juweirat -d juweirat \
--     -v pms_room_no="'46'" \
--     -f /path/to/diagnose_room_occupation.sql
--
-- OU directement en shell (remplacer 46 par la chambre à examiner) :
--
--   docker exec juweirat-postgres psql -U juweirat -d juweirat -c "
--     WITH target AS (SELECT id FROM rooms WHERE \"pmsRoomNo\" = '46' LIMIT 1)
--     SELECT ...
--   "
-- ─────────────────────────────────────────────────────────────────────────────

\if :{?pms_room_no}
\else
  \set pms_room_no '46'
\endif

\echo ── Chambre cible :
SELECT id, "pmsRoomNo", "roomNumber", floor, "pmsType", "statutMenage", "horsService", status
FROM rooms
WHERE "pmsRoomNo" = :pms_room_no;

\echo
\echo ── 1) Réservations ACTIVES qui pointent sur cette chambre (r.roomId) :
SELECT
  r.id, r.reference, r.status,
  r."checkInDate", r."checkOutDate",
  c."firstName" || ' ' || c."lastName" AS client,
  co.name                              AS company
FROM reservations r
LEFT JOIN clients   c  ON c.id  = r."clientId"
LEFT JOIN companies co ON co.id = c."companyId"
WHERE r."roomId" = (SELECT id FROM rooms WHERE "pmsRoomNo" = :pms_room_no)
  AND r.status NOT IN ('Cancelled', 'NoShow', 'CheckedOut')
  AND r."checkInDate"  <= CURRENT_DATE
  AND r."checkOutDate"  > CURRENT_DATE
ORDER BY r."checkInDate";

\echo
\echo ── 2) Folios ACTIFS dont l'unité EFFECTIVE est cette chambre (résa liée > f.unitId) :
SELECT
  f.id, f.number, f."resaStatus", f.closed, f."checkedIn",
  f."unitId"                       AS folio_raw_unit,
  f."reservationId",
  r.reference                      AS resa_ref,
  r."roomId"                       AS resa_room,
  COALESCE(r."roomId", f."unitId") AS effective_unit,
  COALESCE(r."checkInDate",  f.arrival)   AS effective_arrival,
  COALESCE(r."checkOutDate", f.departure) AS effective_departure,
  f.guest, f.societe
FROM folios f
LEFT JOIN reservations r ON r.id = f."reservationId"
WHERE COALESCE(r."roomId", f."unitId") = (SELECT id FROM rooms WHERE "pmsRoomNo" = :pms_room_no)
  AND NOT f.closed
  AND f."resaStatus" NOT IN ('Annulee', 'NoShow')
  AND COALESCE(r."checkInDate",  f.arrival)   <= CURRENT_DATE
  AND COALESCE(r."checkOutDate", f.departure)  > CURRENT_DATE
ORDER BY f.id;

\echo
\echo ── 3) Folios "fantômes" (RAW f.unitId pointe sur cette chambre, mais leur résa liée pointe ailleurs) :
\echo   Si des lignes apparaissent ici, la reconciliation SQL doit être lancée.
SELECT
  f.id, f.number, f."resaStatus", f.closed,
  f."unitId"                                                    AS folio_raw_unit,
  f."reservationId",
  r.reference                                                   AS resa_ref,
  r."roomId"                                                    AS resa_room,
  (SELECT "pmsRoomNo" FROM rooms WHERE id = r."roomId")         AS resa_room_pms
FROM folios f
INNER JOIN reservations r ON r.id = f."reservationId"
WHERE f."unitId" = (SELECT id FROM rooms WHERE "pmsRoomNo" = :pms_room_no)
  AND r."roomId" IS NOT NULL
  AND r."roomId" <> f."unitId"
  AND NOT f.closed;

\echo
\echo ── 4) Blocks manuels sur cette chambre couvrant aujourd'hui :
SELECT
  b.id, b."startDate", b."endDate", b.reason
FROM "roomBlocks" b
WHERE b."roomId" = (SELECT id FROM rooms WHERE "pmsRoomNo" = :pms_room_no)
  AND b."startDate" <= CURRENT_DATE
  AND b."endDate"    > CURRENT_DATE;

\echo
\echo ── 5) Verdict :
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM reservations r
      WHERE r."roomId" = (SELECT id FROM rooms WHERE "pmsRoomNo" = :pms_room_no)
        AND r.status NOT IN ('Cancelled', 'NoShow', 'CheckedOut')
        AND r."checkInDate" <= CURRENT_DATE AND r."checkOutDate" > CURRENT_DATE
    ) THEN 'OCCUPÉE par une réservation'
    WHEN EXISTS (
      SELECT 1 FROM folios f LEFT JOIN reservations r ON r.id = f."reservationId"
      WHERE COALESCE(r."roomId", f."unitId") = (SELECT id FROM rooms WHERE "pmsRoomNo" = :pms_room_no)
        AND NOT f.closed AND f."resaStatus" NOT IN ('Annulee', 'NoShow')
        AND COALESCE(r."checkInDate", f.arrival) <= CURRENT_DATE
        AND COALESCE(r."checkOutDate", f.departure) > CURRENT_DATE
    ) THEN 'OCCUPÉE par un folio actif (voir §2)'
    WHEN EXISTS (
      SELECT 1 FROM "roomBlocks" b
      WHERE b."roomId" = (SELECT id FROM rooms WHERE "pmsRoomNo" = :pms_room_no)
        AND b."startDate" <= CURRENT_DATE AND b."endDate" > CURRENT_DATE
    ) THEN 'BLOQUÉE par un roomBlock manuel'
    ELSE 'LIBRE — si le front la montre occupée, c''est un bug d''affichage'
  END AS verdict;
