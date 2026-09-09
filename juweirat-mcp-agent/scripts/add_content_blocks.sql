-- ─────────────────────────────────────────────────────────────────────────────
-- Ajout colonne contentBlocks sur ChatMessages.
--
-- Contexte : migration OpenAI Chat Completions → Anthropic Messages API.
-- Anthropic exige que les tool_use blocks soient rejoués tels quels dans les
-- tours suivants (avec leur `id` original), ce qui n'était pas possible avec
-- la colonne `content` texte seule. Cette colonne stocke le tableau complet
-- de content blocks Anthropic (text | tool_use | tool_result) sérialisé en JSON.
--
-- La colonne `content` (texte) est conservée pour l'audit humain et l'affichage
-- rapide dans le widget admin ; `contentBlocks` est la source de vérité pour
-- le rejeu de l'historique.
--
-- Exécution :
--   Get-Content scripts/add_content_blocks.sql -Raw | `
--     docker exec -i juweirat-postgres psql -U juweirat -d juweirat
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "ChatMessages" ADD COLUMN IF NOT EXISTS "contentBlocks" JSONB NULL;

\echo '── Colonne contentBlocks ajoutée sur ChatMessages :'
\d "ChatMessages"
