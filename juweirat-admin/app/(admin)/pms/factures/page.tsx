'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { pmsFactures } from '@/lib/pms';
import type { FactureDto } from '@/lib/pmsTypes';
import { Search, FileText, Printer, XCircle } from 'lucide-react';

export default function FacturesPage() {
  const [list, setList]       = useState<FactureDto[]>([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState<number | null>(null);
  const [error, setError]     = useState('');

  async function load() {
    setLoading(true);
    pmsFactures.getAll(search ? { search } : undefined).then(setList).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  async function doPrint(id: number) {
    setBusy(id); setError('');
    try { const f = await pmsFactures.print(id); setList(l => l.map(x => x.id === id ? f : x)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(null); }
  }

  async function doAnnuler(id: number) {
    if (!confirm('Annuler cette facture ? Le folio sera libéré pour ré-émission.')) return;
    setBusy(id); setError('');
    try { const f = await pmsFactures.annuler(id); setList(l => l.map(x => x.id === id ? f : x)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(null); }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Factures" />
      <div className="flex-1 p-6 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par client, société, numéro…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green/30 bg-white"
            />
          </div>
          <button type="submit" className="bg-charcoal text-white text-sm px-5 py-2 rounded-lg hover:opacity-90">Chercher</button>
        </form>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5 text-left font-medium">Numéro</th>
                    <th className="px-5 py-3.5 text-left font-medium">Folio</th>
                    <th className="px-5 py-3.5 text-left font-medium">Client</th>
                    <th className="px-5 py-3.5 text-left font-medium">Date</th>
                    <th className="px-5 py-3.5 text-left font-medium">Statut</th>
                    <th className="px-5 py-3.5 text-right font-medium">Total</th>
                    <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {list.map(f => (
                    <tr key={f.id} className="hover:bg-gray-50/70">
                      <td className="px-5 py-3.5 font-mono text-xs text-green-dark font-bold flex items-center gap-2">
                        <FileText size={13} className="text-gray-400" /> {f.number}
                        {f.corrections > 0 && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">R{f.corrections}</span>}
                        {f.printCount > 0  && <span className="text-[10px] text-gray-400">×{f.printCount}</span>}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{f.folioNumber}</td>
                      <td className="px-5 py-3.5 text-charcoal font-medium">{f.snapshot?.client ?? '—'}</td>
                      <td className="px-5 py-3.5 text-gray-500">{f.date}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                          f.status === 'Emise' ? 'bg-green/15 text-green-dark' : 'bg-red-100 text-red-600'
                        }`}>{f.status === 'Emise' ? 'Émise' : 'Annulée'}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-charcoal">
                        {(f.snapshot?.total ?? 0).toLocaleString('fr')} FCFA
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {f.status === 'Emise' && (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => doPrint(f.id)} disabled={busy === f.id}
                              className="flex items-center gap-1 text-xs text-gray-600 hover:text-charcoal border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                              <Printer size={12} /> Impr.
                            </button>
                            <button onClick={() => doAnnuler(f.id)} disabled={busy === f.id}
                              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50">
                              <XCircle size={12} /> Annuler
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">Aucune facture</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
