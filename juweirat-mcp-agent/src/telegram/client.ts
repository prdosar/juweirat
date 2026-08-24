import { config } from "../config.js";

// Wrapper minimal sur la Bot API — pas de dépendance npm supplémentaire.
// Docs : https://core.telegram.org/bots/api

function apiUrl(method: string): string {
  if (!config.telegram.botToken) throw new Error("Telegram désactivé (pas de token)");
  return `${config.telegram.apiBaseUrl}/bot${config.telegram.botToken}/${method}`;
}

async function tgCall<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string; error_code?: number };
  if (!json.ok) {
    throw new Error(`Telegram ${method} failed [${json.error_code}]: ${json.description}`);
  }
  return json.result as T;
}

export interface TgMessage {
  message_id: number;
  chat: { id: number };
  text?: string;
}

export async function sendMessage(input: {
  chatId: number;
  text: string;
  parseMode?: "MarkdownV2" | "HTML" | "Markdown";
  disablePreview?: boolean;
  replyToMessageId?: number;
}): Promise<TgMessage> {
  return tgCall<TgMessage>("sendMessage", {
    chat_id: input.chatId,
    text: input.text,
    parse_mode: input.parseMode,
    disable_web_page_preview: input.disablePreview ?? true,
    reply_to_message_id: input.replyToMessageId,
  });
}

export async function editMessageText(input: {
  chatId: number;
  messageId: number;
  text: string;
  parseMode?: "MarkdownV2" | "HTML" | "Markdown";
}): Promise<void> {
  await tgCall<TgMessage>("editMessageText", {
    chat_id: input.chatId,
    message_id: input.messageId,
    text: input.text,
    parse_mode: input.parseMode,
    disable_web_page_preview: true,
  });
}

export async function sendPhoto(input: {
  chatId: number;
  photoUrl: string;
  caption?: string;
  parseMode?: "MarkdownV2" | "HTML";
}): Promise<TgMessage> {
  return tgCall<TgMessage>("sendPhoto", {
    chat_id: input.chatId,
    photo: input.photoUrl,
    caption: input.caption,
    parse_mode: input.parseMode,
  });
}

export async function sendChatAction(input: {
  chatId: number;
  action: "typing" | "upload_photo";
}): Promise<void> {
  await tgCall("sendChatAction", { chat_id: input.chatId, action: input.action });
}

export async function setWebhook(input: {
  url: string;
  secretToken: string;
  allowedUpdates?: string[];
}): Promise<void> {
  await tgCall("setWebhook", {
    url: input.url,
    secret_token: input.secretToken,
    allowed_updates: input.allowedUpdates ?? ["message"],
    drop_pending_updates: true,
  });
}

export async function deleteWebhook(): Promise<void> {
  await tgCall("deleteWebhook", { drop_pending_updates: true });
}

// ── Types minimum d'un update Telegram (on n'expose que ce qu'on utilise) ────
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; username?: string; first_name?: string; last_name?: string };
    chat: { id: number; type: string };
    date: number;
    text?: string;
    entities?: Array<{ type: string; offset: number; length: number }>;
  };
}
