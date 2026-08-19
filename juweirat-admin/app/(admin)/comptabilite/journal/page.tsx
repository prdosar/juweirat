'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import { comptabilite } from '@/lib/api';
import type { JournalReportDto } from '@/lib/types';
import { Calendar, Download, RotateCcw, TrendingUp, TrendingDown, Wallet, Receipt } from 'lucide-react';

const PAYMENT_METHODS = [
  { value: '',              label: 'Tous les modes'    },
  { value: 'Cash',          label: 'Espèces'            },
  { value: 'MobileMoney',   label: 'Mobile Money'       },
  { value: 'BankTransfer',  label: 'Virement'            },
  { value: 'CreditCard',    label: 'Carte bancaire'      },
  { value: 'Fedapay',       label: 'Fedapay'             },
  { value: 'Stripe',        label: 'Stripe'              },
];

const SOURCE_LABEL: Record<string, string> = {
  Payment:      'Paiement',
  VenteDirecte: 'Vente directe',
  Facture:      'Facture',
  Manual:       'Manuel',
};

const SOURCE_STYLE: Record<string, string> = {
  Payment:      'bg-blue-100 text-blue-700',
  VenteDirecte: 'bg-purple-100 text-purple-700',
  Facture:      'bg-emerald-100 text-emerald-700',
  Manual:       'bg-gray-100 text-gray-700',
};

function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('fr-FR');
}

function csvEscape(v: string | number | null): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function JournalPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [from, setFrom]     = useState(isoDate(firstOfMonth));
  const [to,   setTo]       = useState(isoDate(today));
  const [method, setMethod] = useState('');

  const [report,  setReport]  = useState<JournalReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await comptabilite.getJournal({
        from: `${from}T00:00:00Z`,
        to:   `${to}T23:59:59Z`,
        paymentMethod: method || undefined,
      });
      setReport(r);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg === 'Failed to fetch' ? "Impossible de joindre l'API." : msg);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, method]);

  useEffect(() => { load(); }, [load]);

  function applyPreset(kind: 'today' | 'yesterday' | 'week' | 'month' | 'ytd') {
    const t = new Date();
    if (kind === 'today') {
      setFrom(isoDate(t)); setTo(isoDate(t));
    } else if (kind === 'yesterday') {
      const y = new Date(t); y.setDate(y.getDate() - 1);
      setFrom(isoDate(y)); setTo(isoDate(y));
    } else if (kind === 'week') {
      const w = new Date(t); w.setDate(w.getDate() - 7);
      setFrom(isoDate(w)); setTo(isoDate(t));
    } else if (kind === 'month') {
      setFrom(isoDate(new Date(t.getFullYear(), t.getMonth(), 1))); setTo(isoDate(t));
    } else {
      setFrom(isoDate(new Date(t.getFullYear(), 0, 1))); setTo(isoDate(t));
    }
  }

  // Regroupement par jour pour afficher un sous-total quotidien.
  const grouped = useMemo(() => {
    if (!report) return [];
    const map = new Map<string, typeof report.entries>();
    for (const e of report.entries) {
      const d = e.date.slice(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(e);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([day, entries]) => ({
        day,
        entries,
        ht:        entries.reduce((s, e) => s + e.ht, 0),
        tva:       entries.reduce((s, e) => s + e.tva, 0),
        ttc:       entries.reduce((s, e) => s + e.ttc, 0),
        encaisse:  entries.reduce((s, e) => s + e.encaisse, 0),
        decaisse:  entries.reduce((s, e) => s + e.decaisse, 0),
      }));
  }, [report]);

  function exportCsv() {
    if (!report) return;
    const header = ['Date', 'Type', 'Référence', 'Libellé', 'Mode', 'HT', 'TVA', 'TTC', 'Encaissé', 'Décaissé'];
    const rows = report.entries.map(e => [
      e.date,
      SOURCE_LABEL[e.sourceType] ?? e.sourceType,
      `${e.sourceType}#${e.sourceId}`,
      e.label,
      e.paymentMethod ?? '',
      e.ht, e.tva, e.ttc, e.encaisse, e.decaisse,
    ]);
    const csv = [header, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `journal_caisse_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Journal de caisse" />
      <div className="flex-1 p-6 space-y-4">

        {/* Filtres */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Du</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Au</label>
              <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mode de paiement</label>
              <select value={method} onChange={e => setMethod(e.target.value)} className={inputCls}>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5 pb-0.5 flex-wrap">
              {([
                ['today',     'Aujourd\'hui'],
                ['yesterday', 'Hier'],
                ['week',      '7 derniers jours'],
                ['month',     'Ce mois'],
                ['ytd',       'Année en cours'],
              ] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => applyPreset(k)}
                  className="px-2.5 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-charcoal">
                  {label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={load} disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-charcoal border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                <RotateCcw size={13} className={loading ? 'animate-spin' : ''} /> Rafraîchir
              </button>
              <button type="button" onClick={exportCsv} disabled={!report || report.entries.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal text-white rounded-lg hover:bg-charcoal-800 disabled:opacity-40">
                <Download size={13} /> Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* KPI */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <KpiCard label="Total HT"       value={fmt(report.totalHt)}       icon={Receipt}      tint="text-charcoal" />
            <KpiCard label="TVA collectée"  value={fmt(report.totalTva)}      icon={Receipt}      tint="text-amber-600" />
            <KpiCard label="Total TTC"      value={fmt(report.totalTtc)}      icon={Receipt}      tint="text-charcoal" />
            <KpiCard label="Encaissé"       value={fmt(report.totalEncaisse)} icon={TrendingUp}   tint="text-green-dark" />
            <KpiCard label="Décaissé"       value={fmt(report.totalDecaisse)} icon={TrendingDown} tint="text-red-600" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        {/* Tableau groupé par jour */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
          </div>
        ) : !report || report.entries.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <Wallet size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aucune écriture sur cette période.</p>
            <p className="text-xs text-gray-300 mt-1">Les paiements, ventes directes et factures apparaîtront ici automatiquement.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/60">
                  <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left font-medium">Date</th>
                    <th className="px-4 py-2.5 text-left font-medium">Type</th>
                    <th className="px-4 py-2.5 text-left font-medium">Libellé</th>
                    <th className="px-4 py-2.5 text-left font-medium">Mode</th>
                    <th className="px-4 py-2.5 text-right font-medium">HT</th>
                    <th className="px-4 py-2.5 text-right font-medium">TVA</th>
                    <th className="px-4 py-2.5 text-right font-medium">TTC</th>
                    <th className="px-4 py-2.5 text-right font-medium text-green-dark">Encaissé</th>
                    <th className="px-4 py-2.5 text-right font-medium text-red-600">Décaissé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {grouped.map(day => (
                    <Fragment key={day.day}>
                      <tr className="bg-charcoal/5">
                        <td colSpan={4} className="px-4 py-2 text-xs font-bold text-charcoal">
                          <Calendar size={11} className="inline mr-1.5 opacity-60" />
                          {new Date(day.day).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-bold">{fmt(day.ht)}</td>
                        <td className="px-4 py-2 text-right text-xs font-bold text-amber-700">{fmt(day.tva)}</td>
                        <td className="px-4 py-2 text-right text-xs font-bold">{fmt(day.ttc)}</td>
                        <td className="px-4 py-2 text-right text-xs font-bold text-green-dark">{fmt(day.encaisse)}</td>
                        <td className="px-4 py-2 text-right text-xs font-bold text-red-600">{fmt(day.decaisse)}</td>
                      </tr>
                      {day.entries.map(e => (
                        <tr key={`${day.day}-${e.sourceType}-${e.sourceId}`} className="hover:bg-gray-50/60">
                          <td className="px-4 py-2 text-xs text-gray-500">
                            {new Date(e.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${SOURCE_STYLE[e.sourceType] ?? 'bg-gray-100 text-gray-700'}`}>
                              {SOURCE_LABEL[e.sourceType] ?? e.sourceType}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-charcoal">{e.label}</td>
                          <td className="px-4 py-2 text-xs text-gray-500">{e.paymentMethod ?? '—'}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmt(e.ht)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-amber-700">{fmt(e.tva)}</td>
                          <td className="px-4 py-2 text-right tabular-nums font-semibold">{fmt(e.ttc)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-green-dark font-medium">{e.encaisse > 0 ? fmt(e.encaisse) : '—'}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-red-600 font-medium">{e.decaisse > 0 ? fmt(e.decaisse) : '—'}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-charcoal bg-charcoal/5">
                  <tr className="text-xs font-bold text-charcoal">
                    <td colSpan={4} className="px-4 py-3">Total période</td>
                    <td className="px-4 py-3 text-right">{fmt(report.totalHt)}</td>
                    <td className="px-4 py-3 text-right text-amber-700">{fmt(report.totalTva)}</td>
                    <td className="px-4 py-3 text-right">{fmt(report.totalTtc)}</td>
                    <td className="px-4 py-3 text-right text-green-dark">{fmt(report.totalEncaisse)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{fmt(report.totalDecaisse)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-400 mt-2">
          Montants en FCFA. Les écritures sont générées automatiquement à chaque paiement,
          vente directe ou facture émise. Les données antérieures au déploiement du module
          comptable ne sont pas rétroactivement journalisées.
        </p>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, tint }: {
  label: string; value: string; icon: React.ComponentType<{ size?: number; className?: string }>; tint: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
        <Icon size={12} className={tint} /> {label}
      </div>
      <p className={`text-xl font-bold mt-1.5 ${tint}`}>{value}</p>
    </div>
  );
}
