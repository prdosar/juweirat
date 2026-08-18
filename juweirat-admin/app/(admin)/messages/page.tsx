'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import { contactMessages } from '@/lib/api';
import type { ContactMessageDto } from '@/lib/types';
import {
  Mail, Search, Send, CheckCircle2, Clock, Phone,
  User, RefreshCw, MessageSquare, AlertCircle, CornerDownRight, Check
} from 'lucide-react';

export default function MessagesPage() {
  const [messages, setMessages]       = useState<ContactMessageDto[]>([]);
  const [selectedId, setSelectedId]   = useState<number | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Reply form state
  const [replyText, setReplyText]     = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [replyError, setReplyError]   = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await contactMessages.getAll(
        filterStatus === 'all' ? undefined : filterStatus,
        search.trim() || undefined
      );
      setMessages(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load contact messages', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus, search, selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedMsg = messages.find(m => m.id === selectedId) ?? null;

  // Auto-fill greeting when selecting a new message
  useEffect(() => {
    if (selectedMsg) {
      setReplyText(`Bonjour ${selectedMsg.name},\n\n`);
      setReplyError('');
      setReplySuccess(false);

      // Auto-mark as read if new
      if (selectedMsg.status === 'New') {
        contactMessages.markAsRead(selectedMsg.id).then(() => {
          setMessages(prev => prev.map(m => m.id === selectedMsg.id ? { ...m, status: 'Read' } : m));
        });
      }
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMsg || !replyText.trim()) return;

    setSendingReply(true);
    setReplyError('');
    setReplySuccess(false);

    try {
      await contactMessages.reply(selectedMsg.id, replyText.trim());
      setReplySuccess(true);
      
      // Update local state
      setMessages(prev => prev.map(m => m.id === selectedMsg.id ? {
        ...m,
        status: 'Replied',
        replyMessage: replyText.trim(),
        repliedAt: new Date().toISOString(),
        repliedBy: 'Direction Juweirat'
      } : m));
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi de la réponse.');
    } finally {
      setSendingReply(false);
    }
  };

  const newCount = messages.filter(m => m.status === 'New').length;

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  const formatShortDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const isToday = new Date().toDateString() === d.toDateString();
      if (isToday) {
        return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return <span className="bg-gold/15 text-gold font-bold text-[10px] uppercase px-2 py-0.5 rounded-full">Nouveau</span>;
      case 'Replied':
        return <span className="bg-green/15 text-green-dark font-bold text-[10px] uppercase px-2 py-0.5 rounded-full flex items-center gap-1"><Check size={10} /> Répondu</span>;
      case 'Read':
      default:
        return <span className="bg-gray-100 text-gray-500 font-medium text-[10px] uppercase px-2 py-0.5 rounded-full">Lu</span>;
    }
  };

  return (
    <div className="flex flex-col min-h-full md:h-full overflow-hidden">
      <Header title="Messages & Demandes de Contact" />

      <div className="flex-1 p-6 flex flex-col min-h-0 max-w-7xl w-full mx-auto space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-bold">
              <Mail size={20} />
            </div>
            <div>
              <h1 className="text-base font-bold text-charcoal m-0 flex items-center gap-2">
                Boîte de Contact Site Web
                {newCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {newCount} non lu{newCount > 1 ? 's' : ''}
                  </span>
                )}
              </h1>
              <p className="text-xs text-gray-400">Emails reçus depuis le formulaire public juweirat.com/contact</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-charcoal bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Master-Detail Container */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-[500px] md:min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          
          {/* ── LEFT PANE: Message List ── */}
          <div className="w-full md:w-80 lg:w-96 border-r border-gray-100 flex flex-col shrink-0 min-h-0">
            {/* Search & Tabs */}
            <div className="p-3 border-b border-gray-100 space-y-2.5 bg-surface/30">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher nom, email, sujet…"
                  className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green"
                />
              </div>

              <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs font-semibold text-gray-500">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`flex-1 py-1 rounded-md text-center transition-colors ${filterStatus === 'all' ? 'bg-white text-charcoal shadow-2xs font-bold' : 'hover:text-charcoal'}`}
                >
                  Tous ({messages.length})
                </button>
                <button
                  onClick={() => setFilterStatus('new')}
                  className={`flex-1 py-1 rounded-md text-center transition-colors ${filterStatus === 'new' ? 'bg-white text-gold shadow-2xs font-bold' : 'hover:text-charcoal'}`}
                >
                  Nouveaux ({messages.filter(m => m.status === 'New').length})
                </button>
                <button
                  onClick={() => setFilterStatus('replied')}
                  className={`flex-1 py-1 rounded-md text-center transition-colors ${filterStatus === 'replied' ? 'bg-white text-green shadow-2xs font-bold' : 'hover:text-charcoal'}`}
                >
                  Répondus
                </button>
              </div>
            </div>

            {/* List items */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs space-y-2">
                  <MessageSquare size={24} className="mx-auto text-gray-300" />
                  <p>Aucun message de contact trouvé.</p>
                </div>
              ) : (
                messages.map(m => {
                  const isSelected = m.id === selectedId;
                  const isNew = m.status === 'New';
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      className={`w-full text-left p-3.5 transition-all flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-green/10 border-l-4 border-green'
                          : isNew
                          ? 'bg-gold/5 hover:bg-gold/10 font-medium'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs truncate ${isNew ? 'font-bold text-charcoal' : 'text-charcoal font-semibold'}`}>
                          {m.name}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {formatShortDate(m.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs truncate ${isNew ? 'text-charcoal font-bold' : 'text-gray-600'}`}>
                          {m.subject}
                        </span>
                        {getStatusBadge(m.status)}
                      </div>

                      <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                        {m.message}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── RIGHT PANE: Message Detail & Reply Box ── */}
          <div className="flex-1 flex flex-col min-h-0 bg-white overflow-y-auto">
            {!selectedMsg ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-2">
                <Mail size={36} className="text-gray-200" />
                <p className="text-sm">Sélectionnez un message pour le lire et y répondre.</p>
              </div>
            ) : (
              <div className="p-6 space-y-6 flex flex-col">
                {/* Sender Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green text-white font-bold text-base flex items-center justify-center shadow-sm">
                      {selectedMsg.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-charcoal m-0">{selectedMsg.name}</h2>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                        <a href={`mailto:${selectedMsg.email}`} className="text-green hover:underline font-medium">
                          {selectedMsg.email}
                        </a>
                        {selectedMsg.phone && (
                          <a
                            href={`https://wa.me/${selectedMsg.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-green inline-flex items-center gap-1"
                          >
                            <Phone size={11} /> {selectedMsg.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-xs text-gray-400">{formatDate(selectedMsg.createdAt)}</div>
                    <div>{getStatusBadge(selectedMsg.status)}</div>
                  </div>
                </div>

                {/* Subject & Message Content */}
                <div className="space-y-3">
                  <div className="text-xs uppercase font-extrabold tracking-wider text-gold">Objet</div>
                  <h3 className="text-base font-bold text-charcoal bg-surface p-3 rounded-lg border border-gray-100">
                    {selectedMsg.subject}
                  </h3>

                  <div className="text-xs uppercase font-extrabold tracking-wider text-gray-400 mt-4">Message du Client</div>
                  <div className="bg-surface/50 border border-gray-100 p-5 rounded-xl text-sm text-charcoal leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedMsg.message}
                  </div>
                </div>

                {/* Previous Reply History (if replied) */}
                {selectedMsg.replyMessage && (
                  <div className="bg-green/5 border border-green/20 rounded-xl p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-green-dark font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={15} /> Réponse envoyée par {selectedMsg.repliedBy || 'Direction Juweirat'}
                      </span>
                      <span className="text-gray-400 font-normal">
                        {selectedMsg.repliedAt ? formatDate(selectedMsg.repliedAt) : ''}
                      </span>
                    </div>
                    <div className="text-sm text-charcoal whitespace-pre-wrap pl-5 border-l-2 border-green/40 pt-1 leading-relaxed">
                      {selectedMsg.replyMessage}
                    </div>
                  </div>
                )}

                {/* ── Direct Reply Form ── */}
                <form onSubmit={handleSendReply} className="pt-4 border-t border-gray-100 space-y-3 mt-auto">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-charcoal uppercase tracking-wider flex items-center gap-1.5">
                      <CornerDownRight size={14} className="text-gold" />
                      Répondre directement au client par email
                    </label>
                    <span className="text-[11px] text-gray-400">
                      Expédié depuis <strong>contact@juweirat.com</strong>
                    </span>
                  </div>

                  {replySuccess && (
                    <div className="bg-green/10 border border-green/30 text-green-dark text-xs p-3 rounded-lg flex items-center gap-2 font-medium">
                      <CheckCircle2 size={15} /> Votre réponse a été envoyée avec succès par email au client et archivée.
                    </div>
                  )}

                  {replyError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-center gap-2">
                      <AlertCircle size={15} /> {replyError}
                    </div>
                  )}

                  <textarea
                    rows={5}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Saisissez votre réponse ici..."
                    required
                    className="w-full border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green leading-relaxed bg-white"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-gray-400">
                      Une copie de cette réponse sera également archivée sur contact@juweirat.com (OVH).
                    </p>
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="inline-flex items-center gap-2 bg-green text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg hover:bg-green-dark transition-colors shadow-sm disabled:opacity-50"
                    >
                      <Send size={13} />
                      {sendingReply ? 'Envoi en cours…' : 'Envoyer la réponse'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
