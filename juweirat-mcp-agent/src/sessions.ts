import { query, queryOne } from "./db.js";

export type Canal = "web" | "whatsapp" | "telegram";

export interface ChatSession {
  id: number;
  canal: Canal;
  userId: number | null;
  phoneNumber: string | null;
  telegramUserId: number | null;
  title: string;
  createdAt: string;
  lastActivityAt: string;
}

export interface ChatMessage {
  id: number;
  sessionId: number;
  role: "user" | "assistant";
  content: string;
  toolCalls: Array<{ tool: string; args: unknown; sizeChars: number; isError?: boolean }>;
  tokensIn: number;
  tokensOut: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  createdAt: string;
}

export async function createSession(input: {
  canal: Canal;
  userId?: number | null;
  phoneNumber?: string | null;
  telegramUserId?: number | null;
  title?: string;
}): Promise<ChatSession> {
  const row = await queryOne<ChatSession>(
    `INSERT INTO "ChatSessions" (canal, "userId", "phoneNumber", "telegramUserId", title)
     VALUES ($1, $2, $3, $4, COALESCE($5, 'Nouvelle conversation'))
     RETURNING id, canal, "userId", "phoneNumber", "telegramUserId",
               title, "createdAt", "lastActivityAt"`,
    [
      input.canal,
      input.userId ?? null,
      input.phoneNumber ?? null,
      input.telegramUserId ?? null,
      input.title ?? null,
    ],
  );
  if (!row) throw new Error("Échec création session");
  return row;
}

export async function listSessionsForUser(userId: number, limit = 50): Promise<ChatSession[]> {
  return query<ChatSession>(
    `SELECT id, canal, "userId", "phoneNumber", "telegramUserId",
            title, "createdAt", "lastActivityAt"
     FROM "ChatSessions"
     WHERE "userId" = $1
     ORDER BY "lastActivityAt" DESC
     LIMIT $2`,
    [userId, limit],
  );
}

export async function getSession(id: number): Promise<ChatSession | null> {
  return queryOne<ChatSession>(
    `SELECT id, canal, "userId", "phoneNumber", "telegramUserId",
            title, "createdAt", "lastActivityAt"
     FROM "ChatSessions" WHERE id = $1`,
    [id],
  );
}

/**
 * Récupère la session Telegram active (la plus récente) d'un utilisateur, ou
 * null si aucune. Sert au routage : un `telegramId` = une conversation
 * persistante (le user tape, on ne recrée pas de session à chaque message).
 */
export async function getLatestTelegramSession(
  telegramUserId: number,
): Promise<ChatSession | null> {
  return queryOne<ChatSession>(
    `SELECT id, canal, "userId", "phoneNumber", "telegramUserId",
            title, "createdAt", "lastActivityAt"
     FROM "ChatSessions"
     WHERE canal = 'telegram' AND "telegramUserId" = $1
     ORDER BY "lastActivityAt" DESC
     LIMIT 1`,
    [telegramUserId],
  );
}

export async function listMessages(sessionId: number): Promise<ChatMessage[]> {
  return query<ChatMessage>(
    `SELECT id, "sessionId", role, content, "toolCalls",
            "tokensIn", "tokensOut", "cacheReadTokens", "cacheWriteTokens",
            "createdAt"
     FROM "ChatMessages"
     WHERE "sessionId" = $1
     ORDER BY id`,
    [sessionId],
  );
}

export async function insertMessage(input: {
  sessionId: number;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ChatMessage["toolCalls"];
  tokensIn?: number;
  tokensOut?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}): Promise<number> {
  const row = await queryOne<{ id: number }>(
    `INSERT INTO "ChatMessages"
       ("sessionId", role, content, "toolCalls",
        "tokensIn", "tokensOut", "cacheReadTokens", "cacheWriteTokens")
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
     RETURNING id`,
    [
      input.sessionId,
      input.role,
      input.content,
      JSON.stringify(input.toolCalls ?? []),
      input.tokensIn ?? 0,
      input.tokensOut ?? 0,
      input.cacheReadTokens ?? 0,
      input.cacheWriteTokens ?? 0,
    ],
  );
  if (!row) throw new Error("Échec insertion message");
  await query(
    `UPDATE "ChatSessions" SET "lastActivityAt" = NOW() WHERE id = $1`,
    [input.sessionId],
  );
  return row.id;
}

export async function logMcpCall(input: {
  sessionId: number | null;
  messageId: number | null;
  tool: string;
  args: unknown;
  durationMs: number;
  resultSize: number;
  isError?: boolean;
  errorMsg?: string;
}): Promise<void> {
  await query(
    `INSERT INTO "McpAuditLog"
       ("sessionId", "messageId", tool, args, "durationMs", "resultSize", "isError", "errorMsg")
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)`,
    [
      input.sessionId,
      input.messageId,
      input.tool,
      JSON.stringify(input.args ?? {}),
      input.durationMs,
      input.resultSize,
      input.isError ?? false,
      input.errorMsg ?? null,
    ],
  );
}
