-- Ajoute GRANT SELECT au user RO Postgres sur les nouvelles tables métier
-- ajoutées depuis la création initiale du user (contrats compagnie, changelog
-- résa, compta fournisseurs, immos).
--
-- Ignore silencieusement si :
--   - le user juweirat_mcp_ro n'existe pas (env dev sans user RO)
--   - la table n'existe pas (env en retard sur les migrations EF Core)
--
-- GRANT est idempotent côté Postgres : safe à ré-exécuter.
DO $$
DECLARE
  t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'juweirat_mcp_ro') THEN
    RAISE NOTICE 'juweirat_mcp_ro absent, GRANT ignoré';
    RETURN;
  END IF;

  FOREACH t IN ARRAY ARRAY[
    'companyContracts', 'contractInvoices',
    'reservationChangeLogs',
    'suppliers', 'expenseCategories', 'expenses',
    'fixedAssets', 'depreciationEntries'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('GRANT SELECT ON %I TO juweirat_mcp_ro', t);
    END IF;
  END LOOP;
END $$;
