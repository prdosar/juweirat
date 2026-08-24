// Client de l'agent conversationnel (juweirat-mcp-agent).
//
// Séparé de lib/api.ts car il pointe vers un autre service (agent) avec
// sa propre URL de base. Utilise le même JWT localStorage que l'API .NET.

import type { AgentEvent, ChatMessage, ChatSession } from './types';

// En dev, l'agent tourne sur localhost:3010.
// En prod, nginx expose /agent → 3010.
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? 'http://localhost:3010';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('juweirat_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function json<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('juweirat_token');
      localStorage.removeItem('juweirat_user');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const chatApi = {
  async createSession(title?: string): Promise<ChatSession> {
    const res = await fetch(`${AGENT_URL}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(title ? { title } : {}),
    });
    return json<ChatSession>(res);
  },

  async listSessions(): Promise<ChatSession[]> {
    const res = await fetch(`${AGENT_URL}/api/chat/sessions`, {
      headers: authHeaders(),
    });
    const data = await json<{ sessions: ChatSession[] }>(res);
    return data.sessions;
  },

  async getSession(id: number): Promise<{ session: ChatSession; messages: ChatMessage[] }> {
    const res = await fetch(`${AGENT_URL}/api/chat/sessions/${id}`, {
      headers: authHeaders(),
    });
    return json<{ session: ChatSession; messages: ChatMessage[] }>(res);
  },

  /**
   * Envoie un message et consomme le stream SSE.
   * Le callback `onEvent` reçoit chaque event agent au fur et à mesure.
   * Rejette si le serveur retourne un HTTP non-2xx avant le début du stream.
   */
  async streamMessage(
    sessionId: number,
    message: string,
    onEvent: (event: AgentEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const res = await fetch(`${AGENT_URL}/api/chat/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...authHeaders(),
      },
      body: JSON.stringify({ message }),
      signal,
    });

    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nl).trimEnd();
          buffer = buffer.slice(nl + 1);

          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent) onEvent({ ...data, type: currentEvent } as AgentEvent);
            } catch {
              // ignore malformed frames
            }
          }
          // Lignes vides = séparateur SSE, on ignore.
        }
      }
    } finally {
      try { reader.releaseLock(); } catch { /* noop */ }
    }
  },
};
