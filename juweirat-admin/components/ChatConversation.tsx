'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Wrench, Loader2, AlertCircle } from 'lucide-react';
import { chatApi } from '@/lib/chat-api';
import type { AgentEvent, ChatMessage, ChatSession } from '@/lib/types';

interface Props {
  sessionId: number;
  /** Callback appelé quand la session est mise à jour (nouveau lastActivityAt, titre). */
  onSessionUpdated?: (session: ChatSession) => void;
}

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls: Array<{ tool: string; running: boolean; isError?: boolean }>;
  isStreaming?: boolean;
}

/**
 * Composant conversation autonome : charge l'historique de la session, expose
 * un input pour envoyer un message et consomme le stream SSE. Utilisé à la
 * fois par le widget flottant et la page /admin/chat.
 */
export default function ChatConversation({ sessionId, onSessionUpdated }: Props) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Charge l'historique quand la session change.
  useEffect(() => {
    setLoading(true);
    setError('');
    chatApi.getSession(sessionId)
      .then(({ session, messages: hist }) => {
        setMessages(hist.map(mapHistoryMessage));
        onSessionUpdated?.(session);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));

    return () => { abortRef.current?.abort(); };
  }, [sessionId, onSessionUpdated]);

  // Autoscroll en bas dès qu'un message arrive ou grossit.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    setInput('');
    setError('');
    setStreaming(true);

    // Message utilisateur ajouté immédiatement (optimistic).
    setMessages(prev => [...prev, { role: 'user', content: trimmed, toolCalls: [] }]);
    // Placeholder assistant qui sera nourri par le stream.
    setMessages(prev => [...prev, { role: 'assistant', content: '', toolCalls: [], isStreaming: true }]);

    const controller = new AbortController();
    abortRef.current = controller;

    const onEvent = (event: AgentEvent): void => {
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (!last || last.role !== 'assistant') return prev;
        switch (event.type) {
          case 'text':
            last.content += event.delta;
            break;
          case 'tool_use':
            last.toolCalls.push({ tool: event.tool, running: true });
            break;
          case 'tool_result': {
            // Marque le dernier tool_use portant ce nom comme terminé.
            for (let i = last.toolCalls.length - 1; i >= 0; i -= 1) {
              if (last.toolCalls[i].tool === event.tool && last.toolCalls[i].running) {
                last.toolCalls[i].running = false;
                last.toolCalls[i].isError = event.isError;
                break;
              }
            }
            break;
          }
          case 'done':
            last.isStreaming = false;
            break;
          case 'error':
            last.isStreaming = false;
            setError(event.message);
            break;
        }
        return copy;
      });
    };

    try {
      await chatApi.streamMessage(sessionId, trimmed, onEvent, controller.signal);
    } catch (e: unknown) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : 'Erreur');
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        <Loader2 size={16} className="animate-spin mr-2" /> Chargement…
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-8">
            Pose une question sur les données Juweirat.<br />
            Ex. « Occupation août ? » ou « Impayés ? »
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
      </div>

      {/* Erreur globale */}
      {error && (
        <div className="mx-3 mb-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="border-t border-gray-100 p-3 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={streaming}
          placeholder={streaming ? 'Réponse en cours…' : 'Ta question…'}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          title="Envoyer"
        >
          {streaming
            ? <Loader2 size={16} className="animate-spin" />
            : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-3 py-2 bg-green-600 text-white rounded-2xl rounded-br-sm text-sm whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-1.5">
        {message.toolCalls.length > 0 && (
          <div className="space-y-1">
            {message.toolCalls.map((tc, i) => (
              <div
                key={i}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] mr-1 ${
                  tc.isError
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : tc.running
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                {tc.running
                  ? <Loader2 size={10} className="animate-spin" />
                  : <Wrench size={10} />}
                <code className="font-mono">{tc.tool}</code>
              </div>
            ))}
          </div>
        )}
        {(message.content || message.isStreaming) && (
          <div className="px-3 py-2 bg-gray-100 text-charcoal rounded-2xl rounded-bl-sm text-sm whitespace-pre-wrap">
            {message.content}
            {message.isStreaming && !message.content && (
              <Loader2 size={12} className="animate-spin inline-block" />
            )}
            {message.isStreaming && message.content && (
              <span className="inline-block w-1.5 h-4 bg-gray-400 ml-0.5 align-middle animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function mapHistoryMessage(m: ChatMessage): DisplayMessage {
  return {
    role: m.role,
    content: m.content,
    toolCalls: (m.toolCalls ?? []).map(tc => ({
      tool: tc.tool,
      running: false,
      isError: tc.isError,
    })),
  };
}
