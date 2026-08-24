import { Router, type Request, type Response } from "express";
import { config } from "../config.js";
import { runTurn, type AgentEvent } from "../agent.js";
import {
  createSession,
  getLatestTelegramSession,
  type ChatSession,
} from "../sessions.js";
import { authorizeTelegramUser } from "./users.js";
import {
  editMessageText,
  sendChatAction,
  sendMessage,
  sendPhoto,
  type TelegramUpdate,
} from "./client.js";
import {
  chartToQuickchartUrl,
  extractCharts,
  splitForTelegram,
  toMarkdownV2,
} from "./format.js";

const router = Router();

// ─── Webhook Telegram ────────────────────────────────────────────────────────
// Telegram POST son update ici. On répond 200 IMMÉDIATEMENT et on traite en
// arrière-plan : si on met plus de quelques secondes à répondre, Telegram
// considère l'update en échec et le rejoue → double traitement.
router.post("/webhook", (req: Request, res: Response) => {
  const secret = req.header("X-Telegram-Bot-Api-Secret-Token");
  if (secret !== config.telegram.webhookSecret) {
    console.warn("[telegram] Webhook: secret invalide, refusé");
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const update = req.body as TelegramUpdate;
  res.status(200).json({ ok: true });

  // Fire-and-forget : les erreurs sont loguées, jamais renvoyées à Telegram
  // (sinon retry infini). On ack toujours 200.
  void handleUpdate(update).catch((err) => {
    console.error("[telegram] handleUpdate error:", err);
  });
});

export default router;

// ─── Traitement d'un update ──────────────────────────────────────────────────

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg || !msg.text || !msg.from) return; // on ignore les updates sans texte

  const telegramId = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // ── 1. Whitelist ───────────────────────────────────────────────────────────
  const displayName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") || null;
  const user = await authorizeTelegramUser({
    telegramId,
    username: msg.from.username ?? null,
    displayName,
  });
  if (!user) {
    await sendMessage({
      chatId,
      text:
        "❌ Accès refusé. Ce bot est réservé au staff Juweirat. " +
        `Communique ton identifiant Telegram (\`${telegramId}\`) à l'administrateur si tu dois y être ajouté.`,
      parseMode: "Markdown",
    });
    return;
  }

  // ── 2. Commandes ───────────────────────────────────────────────────────────
  if (text.startsWith("/start")) {
    await sendMessage({
      chatId,
      text:
        `Bonjour ${displayName ?? "!"} 👋\n\n` +
        "Je suis l'agent conversationnel Juweirat. Je peux consulter en temps réel " +
        "l'occupation, les revenus, les réservations, les folios et le housekeeping.\n\n" +
        "Pose-moi une question en français. Exemples :\n" +
        "• « Combien de chambres occupées aujourd'hui ? »\n" +
        "• « CA encaissé cette semaine par catégorie »\n" +
        "• « Compare l'occupation de juillet et août »\n\n" +
        "Commandes : /reset pour repartir sur une conversation vierge, /help pour cette aide.",
    });
    return;
  }
  if (text.startsWith("/help")) {
    await sendMessage({
      chatId,
      text:
        "Commandes disponibles :\n" +
        "/start — présentation\n" +
        "/reset — nouvelle conversation (l'historique précédent reste consultable dans l'admin)\n" +
        "/help — cette aide\n\n" +
        "Toutes les données sont en LECTURE SEULE. Aucune modification n'est possible via ce bot.",
    });
    return;
  }
  if (text.startsWith("/reset")) {
    // Créer une nouvelle session force une conversation vierge (la précédente
    // reste en base pour audit dans l'admin).
    await createSession({
      canal: "telegram",
      userId: user.userId,
      telegramUserId: telegramId,
      title: `Telegram ${displayName ?? telegramId}`,
    });
    await sendMessage({ chatId, text: "🔄 Nouvelle conversation démarrée." });
    return;
  }

  // ── 3. Session (réutilise la dernière, sinon en crée une) ──────────────────
  let session: ChatSession | null = await getLatestTelegramSession(telegramId);
  if (!session) {
    session = await createSession({
      canal: "telegram",
      userId: user.userId,
      telegramUserId: telegramId,
      title: `Telegram ${displayName ?? telegramId}`,
    });
  }

  // ── 4. Placeholder + indicateur "en train d'écrire" ────────────────────────
  await sendChatAction({ chatId, action: "typing" });
  const placeholder = await sendMessage({
    chatId,
    text: "⏳ Recherche en cours…",
    replyToMessageId: msg.message_id,
  });

  // Renouvelle le "typing" toutes les 4s tant qu'on n'a pas fini (l'action
  // s'auto-efface après 5s côté Telegram).
  const typingInterval = setInterval(() => {
    void sendChatAction({ chatId, action: "typing" }).catch(() => { /* ignore */ });
  }, 4000);

  // ── 5. runTurn — on bufferise le texte, on ne stream pas vers Telegram ─────
  let buffer = "";
  let errorMsg: string | null = null;
  const emit = (event: AgentEvent): void => {
    if (event.type === "text") buffer += event.delta;
    else if (event.type === "error") errorMsg = event.message;
  };

  try {
    await runTurn({ sessionId: session.id, userMessage: text, emit });
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
  } finally {
    clearInterval(typingInterval);
  }

  if (errorMsg) {
    await editMessageText({
      chatId,
      messageId: placeholder.message_id,
      text: `❌ Erreur : ${errorMsg}`,
    });
    return;
  }

  const rawAnswer = buffer.trim() || "(aucune réponse générée)";

  // ── 6. Extraction graphes + envoi ──────────────────────────────────────────
  const { textWithoutCharts, charts } = extractCharts(rawAnswer);
  const parts = splitForTelegram(toMarkdownV2(textWithoutCharts));

  // Le premier chunk remplace le placeholder ; les suivants sont envoyés en
  // messages séparés. Fallback plain text si MarkdownV2 casse (échappement raté).
  try {
    await editMessageText({
      chatId,
      messageId: placeholder.message_id,
      text: parts[0],
      parseMode: "MarkdownV2",
    });
  } catch (err) {
    console.warn("[telegram] MarkdownV2 rejeté, fallback plain :", err);
    await editMessageText({
      chatId,
      messageId: placeholder.message_id,
      text: textWithoutCharts, // texte non échappé, plain
    });
  }

  for (let i = 1; i < parts.length; i++) {
    try {
      await sendMessage({ chatId, text: parts[i], parseMode: "MarkdownV2" });
    } catch {
      await sendMessage({ chatId, text: parts[i] });
    }
  }

  // ── 7. Graphes en PNG via quickchart.io ────────────────────────────────────
  for (const chart of charts) {
    try {
      await sendChatAction({ chatId, action: "upload_photo" });
      await sendPhoto({
        chatId,
        photoUrl: chartToQuickchartUrl(chart),
        caption: chart.title,
      });
    } catch (err) {
      console.warn("[telegram] sendPhoto (chart) failed:", err);
    }
  }
}
