-- ─────────────────────────────────────────────────────────────────────────────
-- Tables agent-owned pour juweirat-mcp-agent.
--
-- Volontairement PAS créées via EF Core : ce sont des tables propres à l'agent
-- (sessions de chat, messages, audit MCP), pas des données métier partagées
-- avec l'API .NET. Le service .NET n'a pas besoin de les connaître.
--
-- Exécution :
--   Get-Content scripts/create_chat_tables.sql -Raw | `
--     docker exec -i juweirat-postgres psql -U juweirat -d juweirat
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ChatSessions" (
  id             BIGSERIAL PRIMARY KEY,
  canal          TEXT NOT NULL CHECK (canal IN ('web', 'whatsapp')),
  "userId"       BIGINT NULL,                    -- users.id pour canal='web' (staff), NULL sinon
  "phoneNumber"  TEXT NULL,                      -- +228XXXXXXXX pour canal='whatsapp'
  title          TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastActivityAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_chatsessions_owner CHECK (
    (canal = 'web' AND "userId" IS NOT NULL) OR
    (canal = 'whatsapp' AND "phoneNumber" IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS ix_chatsessions_user_lastactivity
  ON "ChatSessions" ("userId", "lastActivityAt" DESC) WHERE "userId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_chatsessions_phone_lastactivity
  ON "ChatSessions" ("phoneNumber", "lastActivityAt" DESC) WHERE "phoneNumber" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "ChatMessages" (
  id              BIGSERIAL PRIMARY KEY,
  "sessionId"     BIGINT NOT NULL REFERENCES "ChatSessions"(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL DEFAULT '',       -- texte concaténé (pour l'assistant, les deltas cumulés)
  "toolCalls"     JSONB NOT NULL DEFAULT '[]'::jsonb,
  "tokensIn"      INTEGER NOT NULL DEFAULT 0,
  "tokensOut"     INTEGER NOT NULL DEFAULT 0,
  "cacheReadTokens"   INTEGER NOT NULL DEFAULT 0,
  "cacheWriteTokens"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_chatmessages_session_created
  ON "ChatMessages" ("sessionId", "createdAt");

CREATE TABLE IF NOT EXISTS "McpAuditLog" (
  id            BIGSERIAL PRIMARY KEY,
  "sessionId"   BIGINT NULL REFERENCES "ChatSessions"(id) ON DELETE SET NULL,
  "messageId"   BIGINT NULL REFERENCES "ChatMessages"(id) ON DELETE SET NULL,
  tool          TEXT NOT NULL,
  args          JSONB NOT NULL DEFAULT '{}'::jsonb,
  "durationMs"  INTEGER NOT NULL,
  "resultSize"  INTEGER NOT NULL,       -- taille char de la réponse (proxy tokens)
  "isError"     BOOLEAN NOT NULL DEFAULT FALSE,
  "errorMsg"    TEXT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_mcpauditlog_session_created
  ON "McpAuditLog" ("sessionId", "createdAt");
CREATE INDEX IF NOT EXISTS ix_mcpauditlog_tool_created
  ON "McpAuditLog" (tool, "createdAt");

\echo '── Tables chat créées :'
\dt "Chat"*
\dt "Mcp"*
