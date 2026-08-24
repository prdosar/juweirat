-- ═══════════════════════════════════════════════════════════════════════
-- Cleanup données de test — Juweirat 2026-08-24
--
-- ⚠️ DESTRUCTIF — Faire un pg_dump AVANT d'exécuter :
--    docker exec juweirat-postgres pg_dump -U juweirat juweirat \
--      > backup-avant-prod-$(date +%Y%m%d-%H%M).sql
--
-- Ordre imposé par les FK. Conserve : companies, companyTarifs, rooms,
-- roomCategories, roomImages, roomAmenities, amenities, prestationsAnnexes,
-- users, hotelConfig, maintenanceCategories, maintenanceStaff, accounts
-- (système + auxiliaires), cashRegisters, housekeepingLogs.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Mvts compta + sessions caisse (les hooks ont créé des mvts pour toutes les ventes de test)
DELETE FROM "accountMovements";
DELETE FROM "cashSessions";

-- ── 2. Ventes directes (100% test, comme demandé)
DELETE FROM "ventesDirectes";

-- ── 3. Paiements
DELETE FROM "payments";

-- ── 4. Éclatement folios PMS
DELETE FROM "postings";
DELETE FROM "debtors";
UPDATE  "folios" SET "factureId" = NULL;   -- détache facture avant suppression
DELETE FROM "factures";
DELETE FROM "folios";

-- ── 5. Réservations
DELETE FROM "reservationPrestations";
DELETE FROM "reservations";

-- ── 6. Clients
DELETE FROM "clients";

-- ── 7. Clôtures + messages contact (données de test résiduelles)
DELETE FROM "clotures";
DELETE FROM "contactMessages";

-- ── 8. Reset des soldes de comptes tiers (ils seront réalimentés au fil des ventes)
UPDATE "accounts" SET "balance" = 0;

-- ── 9. Reset des séquences pour repartir à 1
--    Utilise pg_get_serial_sequence pour être compatible IDENTITY & SERIAL.
SELECT setval(pg_get_serial_sequence('"clients"',                'id'), 1, false);
SELECT setval(pg_get_serial_sequence('"reservations"',           'id'), 1, false);
SELECT setval(pg_get_serial_sequence('"folios"',                 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('"factures"',               'id'), 1, false);
SELECT setval(pg_get_serial_sequence('"payments"',               'id'), 1, false);
SELECT setval(pg_get_serial_sequence('"ventesDirectes"',         'id'), 1, false);
SELECT setval(pg_get_serial_sequence('"postings"',               'id'), 1, false);
SELECT setval(pg_get_serial_sequence('"debtors"',                'id'), 1, false);
SELECT setval(pg_get_serial_sequence('"reservationPrestations"', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('"accountMovements"',       'id'), 1, false);
SELECT setval(pg_get_serial_sequence('"cashSessions"',           'id'), 1, false);
SELECT setval(pg_get_serial_sequence('"clotures"',               'id'), 1, false);
SELECT setval(pg_get_serial_sequence('"contactMessages"',        'id'), 1, false);

-- ── 10. Reset compteur folios PMS (numérotation continue FL-YYYY-XXXX)
UPDATE "hotelConfig" SET "resaSeq" = 0, "factureSeq" = 0 WHERE "id" = 1;

COMMIT;

-- Vérification post-cleanup
\echo '── Post-cleanup : tables cibles devraient toutes être à 0 ─────────'
SELECT 'accountMovements' AS tbl, COUNT(*) FROM "accountMovements"
UNION ALL SELECT 'cashSessions', COUNT(*) FROM "cashSessions"
UNION ALL SELECT 'ventesDirectes', COUNT(*) FROM "ventesDirectes"
UNION ALL SELECT 'payments', COUNT(*) FROM "payments"
UNION ALL SELECT 'postings', COUNT(*) FROM "postings"
UNION ALL SELECT 'debtors', COUNT(*) FROM "debtors"
UNION ALL SELECT 'factures', COUNT(*) FROM "factures"
UNION ALL SELECT 'folios', COUNT(*) FROM "folios"
UNION ALL SELECT 'reservationPrestations', COUNT(*) FROM "reservationPrestations"
UNION ALL SELECT 'reservations', COUNT(*) FROM "reservations"
UNION ALL SELECT 'clients', COUNT(*) FROM "clients";
