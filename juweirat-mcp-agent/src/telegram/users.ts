import { query, queryOne } from "../db.js";
import { config } from "../config.js";

export interface TelegramUserRow {
  telegramId: number;
  userId: number | null;
  username: string | null;
  displayName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastSeenAt: string | null;
}

export async function findTelegramUser(telegramId: number): Promise<TelegramUserRow | null> {
  return queryOne<TelegramUserRow>(
    `SELECT "telegramId", "userId", username, "displayName", role, "isActive",
            "createdAt", "lastSeenAt"
     FROM "TelegramUsers" WHERE "telegramId" = $1`,
    [telegramId],
  );
}

export async function upsertTelegramUser(input: {
  telegramId: number;
  username?: string | null;
  displayName?: string | null;
  role?: string;
}): Promise<TelegramUserRow> {
  const row = await queryOne<TelegramUserRow>(
    `INSERT INTO "TelegramUsers" ("telegramId", username, "displayName", role, "lastSeenAt")
     VALUES ($1, $2, $3, COALESCE($4, 'staff'), NOW())
     ON CONFLICT ("telegramId") DO UPDATE
       SET username     = COALESCE(EXCLUDED.username, "TelegramUsers".username),
           "displayName" = COALESCE(EXCLUDED."displayName", "TelegramUsers"."displayName"),
           "lastSeenAt"  = NOW()
     RETURNING "telegramId", "userId", username, "displayName", role, "isActive",
               "createdAt", "lastSeenAt"`,
    [
      input.telegramId,
      input.username ?? null,
      input.displayName ?? null,
      input.role ?? null,
    ],
  );
  if (!row) throw new Error("Échec upsert TelegramUser");
  return row;
}

export async function touchLastSeen(telegramId: number): Promise<void> {
  await query(
    `UPDATE "TelegramUsers" SET "lastSeenAt" = NOW() WHERE "telegramId" = $1`,
    [telegramId],
  );
}

/**
 * Autorise l'accès si :
 *  - l'utilisateur est actif dans TelegramUsers, OU
 *  - son ID figure dans TELEGRAM_ADMIN_IDS (bootstrap) → il est auto-créé/activé.
 * Retourne le row à jour ou null si refusé.
 */
export async function authorizeTelegramUser(input: {
  telegramId: number;
  username?: string | null;
  displayName?: string | null;
}): Promise<TelegramUserRow | null> {
  const existing = await findTelegramUser(input.telegramId);
  if (existing) {
    if (!existing.isActive) return null;
    await touchLastSeen(input.telegramId);
    return existing;
  }

  // Bootstrap : ID dans la whitelist env → auto-création en admin.
  if (config.telegram.adminIds.includes(input.telegramId)) {
    return upsertTelegramUser({
      telegramId: input.telegramId,
      username: input.username,
      displayName: input.displayName,
      role: "admin",
    });
  }

  return null;
}
