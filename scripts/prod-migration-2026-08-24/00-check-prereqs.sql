-- ═══════════════════════════════════════════════════════════════════════
-- Prérequis avant mise en prod — Juweirat 2026-08-24
-- À exécuter en LECTURE SEULE pour valider que tout est en place
-- avant de lancer 01-cleanup.sql puis 02-import.sql.
-- ═══════════════════════════════════════════════════════════════════════

\echo '── Compagnies attendues (BESSAC, CICR, YAS, SOROUBAT) ─────────────'
SELECT "id", "name", "isActive"
FROM "companies"
WHERE LOWER("name") IN ('bessac', 'cicr', 'yas', 'soroubat')
ORDER BY LOWER("name");

\echo '── Tarifs négociés par compagnie (attendu : 1 ligne min par cie) ──'
SELECT
  c."name" AS compagnie,
  cat."slug" AS categorie,
  t."tarifNuit", t."tarifN15", t."tarifN30"
FROM "companyTarifs" t
JOIN "companies" c ON c."id" = t."companyId"
JOIN "roomCategories" cat ON cat."id" = t."categoryId"
WHERE LOWER(c."name") IN ('bessac', 'cicr', 'yas', 'soroubat')
ORDER BY c."name", cat."slug";

\echo '── Chambres PMS attendues (21,23,24,25,42,43,44,45,52,53,54,55,67) ─'
SELECT
  "pmsRoomNo",
  "roomNumber",
  "pmsType",
  "pmsGamme",
  "categoryId",
  "status",
  "horsService",
  "statutMenage"
FROM "rooms"
WHERE "pmsRoomNo" IN ('21','23','24','25','42','43','44','45','52','53','54','55','67')
ORDER BY "pmsRoomNo";

\echo '── Catégorie de chaque chambre + tarifs catalogue ─────────────────'
SELECT
  r."pmsRoomNo",
  cat."slug",
  cat."pmsType",
  cat."pmsGamme",
  cat."tarifNuit",
  cat."tarifN15",
  cat."tarifN30"
FROM "rooms" r
LEFT JOIN "roomCategories" cat ON cat."id" = r."categoryId"
WHERE r."pmsRoomNo" IN ('21','23','24','25','42','43','44','45','52','53','54','55','67')
ORDER BY r."pmsRoomNo";

\echo '── Volumes actuels des tables de test (à vider) ────────────────────'
SELECT 'accountMovements'  AS tbl, COUNT(*) FROM "accountMovements"
UNION ALL SELECT 'cashSessions',     COUNT(*) FROM "cashSessions"
UNION ALL SELECT 'ventesDirectes',   COUNT(*) FROM "ventesDirectes"
UNION ALL SELECT 'payments',         COUNT(*) FROM "payments"
UNION ALL SELECT 'postings',         COUNT(*) FROM "postings"
UNION ALL SELECT 'debtors',          COUNT(*) FROM "debtors"
UNION ALL SELECT 'factures',         COUNT(*) FROM "factures"
UNION ALL SELECT 'folios',           COUNT(*) FROM "folios"
UNION ALL SELECT 'reservationPrestations', COUNT(*) FROM "reservationPrestations"
UNION ALL SELECT 'reservations',     COUNT(*) FROM "reservations"
UNION ALL SELECT 'clients',          COUNT(*) FROM "clients"
UNION ALL SELECT 'clotures',         COUNT(*) FROM "clotures"
UNION ALL SELECT 'contactMessages',  COUNT(*) FROM "contactMessages";

\echo '── Volumes à préserver ─────────────────────────────────────────────'
SELECT 'companies'            AS tbl, COUNT(*) FROM "companies"
UNION ALL SELECT 'companyTarifs',        COUNT(*) FROM "companyTarifs"
UNION ALL SELECT 'rooms',                COUNT(*) FROM "rooms"
UNION ALL SELECT 'roomCategories',       COUNT(*) FROM "roomCategories"
UNION ALL SELECT 'prestationsAnnexes',   COUNT(*) FROM "prestationsAnnexes"
UNION ALL SELECT 'users',                COUNT(*) FROM "users"
UNION ALL SELECT 'maintenanceStaff',     COUNT(*) FROM "maintenanceStaff"
UNION ALL SELECT 'maintenanceCategories',COUNT(*) FROM "maintenanceCategories";

\echo '── hotelConfig (singleton) ─────────────────────────────────────────'
SELECT * FROM "hotelConfig";
