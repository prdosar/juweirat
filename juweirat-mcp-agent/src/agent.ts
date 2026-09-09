import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";
import { callTool, getTools } from "./mcp-client.js";
import { insertMessage, listMessages, logMcpCall } from "./sessions.js";

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

export type AgentEvent =
  | { type: "text"; delta: string }
  | { type: "tool_use"; tool: string; args: unknown }
  | { type: "tool_result"; tool: string; sizeChars: number; isError: boolean }
  | {
      type: "done";
      tokensIn: number;
      tokensOut: number;
      cacheReadTokens: number;
      cacheWriteTokens: number;
    }
  | { type: "error"; message: string };

/**
 * Convertit les tools MCP → format Anthropic Tool. Le JSON Schema est identique
 * entre MCP et Anthropic, seul le wrapping change. Le DERNIER tool porte le
 * cache_control : ça verrouille l'ensemble {tools + system} dans le prompt
 * cache pour toutes les requêtes suivantes de la session.
 *
 * Voir shared/prompt-caching.md : render order = tools → system → messages.
 * Un cache_control sur le dernier tool (ou le dernier bloc system) capture
 * tout ce qui précède.
 */
function anthropicTools(): Anthropic.Tool[] {
  const tools = getTools();
  return tools.map((t, i) => {
    const base: Anthropic.Tool = {
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
    };
    // cache_control sur le dernier tool uniquement — 1 breakpoint sur la partie
    // tools+system commune à tous les tours de la session.
    if (i === tools.length - 1) {
      return { ...base, cache_control: { type: "ephemeral" } };
    }
    return base;
  });
}

/**
 * Reconstruit l'historique conversationnel au format Anthropic MessageParam[].
 * Priorité à contentBlocks (blocks Anthropic complets, source de vérité pour
 * le rejeu) ; fallback sur content texte pour les messages pré-migration.
 *
 * CRITIQUE : pour chaque tool_use dans un tour assistant, il DOIT y avoir un
 * tour user contenant les tool_result correspondants dans le message suivant.
 * Sinon l'API renvoie 400. La persistance en base garantit cette séquence.
 */
async function loadHistory(sessionId: number): Promise<Anthropic.MessageParam[]> {
  const rows = await listMessages(sessionId);
  return rows
    .filter((r) => {
      // On garde les messages qui ont des contentBlocks OU du texte non vide.
      if (r.contentBlocks && Array.isArray(r.contentBlocks) && r.contentBlocks.length > 0) return true;
      return r.content.trim().length > 0;
    })
    .map((r): Anthropic.MessageParam => {
      if (r.contentBlocks && Array.isArray(r.contentBlocks) && r.contentBlocks.length > 0) {
        return {
          role: r.role,
          content: r.contentBlocks as Array<Anthropic.ContentBlockParam>,
        };
      }
      // Fallback texte pour les messages pré-migration (pas de blocks stockés).
      return { role: r.role, content: r.content };
    });
}

/**
 * Second message système (dynamique, non caché) : date du jour à Lomé.
 * Le premier SYSTEM_PROMPT reste stable et cacheable ; celui-ci change chaque
 * jour et sert au modèle pour interpréter "aujourd'hui", "cette semaine", etc.
 */
function todayContextBlock(): Anthropic.TextBlockParam {
  const now = new Date();
  const iso = now.toISOString().slice(0, 10);
  const weekday = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(now);
  return {
    type: "text",
    text: `Date du jour : ${iso} (${weekday}, heure de Lomé / UTC+0).\n\nPour "en ce moment" / "aujourd'hui" : from = to = ${iso}. "Cette semaine" = lundi→dimanche courant. "Ce mois" = 1er→dernier jour du mois de ${iso}.`,
  };
}

export interface RunTurnInput {
  sessionId: number;
  userMessage: string;
  emit: (event: AgentEvent) => void;
}

/**
 * Un tour complet : envoie le message user, boucle sur tool_use jusqu'à ce que
 * stop_reason ≠ "tool_use", persiste chaque itération (assistant blocks +
 * user tool_results) pour permettre le rejeu du contexte au tour suivant.
 *
 * Cette persistance des tool_result blocks est LE fix critique : sans elle,
 * l'agent perd le contexte des tools au tour suivant et hallucine (bug
 * observé sur le bot Telegram avant migration).
 */
export async function runTurn(input: RunTurnInput): Promise<void> {
  const { sessionId, userMessage, emit } = input;

  const history = await loadHistory(sessionId);
  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  // Persiste le message user IMMÉDIATEMENT : si le tour crash après, on garde
  // la trace de ce qui a été demandé. Le contentBlocks est trivial ici (juste
  // du texte), mais on l'inscrit pour uniformité.
  const userMessageId = await insertMessage({
    sessionId,
    role: "user",
    content: userMessage,
    contentBlocks: [{ type: "text", text: userMessage }],
  });

  const toolCallsAudit: Array<{ tool: string; args: unknown; sizeChars: number; isError?: boolean }> = [];
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let totalCacheRead = 0;
  let totalCacheWrite = 0;
  let assistantTextForAudit = "";

  // System = deux blocs : SYSTEM_PROMPT (statique, cacheable) + date du jour
  // (dynamique, non cachée mais tolérable en fin de prefix). Le cache_control
  // du DERNIER tool couvre déjà tools+system_statique dans une seule entrée.
  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
    todayContextBlock(),
  ];

  try {
    for (let iteration = 0; iteration < config.anthropic.maxToolIterations; iteration += 1) {
      const stream = client.messages.stream({
        model: config.anthropic.model,
        max_tokens: config.anthropic.maxTokens,
        system,
        tools: anthropicTools(),
        tool_choice: { type: "auto" },
        messages,
      });

      // Stream des deltas texte via callback (émet event "text" vers le canal
      // Telegram/web pour affichage progressif).
      stream.on("text", (delta) => {
        emit({ type: "text", delta });
      });

      // Message final = message complet reconstruit par le SDK (tous les blocks).
      const finalMessage = await stream.finalMessage();

      // Comptabilise l'usage — utile pour le tableau de bord et le débogage
      // des cache hits.
      const usage = finalMessage.usage;
      totalTokensIn += usage.input_tokens ?? 0;
      totalTokensOut += usage.output_tokens ?? 0;
      totalCacheRead += usage.cache_read_input_tokens ?? 0;
      totalCacheWrite += usage.cache_creation_input_tokens ?? 0;

      // Sépare les blocks pour extraire le texte (audit) et détecter les tool_use.
      const assistantBlocks = finalMessage.content;
      const toolUseBlocks = assistantBlocks.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );

      // Cumule le texte assistant pour la colonne `content` (audit humain).
      for (const block of assistantBlocks) {
        if (block.type === "text") {
          assistantTextForAudit += block.text;
        }
      }

      // Persiste le tour assistant COMPLET (avec les tool_use blocks) — ces
      // blocks devront être rejoués tels quels au prochain tour pour éviter
      // que le modèle hallucine des données mutées entre-temps.
      const iterationText = assistantBlocks
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      await insertMessage({
        sessionId,
        role: "assistant",
        content: iterationText.trim(),
        contentBlocks: assistantBlocks as unknown as unknown[],
        tokensIn: usage.input_tokens ?? 0,
        tokensOut: usage.output_tokens ?? 0,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
      });

      // Ajoute le tour assistant à la conversation en cours (mémoire).
      messages.push({ role: "assistant", content: assistantBlocks });

      // Si plus de tool_use → tour terminé.
      if (finalMessage.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
        break;
      }

      // Exécute chaque tool_use, accumule les tool_result correspondants dans
      // un SEUL message user (Anthropic autorise plusieurs tool_result blocks
      // dans un même message).
      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];
      for (const tc of toolUseBlocks) {
        emit({ type: "tool_use", tool: tc.name, args: tc.input });
        const t0 = Date.now();
        let text = "";
        let isError = false;
        let errorMsg: string | undefined;
        try {
          const result = await callTool(tc.name, tc.input);
          text = result.text;
          isError = result.isError;
          if (isError) errorMsg = text;
        } catch (err) {
          isError = true;
          errorMsg = err instanceof Error ? err.message : String(err);
          text = `Erreur d'exécution du tool ${tc.name} : ${errorMsg}`;
        }
        const durationMs = Date.now() - t0;

        emit({ type: "tool_result", tool: tc.name, sizeChars: text.length, isError });
        toolCallsAudit.push({
          tool: tc.name,
          args: tc.input,
          sizeChars: text.length,
          isError,
        });

        void logMcpCall({
          sessionId,
          messageId: userMessageId,
          tool: tc.name,
          args: tc.input,
          durationMs,
          resultSize: text.length,
          isError,
          errorMsg,
        }).catch((e) => console.error("[agent] audit log fail:", e));

        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: tc.id,
          content: text || "(aucun résultat)",
          is_error: isError,
        });
      }

      // Persiste le tour "user tool_results" — ces blocks DOIVENT être présents
      // dans l'historique aux tours suivants sinon le modèle a "oublié" ce que
      // le tool a répondu et réhallucine.
      await insertMessage({
        sessionId,
        role: "user",
        content: `[${toolResultBlocks.length} tool_result(s)]`,
        contentBlocks: toolResultBlocks as unknown as unknown[],
      });

      // Ajoute à la conversation en cours et reboucle.
      messages.push({ role: "user", content: toolResultBlocks });
    }

    emit({
      type: "done",
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      cacheReadTokens: totalCacheRead,
      cacheWriteTokens: totalCacheWrite,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[agent] runTurn error:", err);
    emit({ type: "error", message });

    await insertMessage({
      sessionId,
      role: "assistant",
      content: `[Erreur : ${message}]${assistantTextForAudit ? `\n\nRéponse partielle :\n${assistantTextForAudit}` : ""}`,
      contentBlocks: null,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      cacheReadTokens: totalCacheRead,
      cacheWriteTokens: totalCacheWrite,
    }).catch((e) => console.error("[agent] persist error message failed:", e));
  }
}
