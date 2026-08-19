'use client';

import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import { cash } from '@/lib/api';
import type { CashSessionDto, CashSessionReportDto, CashRegisterDto } from '@/lib/types';
import {
  LockKeyhole, LockKeyholeOpen, PlusCircle, MinusCircle, X,
  Clock, TrendingUp, TrendingDown, Calculator, ArrowRight,
} from 'lucide-react';

function fmt(n: number | null | undefined): string {
  return n == null ? '—' : Math.round(n).toLocaleString('fr-FR');
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function CashSessionPage() {
  const [current, setCurrent] = useState<CashSessionDto | null | undefined>(undefined);
  const [report,  setReport]  = useState<CashSessionReportDto | null>(null);
  const [history, setHistory] = useState<CashSessionDto[]>([]);
  const [error,   setError]   = useState('');

  const [openModal, setOpenModal] = useState(false);
  const [moveModal, setMoveModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const cur = await cash.getCurrentSession();
      setCurrent(cur);
      const hist = await cash.getHistory(20);
      setHistory(hist);
      if (cur) {
        const r = await cash.getReport(cur.id);
        setReport(r);
      } else {
        setReport(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Ma caisse" />
      <div className="flex-1 p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        {current === undefined ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
          </div>
        ) : current === null ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <LockKeyhole size={22} className="text-gray-400" />
            </div>
            <h2 className="text-lg font-bold text-charcoal">Aucune caisse ouverte</h2>
            <p className="text-sm text-gray-500 mt-1">
              Ouvrez votre caisse pour rattacher automatiquement vos encaissements à une session tracée.
            </p>
            <button onClick={() => setOpenModal(true)}
              className="mt-4 inline-flex items-center gap-2 bg-green-dark text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green">
              <LockKeyholeOpen size={15} /> Ouvrir ma caisse
            </button>
          </div>
        ) : (
          <>
            {/* Session ouverte */}
            <div className="bg-white rounded-xl border border-green/30 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-green/15 flex items-center justify-center">
                    <LockKeyholeOpen size={19} className="text-green-dark" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Caisse ouverte</p>
                    <h2 className="text-lg font-bold text-charcoal">{current.registerName}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <Clock size={11} className="inline mr-1" />
                      Ouverte par <b>{current.openedByUserName}</b> le {fmtDateTime(current.openedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMoveModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-charcoal border border-gray-200 rounded-lg hover:bg-gray-50">
                    <PlusCircle size={13} /> Mouvement manuel
                  </button>
                  <button onClick={() => setCloseModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">
                    <LockKeyhole size={13} /> Clôturer
                  </button>
                </div>
              </div>

              {/* Récap */}
              {report && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-gray-100">
                  <Kpi label="Fond ouverture" value={fmt(current.openingFloat)} tint="text-charcoal" />
                  <Kpi label="Encaissé"       value={fmt(report.totalEncaisse)} tint="text-green-dark" icon={TrendingUp} />
                  <Kpi label="Entrées manu."  value={fmt(report.totalEntreeManuelle)} tint="text-blue-600" icon={PlusCircle} />
                  <Kpi label="Sorties"        value={fmt(report.totalDecaisse)} tint="text-red-600" icon={TrendingDown} />
                  <Kpi label="Théorique"      value={fmt(report.theoreticalTotal)} tint="text-charcoal" icon={Calculator} highlighted />
                </div>
              )}
            </div>
          </>
        )}

        {/* Historique */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-charcoal">Sessions récentes</h3>
              <p className="text-xs text-gray-400 mt-0.5">Les 20 dernières sessions, toutes caisses et caissiers confondus.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/60">
                  <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left font-medium">Caisse</th>
                    <th className="px-4 py-2.5 text-left font-medium">Ouverte par</th>
                    <th className="px-4 py-2.5 text-left font-medium">Ouverture</th>
                    <th className="px-4 py-2.5 text-left font-medium">Clôture</th>
                    <th className="px-4 py-2.5 text-right font-medium">Fond</th>
                    <th className="px-4 py-2.5 text-right font-medium">Compté</th>
                    <th className="px-4 py-2.5 text-left font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2 text-charcoal font-medium">{s.registerName}</td>
                      <td className="px-4 py-2 text-gray-600">{s.openedByUserName}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{fmtDateTime(s.openedAt)}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{s.closedAt ? fmtDateTime(s.closedAt) : '—'}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmt(s.openingFloat)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmt(s.closingCountedTotal)}</td>
                      <td className="px-4 py-2">
                        {s.status === 'Open' ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green/20 text-green-dark">Ouverte</span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Clôturée</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {openModal && <OpenSessionModal onClose={() => setOpenModal(false)} onDone={async () => { setOpenModal(false); await load(); }} />}
      {moveModal && current && (
        <ManualMovementModal sessionId={current.id}
          onClose={() => setMoveModal(false)}
          onDone={async () => { setMoveModal(false); await load(); }} />
      )}
      {closeModal && current && report && (
        <CloseSessionModal session={current} theoretical={report.theoreticalTotal}
          onClose={() => setCloseModal(false)}
          onDone={async () => { setCloseModal(false); await load(); }} />
      )}
    </div>
  );
}

function Kpi({ label, value, tint, icon: Icon, highlighted }: {
  label: string; value: string; tint: string; icon?: React.ComponentType<{ size?: number; className?: string }>; highlighted?: boolean;
}) {
  return (
    <div className={`rounded-lg p-3 ${highlighted ? 'bg-charcoal/5 border border-charcoal/15' : 'bg-gray-50/60 border border-gray-100'}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
        {Icon && <Icon size={11} className={tint} />} {label}
      </div>
      <p className={`text-lg font-bold mt-0.5 ${tint}`}>{value}</p>
    </div>
  );
}

function OpenSessionModal({ onClose, onDone }: { onClose: () => void; onDone: () => void | Promise<void> }) {
  const [registers, setRegisters] = useState<CashRegisterDto[]>([]);
  const [registerId, setRegisterId] = useState(0);
  const [openingFloat, setOpeningFloat] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    cash.getRegisters().then(r => {
      setRegisters(r);
      if (r.length > 0) setRegisterId(r[0].id);
    }).catch(() => setRegisters([]));
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onEsc); document.body.style.overflow = ''; };
  }, [onClose]);

  async function submit() {
    if (!registerId) { setError('Sélectionnez une caisse.'); return; }
    const float = Number(openingFloat);
    if (isNaN(float) || float < 0) { setError('Fond de caisse invalide.'); return; }
    setSaving(true); setError('');
    try {
      await cash.openSession({ registerId, openingFloat: float });
      await onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Ouvrir ma caisse" onClose={onClose}>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>}
      <Field label="Caisse *">
        <select value={registerId} onChange={e => setRegisterId(Number(e.target.value))} className={inputCls}>
          <option value={0}>— Sélectionner —</option>
          {registers.map(r => <option key={r.id} value={r.id}>{r.name}{r.location ? ` (${r.location})` : ''}</option>)}
        </select>
      </Field>
      <Field label="Fond de caisse à l'ouverture (FCFA)">
        <input type="number" min={0} step={500} value={openingFloat}
          onChange={e => setOpeningFloat(e.target.value)}
          placeholder="0" className={inputCls} />
        <p className="text-[11px] text-gray-400 mt-1">
          Montant en espèces déjà dans la caisse au moment de l'ouverture.
        </p>
      </Field>
      <ModalFooter onClose={onClose} onSubmit={submit} disabled={saving || !registerId}
        submitLabel={saving ? 'Ouverture…' : 'Ouvrir la caisse'} />
    </ModalShell>
  );
}

function ManualMovementModal({ sessionId, onClose, onDone }: { sessionId: number; onClose: () => void; onDone: () => void | Promise<void> }) {
  const [direction, setDirection] = useState<'in' | 'out'>('out');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onEsc); document.body.style.overflow = ''; };
  }, [onClose]);

  async function submit() {
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) { setError('Montant invalide.'); return; }
    if (!label.trim())          { setError('Libellé requis.'); return; }
    setSaving(true); setError('');
    try {
      await cash.addMovement(sessionId, { amount: amt, direction, label: label.trim() });
      await onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Mouvement manuel de caisse" onClose={onClose}>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setDirection('in')}
          className={`inline-flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold border transition-colors ${
            direction === 'in' ? 'bg-green/15 border-green text-green-dark' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
          }`}>
          <PlusCircle size={16} /> Entrée
        </button>
        <button type="button" onClick={() => setDirection('out')}
          className={`inline-flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold border transition-colors ${
            direction === 'out' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
          }`}>
          <MinusCircle size={16} /> Sortie
        </button>
      </div>
      <Field label="Montant (FCFA) *">
        <input type="number" min={0} step={500} value={amount}
          onChange={e => setAmount(e.target.value)} autoFocus className={inputCls} placeholder="10 000" />
      </Field>
      <Field label="Libellé *">
        <input value={label} onChange={e => setLabel(e.target.value)}
          placeholder={direction === 'in' ? 'Ex : apport de fonds' : 'Ex : achat lessive, avance perso'}
          className={inputCls} />
      </Field>
      <ModalFooter onClose={onClose} onSubmit={submit} disabled={saving}
        submitLabel={saving ? 'Enregistrement…' : 'Confirmer'} />
    </ModalShell>
  );
}

function CloseSessionModal({ session, theoretical, onClose, onDone }: {
  session: CashSessionDto; theoretical: number; onClose: () => void; onDone: () => void | Promise<void>;
}) {
  const [counted, setCounted] = useState('');
  const [notes, setNotes]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onEsc); document.body.style.overflow = ''; };
  }, [onClose]);

  const countedNum = Number(counted);
  const validCount = !isNaN(countedNum) && countedNum >= 0;
  const ecart      = validCount ? countedNum - theoretical : 0;

  async function submit() {
    if (!validCount) { setError('Comptage invalide.'); return; }
    setSaving(true); setError('');
    try {
      await cash.closeSession(session.id, { closingCountedTotal: countedNum, notes: notes.trim() || undefined });
      await onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title={`Clôturer la caisse ${session.registerName}`} onClose={onClose}>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>}
      <div className="bg-charcoal/5 border border-charcoal/10 rounded-lg p-3 flex items-center justify-between">
        <span className="text-xs font-bold text-charcoal uppercase tracking-wider">Théorique en caisse</span>
        <span className="text-lg font-bold text-charcoal tabular-nums">{fmt(theoretical)} F</span>
      </div>
      <Field label="Montant réel compté (FCFA) *">
        <input type="number" min={0} step={500} value={counted}
          onChange={e => setCounted(e.target.value)} autoFocus className={inputCls}
          placeholder={String(Math.round(theoretical))} />
      </Field>
      {validCount && ecart !== 0 && (
        <div className={`flex items-center justify-between rounded-lg p-3 text-xs font-semibold ${
          ecart > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
        }`}>
          <span>{ecart > 0 ? 'Excédent' : 'Manquant'}</span>
          <span className="tabular-nums">{ecart > 0 ? '+' : ''}{fmt(ecart)} F</span>
        </div>
      )}
      <Field label={ecart !== 0 ? 'Notes / justification' : 'Notes (optionnel)'}>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Ex : billet retrouvé sous le tiroir, écart de rendu de monnaie…"
          className={`${inputCls} resize-none`} />
      </Field>
      <ModalFooter onClose={onClose} onSubmit={submit} disabled={saving || !validCount}
        submitLabel={saving ? 'Clôture…' : 'Clôturer'} />
    </ModalShell>
  );
}

// ── Shared modal helpers ─────────────────────────────────────────────
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-bold text-charcoal">{title}</h2>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-charcoal flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ModalFooter({ onClose, onSubmit, disabled, submitLabel }: {
  onClose: () => void; onSubmit: () => void; disabled: boolean; submitLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2 -mx-5 -mb-5 px-5 py-3 border-t border-gray-100 bg-gray-50/50 mt-2">
      <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-charcoal">Annuler</button>
      <button type="button" onClick={onSubmit} disabled={disabled}
        className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-800 disabled:opacity-60">
        {submitLabel} <ArrowRight size={13} />
      </button>
    </div>
  );
}
