'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PaginationControl from '@/components/PaginationControl';
import ClientModal from '@/components/ClientModal';
import { clients } from '@/lib/api';
import type { ClientDto, PagedResult } from '@/lib/types';
import {
  Plus, Search, Building2, PencilLine, Eye, BedDouble, Sparkles,
} from 'lucide-react';

const PAGE_SIZE_DEFAULT = 10;

const ACTIVITY_FILTERS: Array<{ value: 'all' | 'with' | 'without'; label: string }> = [
  { value: 'all',     label: 'Tous les clients' },
  { value: 'with',    label: 'Avec réservations' },
  { value: 'without', label: 'Sans réservation' },
];

export default function ClientsPage() {
  const router = useRouter();

  const [paged, setPaged]         = useState<PagedResult<ClientDto> | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize]     = useState(PAGE_SIZE_DEFAULT);
  const [search, setSearch]         = useState('');
  const [activity, setActivity]     = useState<'all' | 'with' | 'without'>('all');

  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState('');
  const [modalTarget, setModalTarget] = useState<ClientDto | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await clients.getPaged({
        pageNumber, pageSize,
        search: search.trim() || undefined,
        sortBy: 'LastName',
        isDescending: false,
        hasReservations: activity === 'with' ? true : activity === 'without' ? false : undefined,
      });
      setPaged(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg === 'Failed to fetch' ? "Impossible de joindre l'API. Vérifiez que le backend est démarré." : msg);
      setPaged(null);
    } finally {
      setLoading(false);
    }
  }, [pageNumber, pageSize, search, activity]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => { setPageNumber(1); }, [search, activity, pageSize]);

  const items = paged?.items ?? [];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Clients" />
      <div className="flex-1 p-6 space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nom, email, téléphone, pièce, ville…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40 bg-white"
            />
          </div>
          <select
            value={activity}
            onChange={e => setActivity(e.target.value as typeof activity)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40"
          >
            {ACTIVITY_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <button
            onClick={() => setModalTarget('new')}
            className="flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-800 transition-colors ml-auto"
          >
            <Plus size={15} /> Nouveau client
          </button>
        </div>

        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {loadError}
          </div>
        )}

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
                    <th className="px-5 py-3.5 text-left font-medium">Client</th>
                    <th className="px-5 py-3.5 text-left font-medium">Téléphone</th>
                    <th className="px-5 py-3.5 text-left font-medium">Email</th>
                    <th className="px-5 py-3.5 text-left font-medium">Ville / Pays</th>
                    <th className="px-5 py-3.5 text-left font-medium">Pièce</th>
                    <th className="px-5 py-3.5 text-right font-medium">Résas</th>
                    <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-charcoal text-white flex items-center justify-center shrink-0 shadow-sm">
                            <span className="text-[11px] font-bold">
                              {c.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-charcoal truncate">{c.fullName}</div>
                            {c.companyName && (
                              <div className="text-xs text-blue-600 font-medium truncate flex items-center gap-1 mt-0.5">
                                <Building2 size={10} />
                                {c.companyName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{c.phone || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-gray-500 max-w-[220px] truncate">{c.email || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-gray-500">
                        {c.city || c.country ? (
                          <span>
                            {c.city}{c.city && c.country ? ' · ' : ''}{c.country}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">
                        {c.documentType || c.documentNumber ? (
                          <div>
                            <div className="text-xs text-gray-500">{c.documentType || '—'}</div>
                            {c.documentNumber && <div className="text-xs font-mono text-charcoal">{c.documentNumber}</div>}
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-charcoal">
                        {c.totalReservations}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setModalTarget(c)}
                            title="Modifier"
                            className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <PencilLine size={15} />
                          </button>
                          <button
                            onClick={() => router.push(`/clients/${c.id}`)}
                            title="Détails"
                            className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => router.push(`/reservations/new?clientId=${c.id}`)}
                            title="Ajouter une réservation"
                            className="p-1.5 text-gray-400 hover:text-green-dark hover:bg-green/10 rounded-lg transition-colors"
                          >
                            <BedDouble size={15} />
                          </button>
                          <button
                            onClick={() => router.push(`/ventes-directes?clientId=${c.id}`)}
                            title="Ajouter une prestation"
                            className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Sparkles size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                        Aucun client trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && paged && (
            <PaginationControl
              pageNumber={paged.pageNumber}
              pageSize={paged.pageSize}
              totalCount={paged.totalCount}
              totalPages={paged.totalPages}
              onPageChange={setPageNumber}
              onPageSizeChange={size => { setPageSize(size); setPageNumber(1); }}
              isLoading={loading}
            />
          )}
        </div>
      </div>

      {modalTarget && (
        <ClientModal
          initial={modalTarget === 'new' ? null : modalTarget}
          onClose={() => setModalTarget(null)}
          onSaved={async () => { setModalTarget(null); await load(); }}
        />
      )}
    </div>
  );
}
