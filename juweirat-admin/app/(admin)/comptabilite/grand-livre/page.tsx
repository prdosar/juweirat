'use client';

import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import { accounts as accountsApi, comptabilite } from '@/lib/api';
import type { AccountDto, LedgerReportDto } from '@/lib/types';
import { BookText, Download, RotateCcw } from 'lucide-react';

const KIND_LABELS: Record<string, string> = {
  Client:              'Compte client',
  Company:             'Compte compagnie',
  CashRegister:        'Caisse',
  Prestation:          'Prestation',
  TvaCollected:        'TVA collectée',
  RevenueHebergement:  'Revenus hébergement',
  RevenueNoShow:       'Revenus No Show',
  RevenueCancellation: 'Revenus annulation',
  Expense:             'Sorties / Dépenses',
};

function isoDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function fmt(n: number | null | undefined) { return n == null ? '—' : Math.round(n).toLocaleString('fr-FR'); }

export default function GrandLivrePage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [accountList, setAccountList] = useState<AccountDto[]>([]);
  const [kindFilter, setKindFilter]   = useState('');
  const [accountId, setAccountId]     = useState(0);
  const [from, setFrom]               = useState(isoDate(firstOfMonth));
  const [to,   setTo]                 = useState(isoDate(today));

  const [report,  setReport]  = useState<LedgerReportDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Charge la liste des comptes selon le filtre kind.
  useEffect(() => {
    accountsApi.getAll({ kind: kindFilter || undefined, pageSize: 200 })
      .then(res => setAccountList(res.items))
      .catch(() => setAccountList([]));
    setAccountId(0);
    setReport(null);
  }, [kindFilter]);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true); setError('');
    try {
      const r = await comptabilite.getLedger(accountId, {
        from: `${from}T00:00:00Z`,
        to:   `${to}T23:59:59Z`,
      });
      setReport(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [accountId, from, to]);

  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    if (!report) return;
    const header = ['Date', 'Sens', 'Contrepartie', 'Motif', 'Libellé', 'Débit', 'Crédit', 'Solde'];
    const rows = report.lines.map(l => [
      l.date,
      l.direction === 'debit' ? 'Débit' : 'Crédit',
      l.counterpartAccountName,
      l.reason,
      l.label ?? '',
      l.direction === 'debit'  ? l.amount : '',
      l.direction === 'credit' ? l.amount : '',
      l.balance,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `grand_livre_${report.account.name.replace(/[^\w]/g, '_')}_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Grand livre" />
      <div className="flex-1 p-6 space-y-4">
        {/* Filtres */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nature de compte</label>
              <select value={kindFilter} onChange={e => setKindFilter(e.target.value)} className={`w-full ${inputCls}`}>
                <option value="">— Tous —</option>
                {Object.keys(KIND_LABELS).map(k => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Compte</label>
              <select value={accountId} onChange={e => setAccountId(Number(e.target.value))} className={`w-full ${inputCls}`}>
                <option value={0}>— Sélectionner —</option>
                {accountList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Du</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={`w-full ${inputCls}`} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Au</label>
              <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className={`w-full ${inputCls}`} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={load} disabled={loading || !accountId}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-charcoal border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              <RotateCcw size={13} className={loading ? 'animate-spin' : ''} /> Rafraîchir
            </button>
            <button onClick={exportCsv} disabled={!report || report.lines.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal text-white rounded-lg hover:bg-charcoal-800 disabled:opacity-40">
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

        {!report ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <BookText size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Sélectionnez un compte pour afficher son grand livre.</p>
          </div>
        ) : (
          <>
            {/* Récap */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card label="Solde d'ouverture" value={fmt(report.openingBalance)} />
              <Card label="Total débit" value={fmt(report.totalDebit)} tint="text-red-600" />
              <Card label="Total crédit" value={fmt(report.totalCredit)} tint="text-green-dark" />
              <Card label="Solde de clôture" value={fmt(report.closingBalance)} highlighted />
            </div>

            {/* Tableau */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50/60">
                    <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                      <th className="px-4 py-2.5 text-left font-medium">Date</th>
                      <th className="px-4 py-2.5 text-left font-medium">Contrepartie</th>
                      <th className="px-4 py-2.5 text-left font-medium">Motif</th>
                      <th className="px-4 py-2.5 text-left font-medium">Libellé</th>
                      <th className="px-4 py-2.5 text-right font-medium text-red-600">Débit</th>
                      <th className="px-4 py-2.5 text-right font-medium text-green-dark">Crédit</th>
                      <th className="px-4 py-2.5 text-right font-medium">Solde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr className="bg-charcoal/5">
                      <td colSpan={6} className="px-4 py-2 text-xs font-semibold text-charcoal">Solde d'ouverture</td>
                      <td className="px-4 py-2 text-right text-xs font-bold tabular-nums">{fmt(report.openingBalance)}</td>
                    </tr>
                    {report.lines.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                          Aucun mouvement sur cette période.
                        </td>
                      </tr>
                    ) : report.lines.map(l => (
                      <tr key={l.movementId} className="hover:bg-gray-50/60">
                        <td className="px-4 py-2 text-xs text-gray-500 tabular-nums">
                          {new Date(l.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-2 text-charcoal">{l.counterpartAccountName}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">{l.reason}</td>
                        <td className="px-4 py-2 text-xs text-gray-600">{l.label ?? '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-red-600">{l.direction === 'debit'  ? fmt(l.amount) : ''}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-green-dark">{l.direction === 'credit' ? fmt(l.amount) : ''}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold">{fmt(l.balance)}</td>
                      </tr>
                    ))}
                    <tr className="bg-charcoal/5 border-t-2 border-charcoal">
                      <td colSpan={4} className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Total période / Solde clôture</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-red-600">{fmt(report.totalDebit)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-green-dark">{fmt(report.totalCredit)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold">{fmt(report.closingBalance)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, tint, highlighted }: { label: string; value: string; tint?: string; highlighted?: boolean }) {
  return (
    <div className={`rounded-xl p-4 shadow-sm border ${highlighted ? 'bg-charcoal text-white border-charcoal' : 'bg-white border-gray-100'}`}>
      <p className={`text-[11px] font-bold uppercase tracking-wider ${highlighted ? 'text-white/60' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-xl font-bold mt-1 tabular-nums ${highlighted ? 'text-white' : (tint ?? 'text-charcoal')}`}>{value}</p>
    </div>
  );
}
