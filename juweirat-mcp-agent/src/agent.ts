import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionMessageToolCall,
} from "openai/resources/chat/completions";
import { config } from "./config.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";
import { callTool, getTools } from "./mcp-client.js";
import { insertMessage, listMessages, logMcpCall } from "./sessions.js";

const openai = new OpenAI({ apiKey: config.openai.apiKey });

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
 * Convertit les tools MCP → format OpenAI Function Calling.
 * Le JSON Schema est identique côté MCP et OpenAI, seul le wrapping change.
 */
function openaiTools(): ChatCompletionTool[] {
  return getTools().map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));
}

/**
 * Charge l'historique d'une session au format OpenAI ChatCompletionMessageParam[].
 * On garde uniquement les tours conversationnels (pas les tool_call/tool_result
 * intermédiaires — on veut un contexte propre pour les tours suivants).
 */
async function loadHistory(sessionId: number): Promise<ChatCompletionMessageParam[]> {
  const messages = await listMessages(sessionId);
  return messages
    .filter((m) => m.content.trim().length > 0)
    .map((m): ChatCompletionMessageParam => ({ role: m.role, content: m.content }));
}

export interface RunTurnInput {
  sessionId: number;
  userMessage: string;
  emit: (event: AgentEvent) => void;
}

/**
 * Un tour complet : envoie le message user, boucle sur tool_calls jusqu'à ce que
 * finish_reason ne soit plus "tool_calls", persiste user + assistant, stream via `emit`.
 *
 * Note pricing : OpenAI facture un `prompt_tokens_details.cached_tokens` séparé
 * pour le cache automatique — on le remonte dans cacheReadTokens.
 */
export async function runTurn(input: RunTurnInput): Promise<void> {
  const { sessionId, userMessage, emit } = input;

  const history = await loadHistory(sessionId);
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userMessage },
  ];

  const userMessageId = await insertMessage({
    sessionId,
    role: "user",
    content: userMessage,
  });

  let assistantText = "";
  const toolCallsAudit: Array<{ tool: string; args: unknown; sizeChars: number; isError?: boolean }> = [];
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let totalCacheRead = 0;

  try {
    for (let iteration = 0; iteration < config.openai.maxToolIterations; iteration += 1) {
      const stream = await openai.chat.completions.create({
        model: config.openai.model,
        max_tokens: config.openai.maxTokens,
        stream: true,
        stream_options: { include_usage: true }, // requis pour recevoir usage sur le dernier chunk
        tools: openaiTools(),
        tool_choice: "auto",
        messages,
      });

      // Accumulateurs par tour (les tool_calls arrivent en deltas → il faut concaténer).
      let iterText = "";
      const iterToolCalls: Map<number, { id: string; name: string; argsJson: string }> = new Map();
      let finishReason: string | null = null;

      for await (const chunk of stream) {
        // Usage n'arrive que sur le dernier chunk quand include_usage=true.
        if (chunk.usage) {
          totalTokensIn += chunk.usage.prompt_tokens ?? 0;
          totalTokensOut += chunk.usage.completion_tokens ?? 0;
          totalCacheRead += chunk.usage.prompt_tokens_details?.cached_tokens ?? 0;
        }

        const choice = chunk.choices[0];
        if (!choice) continue;

        if (choice.finish_reason) finishReason = choice.finish_reason;

        const delta = choice.delta;
        if (!delta) continue;

        if (typeof delta.content === "string" && delta.content.length > 0) {
          iterText += delta.content;
          assistantText += delta.content;
          emit({ type: "text", delta: delta.content });
        }

        // Concatène les deltas tool_calls par index.
        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            const existing = iterToolCalls.get(idx) ?? { id: "", name: "", argsJson: "" };
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.name = tc.function.name;
            if (tc.function?.arguments) existing.argsJson += tc.function.arguments;
            iterToolCalls.set(idx, existing);
          }
        }
      }

      // Si pas d'appel outil → tour terminé.
      if (finishReason !== "tool_calls" || iterToolCalls.size === 0) {
        break;
      }

      // Reconstruit le message assistant avec ses tool_calls pour le rejeu.
      const assistantToolCalls: ChatCompletionMessageToolCall[] = [...iterToolCalls.values()].map(
        (tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.argsJson || "{}" },
        }),
      );

      messages.push({
        role: "assistant",
        content: iterText || null,
        tool_calls: assistantToolCalls,
      });

      // Exécute chaque tool call, pousse un message tool en réponse (un par call).
      for (const tc of assistantToolCalls) {
        let parsedArgs: unknown = {};
        try {
          parsedArgs = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
        } catch {
          parsedArgs = { _rawArgs: tc.function.arguments };
        }

        emit({ type: "tool_use", tool: tc.function.name, args: parsedArgs });
        const t0 = Date.now();
        let text = "";
        let isError = false;
        let errorMsg: string | undefined;
        try {
          const result = await callTool(tc.function.name, parsedArgs);
          text = result.text;
          isError = result.isError;
          if (isError) errorMsg = text;
        } catch (err) {
          isError = true;
          errorMsg = err instanceof Error ? err.message : String(err);
          text = `Erreur d'exécution du tool ${tc.function.name} : ${errorMsg}`;
        }
        const durationMs = Date.now() - t0;

        emit({ type: "tool_result", tool: tc.function.name, sizeChars: text.length, isError });
        toolCallsAudit.push({
          tool: tc.function.name,
          args: parsedArgs,
          sizeChars: text.length,
          isError,
        });

        void logMcpCall({
          sessionId,
          messageId: userMessageId,
          tool: tc.function.name,
          args: parsedArgs,
          durationMs,
          resultSize: text.length,
          isError,
          errorMsg,
        }).catch((e) => console.error("[agent] audit log fail:", e));

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: text || "(aucun résultat)",
        });
      }
      // Boucle : nouvel appel pour laisser le modèle conclure.
    }

    await insertMessage({
      sessionId,
      role: "assistant",
      content: assistantText.trim() || "(aucune réponse)",
      toolCalls: toolCallsAudit,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      cacheReadTokens: totalCacheRead,
      cacheWriteTokens: 0, // OpenAI n'a pas de cache_creation distinct facturé
    });

    emit({
      type: "done",
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      cacheReadTokens: totalCacheRead,
      cacheWriteTokens: 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[agent] runTurn error:", err);
    emit({ type: "error", message });

    await insertMessage({
      sessionId,
      role: "assistant",
      content: `[Erreur : ${message}]${assistantText ? `\n\nRéponse partielle :\n${assistantText}` : ""}`,
      toolCalls: toolCallsAudit,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      cacheReadTokens: totalCacheRead,
      cacheWriteTokens: 0,
    }).catch((e) => console.error("[agent] persist error message failed:", e));
  }
}
