'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, X, Maximize2, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { chatApi } from '@/lib/chat-api';
import type { ChatSession } from '@/lib/types';
import ChatConversation from './ChatConversation';

/**
 * Bouton flottant en bas droite + panneau 380×600. Ouvre la dernière session
 * du user ou en crée une nouvelle si aucune. Bouton "Nouvelle" et "Agrandir"
 * (renvoie vers /admin/chat) accessibles en tête de panneau.
 */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState('');

  // Charge / crée une session à la 1re ouverture.
  useEffect(() => {
    if (!open || session || initializing) return;
    setInitializing(true);
    setError('');
    (async () => {
      try {
        const list = await chatApi.listSessions();
        setSession(list[0] ?? await chatApi.createSession());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setInitializing(false);
      }
    })();
  }, [open, session, initializing]);

  async function handleNew() {
    setInitializing(true);
    setError('');
    try {
      setSession(await chatApi.createSession('Nouvelle conversation'));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setInitializing(false);
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le chat agent"
          className="fixed bottom-5 right-5 z-40 w-13 h-13 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center print:hidden"
          style={{ width: 52, height: 52 }}
        >
          <MessageCircle size={22} />
        </button>
      )}

      {/* Panneau */}
      {open && (
        <div
          className="fixed bottom-5 right-5 z-40 w-[380px] h-[600px] max-h-[calc(100vh-40px)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden print:hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-green-600 to-green-700 text-white">
            <MessageCircle size={16} />
            <span className="flex-1 font-medium text-sm truncate">
              {session?.title ?? 'Agent Juweirat'}
            </span>
            <button
              onClick={handleNew}
              disabled={initializing}
              title="Nouvelle conversation"
              className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
            >
              <Plus size={16} />
            </button>
            <Link
              href="/chat"
              onClick={() => setOpen(false)}
              title="Ouvrir en plein écran"
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <Maximize2 size={16} />
            </Link>
            <button
              onClick={() => setOpen(false)}
              title="Fermer"
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Corps */}
          {error && (
            <div className="m-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}
          {initializing || !session ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              <Loader2 size={16} className="animate-spin mr-2" /> Initialisation…
            </div>
          ) : (
            <ChatConversation
              key={session.id}
              sessionId={session.id}
              onSessionUpdated={setSession}
            />
          )}
        </div>
      )}
    </>
  );
}
