'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { pmsFolios } from '@/lib/pms';
import type { FolioDto } from '@/lib/pmsTypes';
import { Search, Plus } from 'lucide-react';

const STATUS_CLS: Record<string, string> = {
  Confirmee: 'bg-green/15 text-green-dark',
  Option:    'bg-amber-100 text-amber-700',
  Garantie:  'bg-blue-100 text-blue-700',
  NoShow:    'bg-charcoal/10 text-charcoal/50',
  Annulee:   'bg-red-100 text-red-600',
};
const STATUS_FR: Record<string, string> = {
  Confirmee: 'Confirmée', Option: 'Option', Garantie: 'Garantie',
  NoShow: 'No Show', Annulee: 'Annulée',
};

export default function FoliosPage() {
  const [all, setAll]         = useState<FolioDto[]>([]);
  const [search, setSearch]   = useState('');
  const [closed, setClosed]   = useState<'' | 'false' | 'true'>('false');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    pmsFolios.getAll(closed !== '' ? { closed: closed === 'true' } : undefined)
      .then(setAll)
      .finally(() => setLoading(false));
  }, [closed]);

  const q = search.toLowerCase();
  const list = all.filter(f =>
    !q ||
    f.guest?.toLowerCase().includes(q) ||
    f.nom?.toLowerCase().includes(q) ||
    f.prenom?.toLowerCase().includes(q) ||
    f.societe?.toLowerCase().includes(q) ||
    f.number.toLowerCase().includes(q) ||
    f.unitLabel.toLowerCase().includes(q)
  );

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Folios" />
      <div className="flex-1 p-6 space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un client, folio, appartement…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green/30 bg-white"
            />
          </div>
          <select
            value={closed}
            onChange={e => setClosed(e.target.value as '' | 'false' | 'true')}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green/30 bg-white"
          >
            <option value="false">Séjours en cours</option>
            <option value="true">Séjours clôturés</option>
            <option value="">Tous</option>
          </select>
          <Link
            href="/pms/folios/new"
            className="flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity ml-auto"
          >
            <Plus size={15} /> Nouveau folio
          </Link>
        </div>

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
                    <th className="px-5 py-3.5 text-left font-medium">N° Folio</th>
                    <th className="px-5 py-3.5 text-left font-medium">Client</th>
                    <th className="px-5 py-3.5 text-left font-medium">Appt</th>
                    <th className="px-5 py-3.5 text-left font-medium">Arrivée</th>
                    <th className="px-5 py-3.5 text-left font-medium">Départ</th>
                    <th className="px-5 py-3.5 text-left font-medium">Statut</th>
                    <th className="px-5 py-3.5 text-right font-medium">Total</th>
                    <th className="px-5 py-3.5 text-right font-medium">Solde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {list.map(f => (
                    <tr
                      key={f.id}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/pms/folios/${f.id}`}
                    >
                      <td className="px-5 py-3.5 font-mono text-xs text-green-dark font-bold">{f.number}</td>
                      <td className="px-5 py-3.5 font-medium text-charcoal">
                        {f.guest ?? `${f.prenom ?? ''} ${f.nom ?? ''}`.trim() || '—'}
                        {f.societe && <span className="block text-xs text-gray-400">{f.societe}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{f.unitLabel}</td>
                      <td className="px-5 py-3.5 text-gray-500">{f.arrival}</td>
                      <td className="px-5 py-3.5 text-gray-500">{f.departure}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_CLS[f.resaStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_FR[f.resaStatus] ?? f.resaStatus}
                        </span>
                        {f.checkedIn && !f.closed && (
                          <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green text-charcoal">En chambre</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-charcoal">
                        {f.totalGeneral.toLocaleString('fr')}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={f.solde > 0 ? 'text-red-600 font-semibold' : 'text-green-dark font-semibold'}>
                          {f.solde > 0 ? `${f.solde.toLocaleString('fr')}` : '✓ Soldé'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-gray-400 text-sm">
                        Aucun folio trouvé
                      </td>
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
