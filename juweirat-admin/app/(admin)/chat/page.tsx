'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Plus, Loader2, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import ChatConversation from '@/components/ChatConversation';
import { chatApi } from '@/lib/chat-api';
import type { ChatSession } from '@/lib/types';

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    chatApi.listSessions()
      .then(list => {
        setSessions(list);
        // Sélectionne la plus récente ou crée une nouvelle si vide.
        if (list.length > 0) {
          setCurrentId(list[0].id);
        } else {
          chatApi.createSession('Nouvelle conversation')
            .then(s => { setSessions([s]); setCurrentId(s.id); })
            .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erreur'));
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, []);

  async function handleNew() {
    setError('');
    try {
      const s = await chatApi.createSession('Nouvelle conversation');
      setSessions(prev => [s, ...prev]);
      setCurrentId(s.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }

  function onSessionUpdated(updated: ChatSession) {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === updated.id);
      if (idx === -1) return [updated, ...prev];
      const copy = [...prev];
      copy[idx] = updated;
      // Réordonne par lastActivityAt desc.
      copy.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
      return copy;
    });
  }

  return (
    <>
      <Header title="Agent Juweirat" />
      <div className="flex-1 flex min-h-0 bg-white">
        {/* Sidebar sessions */}
        <aside className="w-72 border-r border-gray-100 flex flex-col min-h-0">
          <div className="p-3 border-b border-gray-100">
            <button
              onClick={handleNew}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Plus size={16} /> Nouvelle conversation
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading && (
              <div className="text-center text-xs text-gray-400 py-4">Chargement…</div>
            )}
            {!loading && sessions.length === 0 && (
              <div className="text-center text-xs text-gray-400 py-4">Aucune conversation.</div>
            )}
            {sessions.map(s => {
              const active = s.id === currentId;
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentId(s.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    active
                      ? 'bg-green-50 text-green-900 border border-green-200'
                      : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <MessageCircle size={14} className="flex-shrink-0 text-gray-400" />
                  <span className="flex-1 truncate">{s.title}</span>
                  {active && <ChevronRight size={14} className="text-green-700" />}
                </button>
              );
            })}
          </div>
          <div className="p-3 border-t border-gray-100">
            <Link href="/dashboard" className="text-xs text-gray-500 hover:text-charcoal">
              ← Retour au dashboard
            </Link>
          </div>
        </aside>

        {/* Conversation */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {error && (
            <div className="m-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              <Loader2 size={16} className="animate-spin mr-2" /> Chargement…
            </div>
          ) : currentId ? (
            <ChatConversation
              key={currentId}
              sessionId={currentId}
              onSessionUpdated={onSessionUpdated}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              Sélectionne ou crée une conversation.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
