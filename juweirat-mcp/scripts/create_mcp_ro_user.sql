-- ─────────────────────────────────────────────────────────────────────────────
-- Création du user Postgres READ-ONLY pour juweirat-mcp.
--
-- À exécuter en tant que superuser (compte `juweirat` du docker-compose).
-- Le mot de passe est passé via une variable psql -v :
--
--   Get-Content scripts/create_mcp_ro_user.sql -Raw | `
--     docker exec -i juweirat-postgres psql -U juweirat -d juweirat `
--       -v mcp_password="'MOT_DE_PASSE_FORT'"
--
-- (les quotes simples autour du mdp sont NÉCESSAIRES car psql substitue :var brut.)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Création du rôle (idempotent).
-- Pas de DO $$ ici : les variables psql :var ne sont pas substituées à l'intérieur
-- des chaînes dollar-quoted. On utilise \gexec pour exécuter conditionnellement.
SELECT 'CREATE ROLE juweirat_mcp_ro WITH LOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'juweirat_mcp_ro')
\gexec

-- 2) (Ré)assignation du mot de passe — s'assure qu'il est à jour même si le rôle existait déjà.
ALTER ROLE juweirat_mcp_ro WITH PASSWORD :mcp_password;

-- 3) Connexion à la base.
GRANT CONNECT ON DATABASE juweirat TO juweirat_mcp_ro;
GRANT USAGE ON SCHEMA public TO juweirat_mcp_ro;

-- 4) SELECT sur les tables métier — sur celles qui existent uniquement.
-- Certaines migrations ne sont pas encore appliquées sur toutes les envs
-- (housekeepingLogs, accounts, accountMovements, cashRegisters, cashSessions).
-- On génère les GRANT dynamiquement pour éviter d'échouer sur une table absente.
SELECT format('GRANT SELECT ON %I TO juweirat_mcp_ro;', tablename)
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'rooms', 'roomCategories', 'roomImages', 'amenities', 'roomAmenities',
    'clients', 'companies', 'companyTarifs',
    'reservations', 'payments', 'roomBlocks',
    'hotelConfig', 'folios', 'factures', 'postings', 'clotures',
    'maintenanceCategories', 'maintenanceStaff', 'maintenanceTickets', 'debtors',
    'housekeepingLogs',
    'prestationsAnnexes', 'reservationPrestations', 'ventesDirectes',
    'contactMessages',
    'accounts', 'accountMovements', 'cashRegisters', 'cashSessions'
  )
\gexec

-- 5) Défense en profondeur : REVOKE explicite sur `users` (comptes admin).
REVOKE ALL ON users FROM juweirat_mcp_ro;

-- 6) Vérification finale.
\echo '── Tables lisibles par juweirat_mcp_ro :'
SELECT tablename
FROM pg_tables t
WHERE schemaname = 'public'
  AND has_table_privilege('juweirat_mcp_ro',
        quote_ident(t.schemaname) || '.' || quote_ident(t.tablename), 'SELECT')
ORDER BY tablename;
