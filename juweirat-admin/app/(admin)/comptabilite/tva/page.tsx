'use client';

import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import { comptabilite } from '@/lib/api';
import type { TvaReportDto } from '@/lib/types';
import { Percent, Download, RotateCcw, Printer } from 'lucide-react';

function isoDate(d: Date) { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function fmt(n: number) { return Math.round(n).toLocaleString('fr-FR'); }

const SOURCE_LABEL: Record<string, string> = {
  Payment: 'Paiement', VenteDirecte: 'Vente directe', Facture: 'Facture', Manual: 'OD manuelle',
};

export default function TvaReportPage() {
  const today = new Date();
  // Preset : mois précédent, cible habituelle de la déclaration TVA.
  const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastOfLastMonth  = new Date(today.getFullYear(), today.getMonth(), 0);

  const [from, setFrom] = useState(isoDate(firstOfLastMonth));
  const [to,   setTo]   = useState(isoDate(lastOfLastMonth));
  const [report, setReport] = useState<TvaReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await comptabilite.getTvaReport({
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
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  function applyMonth(offset: number) {
    const t = new Date();
    const first = new Date(t.getFullYear(), t.getMonth() + offset, 1);
    const last  = new Date(t.getFullYear(), t.getMonth() + offset + 1, 0);
    setFrom(isoDate(first)); setTo(isoDate(last));
  }

  function exportCsv() {
    if (!report) return;
    const header = ['Date', 'Type', 'Référence', 'Libellé', 'HT', 'TVA 18%', 'TTC'];
    const rows = report.lines.map(l => [
      l.date,
      SOURCE_LABEL[l.sourceType] ?? l.sourceType,
      `${l.sourceType}#${l.sourceId}`,
      l.label, l.ht, l.tva, l.ttc,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `etat_tva_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="État TVA" />
      <div className="flex-1 p-6 space-y-4">
        {/* Filtres */}
        <div className="no-print bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Du</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Au</label>
              <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className={inputCls} />
            </div>
            <div className="flex items-center gap-1.5 pb-0.5">
              <button type="button" onClick={() => applyMonth(-1)}
                className="px-2.5 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-charcoal">
                Mois précédent
              </button>
              <button type="button" onClick={() => applyMonth(0)}
                className="px-2.5 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-charcoal">
                Mois courant
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={load} disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-charcoal border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                <RotateCcw size={13} className={loading ? 'animate-spin' : ''} /> Rafraîchir
              </button>
              <button onClick={exportCsv} disabled={!report || report.lines.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal text-white rounded-lg hover:bg-charcoal-800 disabled:opacity-40">
                <Download size={13} /> CSV
              </button>
              <button onClick={() => window.print()} disabled={!report}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-green-dark text-white rounded-lg hover:bg-green disabled:opacity-40">
                <Printer size={13} /> Imprimer
              </button>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" /></div>
        ) : !report ? null : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 print:shadow-none print:border-0 print:p-0">
            {/* En-tête */}
            <div className="border-b-2 border-charcoal pb-3 mb-4 flex items-baseline justify-between">
              <div>
                <h2 className="text-lg font-bold text-charcoal">État de TVA à déclarer</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Période : {new Date(from).toLocaleDateString('fr-FR')} — {new Date(to).toLocaleDateString('fr-FR')}
                  &nbsp;·&nbsp; Taux appliqué : {Math.round(report.tvaRate * 100)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Résidence Juweirat</p>
                <p className="text-[10px] text-gray-500">Lomé, Togo</p>
              </div>
            </div>

            {/* Totaux */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <SummaryCard label="Total HT" value={fmt(report.totalHt)} />
              <SummaryCard label={`TVA collectée (${Math.round(report.tvaRate * 100)}%)`} value={fmt(report.totalTva)} tint="text-amber-700" highlighted />
              <SummaryCard label="Total TTC" value={fmt(report.totalTtc)} />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">TVA à reverser à l'État</p>
              <p className="text-3xl font-bold text-amber-800 mt-1 tabular-nums">{fmt(report.totalTva)} F CFA</p>
            </div>

            {/* Détail */}
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Détail des opérations taxables</h3>
            {report.lines.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucune opération taxable sur cette période.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100">
                    <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-left font-medium">Libellé</th>
                      <th className="px-3 py-2 text-right font-medium">HT</th>
                      <th className="px-3 py-2 text-right font-medium">TVA</th>
                      <th className="px-3 py-2 text-right font-medium">TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {report.lines.map(l => (
                      <tr key={`${l.sourceType}-${l.sourceId}`}>
                        <td className="px-3 py-2 text-xs text-gray-500 tabular-nums">{new Date(l.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-3 py-2 text-xs">{SOURCE_LABEL[l.sourceType] ?? l.sourceType}</td>
                        <td className="px-3 py-2 text-charcoal">{l.label}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(l.ht)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-amber-700">{fmt(l.tva)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(l.ttc)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-charcoal bg-gray-50/60">
                    <tr className="text-xs font-bold">
                      <td colSpan={3} className="px-3 py-2 uppercase tracking-wider">Totaux</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(report.totalHt)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-700">{fmt(report.totalTva)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(report.totalTtc)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <p className="mt-6 text-[10px] text-gray-400 border-t border-gray-100 pt-3">
              Document généré automatiquement à partir du journal comptable Juweirat. Les opérations exonérées de TVA (cochées sur la réservation) sont exclues.
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .no-print, .no-print * { display: none !important; }
          main, main *, .print-visible, .print-visible * { visibility: visible !important; }
          @page { margin: 12mm; }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({ label, value, tint, highlighted }: { label: string; value: string; tint?: string; highlighted?: boolean }) {
  return (
    <div className={`rounded-lg p-4 ${highlighted ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50/60 border border-gray-100'}`}>
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${tint ?? 'text-charcoal'}`}>{value}</p>
    </div>
  );
}
