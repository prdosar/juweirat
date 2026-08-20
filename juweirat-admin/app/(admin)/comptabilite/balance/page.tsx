'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import { comptabilite } from '@/lib/api';
import type { BalanceReportDto } from '@/lib/types';
import { Scale, Download, RotateCcw } from 'lucide-react';

const KIND_LABELS: Record<string, string> = {
  Client:              'Comptes clients',
  Company:             'Comptes compagnies',
  CashRegister:        'Caisses',
  Prestation:          'Prestations',
  TvaCollected:        'TVA collectée',
  RevenueHebergement:  'Revenus hébergement',
  RevenueNoShow:       'Revenus No Show',
  RevenueCancellation: 'Revenus annulation',
  Expense:             'Sorties / Dépenses',
};

function isoDate(d: Date) { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function fmt(n: number) { return Math.round(n).toLocaleString('fr-FR'); }

export default function BalancePage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [from, setFrom]     = useState(isoDate(firstOfMonth));
  const [to,   setTo]       = useState(isoDate(today));
  const [kind, setKind]     = useState('');
  const [report, setReport] = useState<BalanceReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await comptabilite.getBalance({
        from: `${from}T00:00:00Z`,
        to:   `${to}T23:59:59Z`,
        kind: kind || undefined,
      });
      setReport(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, kind]);
  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    if (!report) return;
    const header = ['Nature', 'Compte', 'Solde ouverture', 'Débit', 'Crédit', 'Solde clôture'];
    const rows = report.lines.map(l => [
      KIND_LABELS[l.kind] ?? l.kind,
      l.name, l.openingBalance, l.totalDebit, l.totalCredit, l.closingBalance,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `balance_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Groupement par nature de compte pour l'affichage.
  const groups = report?.lines.reduce<Record<string, typeof report.lines>>((acc, l) => {
    (acc[l.kind] ??= []).push(l);
    return acc;
  }, {}) ?? {};

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Balance" />
      <div className="flex-1 p-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Du</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={`w-full ${inputCls}`} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Au</label>
              <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className={`w-full ${inputCls}`} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nature</label>
              <select value={kind} onChange={e => setKind(e.target.value)} className={`w-full ${inputCls}`}>
                <option value="">— Toutes les natures —</option>
                {Object.keys(KIND_LABELS).map(k => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={load} disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-charcoal border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                <RotateCcw size={13} className={loading ? 'animate-spin' : ''} /> Rafraîchir
              </button>
              <button onClick={exportCsv} disabled={!report || report.lines.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal text-white rounded-lg hover:bg-charcoal-800 disabled:opacity-40 ml-auto">
                <Download size={13} /> CSV
              </button>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" /></div>
        ) : !report || report.lines.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <Scale size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aucune activité sur cette période.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/60">
                  <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left font-medium">Compte</th>
                    <th className="px-4 py-2.5 text-right font-medium">Solde ouverture</th>
                    <th className="px-4 py-2.5 text-right font-medium text-red-600">Débit période</th>
                    <th className="px-4 py-2.5 text-right font-medium text-green-dark">Crédit période</th>
                    <th className="px-4 py-2.5 text-right font-medium">Solde clôture</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(groups).map(([k, lines]) => {
                    const d = lines.reduce((s, l) => s + l.totalDebit, 0);
                    const c = lines.reduce((s, l) => s + l.totalCredit, 0);
                    const open = lines.reduce((s, l) => s + l.openingBalance, 0);
                    const close = lines.reduce((s, l) => s + l.closingBalance, 0);
                    return (
                      <Fragment key={k}>
                        <tr className="bg-charcoal/5">
                          <td className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-charcoal">
                            {KIND_LABELS[k] ?? k} <span className="text-gray-400">({lines.length})</span>
                          </td>
                          <td className="px-4 py-2 text-right text-xs font-bold tabular-nums">{fmt(open)}</td>
                          <td className="px-4 py-2 text-right text-xs font-bold tabular-nums text-red-600">{fmt(d)}</td>
                          <td className="px-4 py-2 text-right text-xs font-bold tabular-nums text-green-dark">{fmt(c)}</td>
                          <td className="px-4 py-2 text-right text-xs font-bold tabular-nums">{fmt(close)}</td>
                        </tr>
                        {lines.map(l => (
                          <tr key={l.accountId} className="hover:bg-gray-50/60">
                            <td className="px-4 py-2 pl-8 text-charcoal">{l.name}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-gray-500">{fmt(l.openingBalance)}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-red-600">{fmt(l.totalDebit)}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-green-dark">{fmt(l.totalCredit)}</td>
                            <td className="px-4 py-2 text-right tabular-nums font-semibold">{fmt(l.closingBalance)}</td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-charcoal bg-charcoal/5">
                  <tr className="text-xs font-bold">
                    <td className="px-4 py-3 uppercase tracking-wider">Totaux période</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-600">{fmt(report.totalDebit)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-dark">{fmt(report.totalCredit)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {report.totalDebit === report.totalCredit
                        ? <span className="text-green-dark">Équilibrée ✓</span>
                        : <span className="text-amber-700">Écart {fmt(Math.abs(report.totalDebit - report.totalCredit))}</span>}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
