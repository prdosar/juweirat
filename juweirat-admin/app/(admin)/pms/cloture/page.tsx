'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { pmsCloture, pmsConfig } from '@/lib/pms';
import type { CloturePreviewDto, ClotureDto, HotelConfigDto } from '@/lib/pmsTypes';
import { CheckCircle, XCircle, AlertTriangle, Lock } from 'lucide-react';

export default function CloturePage() {
  const [config, setConfig]   = useState<HotelConfigDto | null>(null);
  const [preview, setPreview] = useState<CloturePreviewDto | null>(null);
  const [history, setHistory] = useState<ClotureDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState<ClotureDto | null>(null);

  const load = useCallback(async () => {
    const [cfg, pv, hist] = await Promise.all([
      pmsConfig.get(), pmsCloture.preview(), pmsCloture.history(30),
    ]);
    setConfig(cfg); setPreview(pv); setHistory(hist); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function execute() {
    if (!confirm(`Clôturer la journée du ${config?.dateHotel} ? Cette opération est irréversible.`)) return;
    setBusy(true); setError('');
    try {
      const result = await pmsCloture.execute();
      setDone(result);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Clôture journalière" />
      <div className="flex-1 p-6 space-y-5 max-w-3xl">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {done && (
              <div className="bg-green/10 border border-green/25 rounded-xl p-5 flex items-start gap-3">
                <CheckCircle size={20} className="text-green-dark shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-charcoal">Clôture effectuée</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {done.nbLignes} ligne(s) générée(s) · CA: {done.caTotal.toLocaleString('fr')} FCFA · Occupation: {done.occupation}%
                  </p>
                  <p className="text-sm text-gray-500">Nouvelle date hôtel : {config?.dateHotel}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
            )}

            {/* Preview */}
            {preview && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-charcoal">Clôture du {config?.dateHotel}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {preview.estimatedActiveCount} folio(s) actif(s) · {preview.canClose ? 'Prêt à clôturer' : 'Actions en attente'}
                    </p>
                  </div>
                  {preview.canClose
                    ? <CheckCircle size={20} className="text-green-dark" />
                    : <AlertTriangle size={20} className="text-amber-500" />}
                </div>

                {preview.pendingArrivals.length > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                    <p className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                      <XCircle size={14} /> {preview.pendingArrivals.length} arrivée(s) non traitée(s)
                    </p>
                    {preview.pendingArrivals.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm py-1">
                        <span className="text-gray-700">{p.guest ?? '—'} · <span className="font-mono text-xs">{p.number}</span></span>
                        <Link href={`/pms/folios/${p.id}`} className="text-amber-700 hover:underline text-xs">Check-in →</Link>
                      </div>
                    ))}
                  </div>
                )}

                {preview.pendingDepartures.length > 0 && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <p className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                      <XCircle size={14} /> {preview.pendingDepartures.length} départ(s) non traité(s)
                    </p>
                    {preview.pendingDepartures.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm py-1">
                        <span className="text-gray-700">{p.guest ?? '—'} · <span className="font-mono text-xs">{p.number}</span></span>
                        <Link href={`/pms/folios/${p.id}`} className="text-blue-700 hover:underline text-xs">Check-out / prolonger →</Link>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={execute}
                  disabled={busy || !preview.canClose}
                  className="flex items-center gap-2 bg-charcoal text-white font-semibold text-sm px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  <Lock size={15} />
                  {busy ? 'Clôture en cours…' : `Clôturer la journée du ${config?.dateHotel}`}
                </button>
              </div>
            )}

            {/* History */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3.5 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-charcoal">Historique des clôtures</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-50">
                    <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                      <th className="px-5 py-3 text-left font-medium">Date hôtel</th>
                      <th className="px-5 py-3 text-right font-medium">Occ.</th>
                      <th className="px-5 py-3 text-right font-medium">CA total</th>
                      <th className="px-5 py-3 text-right font-medium">PM</th>
                      <th className="px-5 py-3 text-right font-medium">RevPAR</th>
                      <th className="px-5 py-3 text-right font-medium">Arrivées</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {history.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs font-semibold text-charcoal">{c.dateHotel}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{c.occ}/{c.dispo} ({c.occupation}%)</td>
                        <td className="px-5 py-3 text-right font-semibold text-charcoal">{c.caTotal.toLocaleString('fr')}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{c.pm.toLocaleString('fr')}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{c.revPar.toLocaleString('fr')}</td>
                        <td className="px-5 py-3 text-right text-gray-500">{c.nbArrivals}</td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-gray-400">Aucune clôture effectuée</td>
                      </tr>
                    )}
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
