'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PaginationControl from '@/components/PaginationControl';
import { pmsFolios } from '@/lib/pms';
import type { FolioDto } from '@/lib/pmsTypes';
import type { PagedResult } from '@/lib/types';
import { Search, Plus, Filter, Calendar, ArrowUpDown, DollarSign, X } from 'lucide-react';

const STATUS_CLS: Record<string, string> = {
  Confirmee: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  Option:    'bg-amber-100 text-amber-800 border border-amber-200',
  Garantie:  'bg-blue-100 text-blue-800 border border-blue-200',
  NoShow:    'bg-charcoal/15 text-charcoal/60',
  Annulee:   'bg-red-100 text-red-700 border border-red-200',
};

const STATUS_FR: Record<string, string> = {
  Confirmee: 'Confirmée',
  Option:    'Option',
  Garantie:  'Garantie',
  NoShow:    'No Show',
  Annulee:   'Annulée',
};

function fmt(n: number) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)} FCFA`;
}

export default function FoliosPage() {
  const router = useRouter();
  const [paged, setPaged]             = useState<PagedResult<FolioDto>>({
    items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false,
  });
  const [search, setSearch]           = useState('');
  const [closed, setClosed]           = useState<'' | 'false' | 'true'>('false');
  const [resaStatus, setResaStatus]   = useState('');
  const [balanceStatus, setBalanceStatus] = useState('');
  const [arrivalFrom, setArrivalFrom] = useState('');
  const [sortOption, setSortOption]   = useState('created_desc');
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(10);
  const [loading, setLoading]         = useState(true);

  const fetchFolios = useCallback(async () => {
    setLoading(true);
    try {
      let sortBy = 'CreatedAt';
      let isDescending = true;
      if (sortOption === 'created_asc') { sortBy = 'CreatedAt'; isDescending = false; }
      else if (sortOption === 'arrival_desc') { sortBy = 'Arrival'; isDescending = true; }
      else if (sortOption === 'arrival_asc') { sortBy = 'Arrival'; isDescending = false; }
      else if (sortOption === 'number_desc') { sortBy = 'Number'; isDescending = true; }

      const res = await pmsFolios.getPaged({
        pageNumber: page,
        pageSize,
        search: search.trim() || undefined,
        closed: closed !== '' ? closed === 'true' : undefined,
        resaStatus: resaStatus || undefined,
        balanceStatus: balanceStatus || undefined,
        arrivalFrom: arrivalFrom || undefined,
        sortBy,
        isDescending,
      });
      setPaged(res);
    } catch (err) {
      console.error('Erreur chargement folios:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, closed, resaStatus, balanceStatus, arrivalFrom, sortOption]);

  useEffect(() => {
    fetchFolios();
  }, [fetchFolios]);

  const resetFilters = () => {
    setSearch('');
    setClosed('false');
    setResaStatus('');
    setBalanceStatus('');
    setArrivalFrom('');
    setSortOption('created_desc');
    setPage(1);
  };

  const hasActiveFilters = search || closed !== 'false' || resaStatus || balanceStatus || arrivalFrom || sortOption !== 'created_desc';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Folios & Facturation PMS" />
      <div className="flex-1 p-6 space-y-4">

        {/* Toolbar & Business Filters */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="N° Folio, client, société, appartement…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-green/30 focus:border-green/40 bg-gray-50/50"
              />
            </div>

            {/* Create Folio Button */}
            <Link
              href="/pms/folios/new"
              className="flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-800 transition-colors shadow-xs ml-auto"
            >
              <Plus size={15} /> Nouveau folio
            </Link>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
            {/* Clôture / État */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <Filter size={13} className="text-gray-400" />
              <span className="text-gray-500 font-medium">État :</span>
              <select
                value={closed}
                onChange={e => { setClosed(e.target.value as '' | 'false' | 'true'); setPage(1); }}
                className="bg-transparent border-none text-charcoal font-semibold text-xs focus:ring-0 cursor-pointer outline-hidden"
              >
                <option value="false">Séjours en cours</option>
                <option value="true">Séjours clôturés</option>
                <option value="">Tous les folios</option>
              </select>
            </div>

            {/* Statut PMS */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <span className="text-gray-500 font-medium">Statut résa :</span>
              <select
                value={resaStatus}
                onChange={e => { setResaStatus(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-charcoal font-semibold text-xs focus:ring-0 cursor-pointer outline-hidden"
              >
                <option value="">Tous</option>
                <option value="Confirmee">Confirmée</option>
                <option value="Option">Option</option>
                <option value="Garantie">Garantie</option>
                <option value="NoShow">No Show</option>
                <option value="Annulee">Annulée</option>
              </select>
            </div>

            {/* Solde Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <DollarSign size={13} className="text-gray-400" />
              <span className="text-gray-500 font-medium">Solde :</span>
              <select
                value={balanceStatus}
                onChange={e => { setBalanceStatus(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-charcoal font-semibold text-xs focus:ring-0 cursor-pointer outline-hidden"
              >
                <option value="">Tous</option>
                <option value="with_balance">Solde débiteur restant (&gt; 0)</option>
                <option value="settled">Soldé (0 FCFA)</option>
              </select>
            </div>

            {/* Date Arrivée */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <Calendar size={13} className="text-gray-400" />
              <span className="text-gray-500 font-medium">Arrivée dès :</span>
              <input
                type="date"
                value={arrivalFrom}
                onChange={e => { setArrivalFrom(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-charcoal font-semibold text-xs focus:ring-0 cursor-pointer outline-hidden"
              />
            </div>

            {/* Tri */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <ArrowUpDown size={13} className="text-gray-400" />
              <span className="text-gray-500 font-medium">Tri :</span>
              <select
                value={sortOption}
                onChange={e => { setSortOption(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-charcoal font-semibold text-xs focus:ring-0 cursor-pointer outline-hidden"
              >
                <option value="created_desc">Plus récents d'abord</option>
                <option value="arrival_desc">Date d'arrivée (proches/futures)</option>
                <option value="arrival_asc">Date d'arrivée (anciennes)</option>
                <option value="number_desc">N° Folio (décroissant)</option>
              </select>
            </div>

            {/* Reset */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded transition-colors"
              >
                <X size={13} /> Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50/50">
                    <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                      <th className="px-5 py-3.5 text-left font-medium">N° Folio</th>
                      <th className="px-5 py-3.5 text-left font-medium">Client / Occupant</th>
                      <th className="px-5 py-3.5 text-left font-medium">Appartement</th>
                      <th className="px-5 py-3.5 text-left font-medium">Arrivée</th>
                      <th className="px-5 py-3.5 text-left font-medium">Départ</th>
                      <th className="px-5 py-3.5 text-left font-medium">Statut</th>
                      <th className="px-5 py-3.5 text-right font-medium">Total Facturé</th>
                      <th className="px-5 py-3.5 text-right font-medium">Solde Restant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paged.items.map(f => {
                      const guestName = f.guest || [f.prenom, f.nom].filter(Boolean).join(' ') || '—';
                      return (
                        <tr
                          key={f.id}
                          className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                          onClick={() => router.push(`/pms/folios/${f.id}`)}
                        >
                          <td className="px-5 py-3.5 font-mono text-xs font-bold text-charcoal">
                            {f.number}
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-charcoal">{guestName}</p>
                            {f.societe && <p className="text-xs text-gray-400">{f.societe}</p>}
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 font-medium">{f.unitLabel}</td>
                          <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{f.arrival}</td>
                          <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{f.departure}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_CLS[f.resaStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_FR[f.resaStatus] ?? f.resaStatus}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-charcoal">
                            {fmt(f.totalGeneral)}
                          </td>
                          <td className={`px-5 py-3.5 text-right font-bold ${f.solde > 0 ? 'text-amber-600' : 'text-green-dark'}`}>
                            {f.solde > 0 ? fmt(f.solde) : 'Soldé ✓'}
                          </td>
                        </tr>
                      );
                    })}

                    {paged.items.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-gray-400 text-sm">
                          Aucun folio ne correspond à ces critères.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Server-side Pagination Control */}
              <PaginationControl
                pageNumber={paged.pageNumber}
                pageSize={paged.pageSize}
                totalCount={paged.totalCount}
                totalPages={paged.totalPages}
                onPageChange={newPage => setPage(newPage)}
                onPageSizeChange={newSize => { setPageSize(newSize); setPage(1); }}
                isLoading={loading}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
