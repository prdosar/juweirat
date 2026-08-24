import { query } from "../db.js";
import { sendMessage } from "../telegram/client.js";

interface ActiveStaffRow {
  telegramId: number;
}

/**
 * Envoie un message MarkdownV2 à tous les staff actifs. Fire-and-forget par
 * destinataire : un échec sur un chat ne bloque pas les autres. Fallback plain
 * text si l'échappement MarkdownV2 casse (rare mais possible sur du texte lib
 * saisi par le staff, ex. Description de ticket maintenance).
 */
export async function broadcastToActiveStaff(text: string): Promise<void> {
  const users = await query<ActiveStaffRow>(
    `SELECT "telegramId" FROM "TelegramUsers" WHERE "isActive" = TRUE`,
  );

  if (users.length === 0) {
    console.log("[notifications] Aucun staff actif à notifier — message ignoré");
    return;
  }

  await Promise.allSettled(
    users.map(async (u) => {
      try {
        await sendMessage({ chatId: u.telegramId, text, parseMode: "MarkdownV2" });
      } catch (err) {
        console.warn(
          `[notifications] MarkdownV2 rejeté pour chatId=${u.telegramId}, fallback plain :`,
          err instanceof Error ? err.message : err,
        );
        // Fallback : renvoie le texte brut (les * et \\ resteront visibles mais lisibles).
        try {
          await sendMessage({ chatId: u.telegramId, text });
        } catch (err2) {
          console.error(
            `[notifications] Envoi plain aussi échoué pour chatId=${u.telegramId} :`,
            err2 instanceof Error ? err2.message : err2,
          );
        }
      }
    }),
  );
}
