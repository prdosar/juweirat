'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { accounts as accountsApi, comptabilite } from '@/lib/api';
import { getUser } from '@/lib/auth';
import type { AccountDto } from '@/lib/types';
import { Plus, Trash2, Scale, CheckCircle2, XCircle } from 'lucide-react';

interface OdLine {
  accountId: number;
  direction: 'debit' | 'credit';
  amount: string;
  label: string;
}

function fmt(n: number) { return Math.round(n).toLocaleString('fr-FR'); }

export default function OdPage() {
  const router = useRouter();
  const [access, setAccess] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [accountList, setAccountList] = useState<AccountDto[]>([]);
  const [date, setDate]   = useState(() => new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState('');
  const [lines, setLines] = useState<OdLine[]>([
    { accountId: 0, direction: 'debit',  amount: '', label: '' },
    { accountId: 0, direction: 'credit', amount: '', label: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error,   setError]   = useState('');

  useEffect(() => {
    const u = getUser();
    if (!u || (u.role !== 'admin' && u.role !== 'comptable')) {
      setAccess('denied'); return;
    }
    setAccess('granted');
    accountsApi.getAll({ pageSize: 200 })
      .then(res => setAccountList(res.items))
      .catch(() => setAccountList([]));
  }, []);

  const totals = useMemo(() => {
    let d = 0, c = 0;
    for (const l of lines) {
      const amt = Number(l.amount) || 0;
      if (l.direction === 'debit')  d += amt;
      else                          c += amt;
    }
    return { debit: d, credit: c, balanced: d === c && d > 0 };
  }, [lines]);

  function updateLine(idx: number, patch: Partial<OdLine>) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }
  function removeLine(idx: number) {
    setLines(prev => prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx));
  }
  function addLine(direction: 'debit' | 'credit') {
    setLines(prev => [...prev, { accountId: 0, direction, amount: '', label: '' }]);
  }

  async function submit() {
    if (!label.trim()) { setError('Libellé général requis.'); return; }
    if (!totals.balanced) { setError('L\'écriture doit être équilibrée débit = crédit.'); return; }
    const invalid = lines.find(l => !l.accountId || Number(l.amount) <= 0);
    if (invalid) { setError('Chaque ligne doit avoir un compte et un montant strictement positif.'); return; }

    setSaving(true); setError(''); setMessage('');
    try {
      const res = await comptabilite.postOd({
        date:  `${date}T12:00:00Z`,
        label: label.trim(),
        lines: lines.map(l => ({
          accountId: l.accountId,
          direction: l.direction,
          amount:    Number(l.amount),
          label:     l.label.trim() || undefined,
        })),
      });
      setMessage(`OD enregistrée — ${res.lignes} mouvement${res.lignes > 1 ? 's' : ''} créé${res.lignes > 1 ? 's' : ''}.`);
      // Reset formulaire
      setLabel('');
      setLines([
        { accountId: 0, direction: 'debit',  amount: '', label: '' },
        { accountId: 0, direction: 'credit', amount: '', label: '' },
      ]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (access === 'checking') {
    return (
      <div className="flex flex-col min-h-full">
        <Header title="Opérations diverses" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (access === 'denied') {
    return (
      <div className="flex flex-col min-h-full">
        <Header title="Opérations diverses" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <XCircle size={22} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-charcoal">Accès refusé</h2>
            <p className="text-sm text-gray-500">La saisie d'OD manuelles est réservée aux rôles admin et comptable.</p>
            <button onClick={() => router.push('/dashboard')}
              className="mt-2 px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-800">
              Retour au tableau de bord
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';
  const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Opérations diverses" />
      <div className="flex-1 p-6 space-y-4 max-w-5xl">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-charcoal">Saisir une écriture manuelle</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Chaque ligne est un débit ou un crédit sur un compte. Le total débit doit égaler le total crédit.
            </p>
          </div>

          {message && (
            <div className="bg-green/10 border border-green/30 text-green-dark text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle2 size={16} /> {message}
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Libellé de l'écriture *</label>
              <input value={label} onChange={e => setLabel(e.target.value)}
                placeholder="Ex : régularisation d'écart de caisse janvier"
                className={inputCls} />
            </div>
          </div>

          {/* Lignes */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_140px_140px_1fr_40px] gap-2 bg-gray-50/60 px-3 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <div>Compte</div>
              <div>Sens</div>
              <div className="text-right text-red-600">Débit</div>
              <div className="text-right text-green-dark">Crédit</div>
              <div>Libellé ligne (optionnel)</div>
              <div></div>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_140px_140px_1fr_40px] gap-2 items-center px-3 py-2 border-t border-gray-100">
                <select value={l.accountId} onChange={e => updateLine(i, { accountId: Number(e.target.value) })}
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green/30">
                  <option value={0}>— Compte —</option>
                  {accountList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select value={l.direction} onChange={e => updateLine(i, { direction: e.target.value as 'debit' | 'credit' })}
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green/30">
                  <option value="debit">Débit</option>
                  <option value="credit">Crédit</option>
                </select>
                <input type="number" step={100} min={0}
                  value={l.direction === 'debit' ? l.amount : ''}
                  onChange={e => updateLine(i, { amount: e.target.value })}
                  disabled={l.direction !== 'debit'}
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm bg-white text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-red-200 disabled:bg-gray-50 disabled:text-gray-300" />
                <input type="number" step={100} min={0}
                  value={l.direction === 'credit' ? l.amount : ''}
                  onChange={e => updateLine(i, { amount: e.target.value })}
                  disabled={l.direction !== 'credit'}
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm bg-white text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-green/30 disabled:bg-gray-50 disabled:text-gray-300" />
                <input value={l.label} onChange={e => updateLine(i, { label: e.target.value })}
                  placeholder="détail" className="border border-gray-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green/30" />
                <button type="button" onClick={() => removeLine(i)} disabled={lines.length <= 2}
                  className="text-gray-400 hover:text-red-600 disabled:opacity-30 flex items-center justify-center">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100">
              <button type="button" onClick={() => addLine('debit')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 bg-red-50 rounded hover:bg-red-100">
                <Plus size={11} /> Ligne débit
              </button>
              <button type="button" onClick={() => addLine('credit')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-dark border border-green/30 bg-green/10 rounded hover:bg-green/20">
                <Plus size={11} /> Ligne crédit
              </button>
            </div>
          </div>

          {/* Totaux + équilibre */}
          <div className={`rounded-lg p-4 flex items-center justify-between ${
            totals.balanced ? 'bg-green/10 border border-green/30' :
            totals.debit === 0 && totals.credit === 0 ? 'bg-gray-50 border border-gray-100' :
            'bg-amber-50 border border-amber-200'
          }`}>
            <div className="flex items-center gap-3">
              <Scale size={18} className={totals.balanced ? 'text-green-dark' : 'text-amber-600'} />
              <div className="text-sm">
                {totals.balanced ? (
                  <span className="font-bold text-green-dark">Écriture équilibrée ✓</span>
                ) : totals.debit === 0 && totals.credit === 0 ? (
                  <span className="text-gray-500">Renseignez au moins un débit et un crédit</span>
                ) : (
                  <span className="font-bold text-amber-700">
                    Écart : {fmt(Math.abs(totals.debit - totals.credit))} F
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-right">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Débit</div>
                <div className="font-bold text-red-600 tabular-nums">{fmt(totals.debit)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Crédit</div>
                <div className="font-bold text-green-dark tabular-nums">{fmt(totals.credit)}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={submit} disabled={saving || !totals.balanced}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-800 disabled:opacity-40">
              {saving ? 'Enregistrement…' : 'Enregistrer l\'écriture'}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-gray-400">
          Les écritures OD sont taggées <span className="font-mono">SourceType=Manual, Reason=Correction</span>.
          Elles apparaissent dans le grand livre et la balance, mais pas dans le journal de caisse ni l'état TVA
          (le journal filtre les événements métier ; la TVA se dérive des ventes réelles).
        </p>
      </div>
    </div>
  );
}
