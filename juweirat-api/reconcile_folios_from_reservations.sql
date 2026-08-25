-- ─────────────────────────────────────────────────────────────────────────────
-- Réconciliation folios ↔ réservations
--
-- Contexte : avant le fix ReservationService.UpdateAsync (cascade folio),
-- toute édition d'une réservation qui touchait chambre/dates/pax/rate/tva
-- laissait le folio lié figé sur les anciennes valeurs. Conséquence visible :
-- l'ancienne chambre restait marquée « occupée » par le folio fantôme
-- (RoomService.GetAvailableAsync scanne folios.unitId).
--
-- Ce script réaligne les folios non-clôturés sur leur réservation d'origine.
--
-- Usage prod :
--   1) Diagnostic (dry-run) — lister les drifts :
--      docker exec juweirat-postgres psql -U juweirat -d juweirat \
--        -f /docker-entrypoint-initdb.d/reconcile_folios_from_reservations.sql
--   2) Vérifier le SELECT ci-dessous
--   3) Retirer le ROLLBACK à la fin, remettre COMMIT, re-lancer
--
-- Par défaut le script FAIT UN ROLLBACK — sûr à lancer plusieurs fois.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1) Diagnostic : liste tous les folios non-clôturés en drift avec leur résa.
\echo ── Folios non-clôturés désynchronisés de leur réservation :
SELECT
  f.id             AS folio_id,
  f.number         AS folio_no,
  f."reservationId",
  r.reference      AS resa_ref,
  f."unitId"       AS folio_unit,   r."roomId"                AS resa_room,
  f.arrival        AS folio_arr,    r."checkInDate"           AS resa_arr,
  f.departure      AS folio_dep,    r."checkOutDate"          AS resa_dep,
  f.pax            AS folio_pax,    (r.adults + r.children)   AS resa_pax,
  f.rate           AS folio_rate,   ROUND(r."pricePerNightSnapshot")::int AS resa_rate,
  f."tvaExonere"   AS folio_tva,    r."tvaExonere"            AS resa_tva
FROM folios f
INNER JOIN reservations r ON r.id = f."reservationId"
WHERE NOT f.closed
  AND r."roomId" IS NOT NULL
  AND (
       f."unitId"     <> r."roomId"
    OR f.arrival      <> r."checkInDate"
    OR f.departure    <> r."checkOutDate"
    OR f.pax          <> (r.adults + r.children)
    OR f.rate         <> ROUND(r."pricePerNightSnapshot")::int
    OR f."tvaExonere" <> r."tvaExonere"
  )
ORDER BY f.id;

-- 2) Réconciliation : aligne le folio sur les valeurs actuelles de la résa.
\echo
\echo ── Réconciliation (dry-run, sera ROLLBACK) :
WITH updated AS (
  UPDATE folios f
  SET "unitId"     = r."roomId",
      arrival      = r."checkInDate",
      departure    = r."checkOutDate",
      pax          = r.adults + r.children,
      rate         = ROUND(r."pricePerNightSnapshot")::int,
      "tvaExonere" = r."tvaExonere",
      "updatedAt"  = NOW()
  FROM reservations r
  WHERE f."reservationId" = r.id
    AND NOT f.closed
    AND r."roomId" IS NOT NULL
    AND (
         f."unitId"     <> r."roomId"
      OR f.arrival      <> r."checkInDate"
      OR f.departure    <> r."checkOutDate"
      OR f.pax          <> (r.adults + r.children)
      OR f.rate         <> ROUND(r."pricePerNightSnapshot")::int
      OR f."tvaExonere" <> r."tvaExonere"
    )
  RETURNING f.id
)
SELECT COUNT(*) AS folios_realigned FROM updated;

-- Sécurité : dry-run par défaut. Remplacer ROLLBACK par COMMIT quand OK.
ROLLBACK;
-- COMMIT;
