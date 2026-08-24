-- ─────────────────────────────────────────────────────────────────────────────
-- Ajout canal 'telegram' au chat agent + whitelist staff Telegram.
--
-- Tables agent-owned (comme ChatSessions/ChatMessages) — pas EF Core.
--
-- Exécution :
--   Get-Content scripts/add_telegram.sql -Raw | `
--     docker exec -i juweirat-postgres psql -U juweirat -d juweirat
-- Idempotent : peut être rejoué sans erreur.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Élargir le CHECK "canal" à 'telegram' ─────────────────────────────────
-- Postgres n'a pas d'ALTER CONSTRAINT, on drop + re-add.
ALTER TABLE "ChatSessions" DROP CONSTRAINT IF EXISTS "ChatSessions_canal_check";
ALTER TABLE "ChatSessions"
  ADD CONSTRAINT "ChatSessions_canal_check"
  CHECK (canal IN ('web', 'whatsapp', 'telegram'));

-- ── 2. Colonne telegramUserId ────────────────────────────────────────────────
-- BIGINT car les IDs Telegram dépassent parfois 2^31.
ALTER TABLE "ChatSessions" ADD COLUMN IF NOT EXISTS "telegramUserId" BIGINT NULL;

CREATE INDEX IF NOT EXISTS ix_chatsessions_telegram_lastactivity
  ON "ChatSessions" ("telegramUserId", "lastActivityAt" DESC)
  WHERE "telegramUserId" IS NOT NULL;

-- ── 3. CHECK d'ownership incluant telegram ───────────────────────────────────
ALTER TABLE "ChatSessions" DROP CONSTRAINT IF EXISTS ck_chatsessions_owner;
ALTER TABLE "ChatSessions"
  ADD CONSTRAINT ck_chatsessions_owner
  CHECK (
    (canal = 'web'      AND "userId"         IS NOT NULL) OR
    (canal = 'whatsapp' AND "phoneNumber"    IS NOT NULL) OR
    (canal = 'telegram' AND "telegramUserId" IS NOT NULL)
  );

-- ── 4. Whitelist staff Telegram ──────────────────────────────────────────────
-- telegramId = ID numérique Telegram du user (from.id dans les updates).
-- userId    = FK optionnelle vers les utilisateurs PMS (.NET Users.id), NULL si
--             staff Telegram sans compte admin (ex. femme de ménage).
-- role      = libre ("admin", "reception", "housekeeping", "promoteur"…).
-- isActive  = kill-switch sans supprimer la ligne (audit conservé).
CREATE TABLE IF NOT EXISTS "TelegramUsers" (
  "telegramId"  BIGINT PRIMARY KEY,
  "userId"      BIGINT NULL,
  "username"    TEXT NULL,              -- @handle Telegram, informatif
  "displayName" TEXT NULL,              -- prénom/nom Telegram, informatif
  role          TEXT NOT NULL DEFAULT 'staff',
  "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastSeenAt"  TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS ix_telegramusers_active
  ON "TelegramUsers" ("isActive") WHERE "isActive" = TRUE;

\echo '── Migration telegram appliquée. Tables :'
\d "ChatSessions"
\dt "TelegramUsers"
