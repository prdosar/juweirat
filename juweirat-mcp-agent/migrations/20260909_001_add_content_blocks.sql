-- Migration OpenAI → Anthropic : rejouer les tool_use blocks tel quel exige
-- de stocker le tableau complet de content blocks (text | tool_use | tool_result)
-- en JSONB. `content` (texte) reste pour l'audit humain.
ALTER TABLE "ChatMessages" ADD COLUMN IF NOT EXISTS "contentBlocks" JSONB NULL;
