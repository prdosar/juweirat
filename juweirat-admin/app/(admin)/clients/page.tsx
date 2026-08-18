'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import PaginationControl from '@/components/PaginationControl';
import { clients } from '@/lib/api';
import type { ClientDto, PagedResult } from '@/lib/types';
import { Plus, Search, Phone, Mail, Filter, ArrowUpDown, Globe, FileText, UserCheck, X } from 'lucide-react';

export default function ClientsPage() {
  const [paged, setPaged]             = useState<PagedResult<ClientDto>>({
    items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false,
  });
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(10);
  const [docType, setDocType]         = useState('');
  const [hasResa, setHasResa]         = useState<string>('all');
  const [sortOption, setSortOption]   = useState('created_desc');
  const [loading, setLoading]         = useState(true);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      let sortBy = 'CreatedAt';
      let isDescending = true;
      if (sortOption === 'created_asc') { sortBy = 'CreatedAt'; isDescending = false; }
      else if (sortOption === 'name_asc') { sortBy = 'LastName'; isDescending = false; }
      else if (sortOption === 'name_desc') { sortBy = 'LastName'; isDescending = true; }

      const res = await clients.getPaged({
        pageNumber: page,
        pageSize,
        search: search.trim() || undefined,
        documentType: docType || undefined,
        hasReservations: hasResa === 'with' ? true : hasResa === 'without' ? false : undefined,
        sortBy,
        isDescending,
      });
      setPaged(res);
    } catch (err) {
      console.error('Erreur chargement clients:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, docType, hasResa, sortOption]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch('');
    setDocType('');
    setHasResa('all');
    setSortOption('created_desc');
    setPage(1);
  };

  const hasActiveFilters = search || docType || hasResa !== 'all' || sortOption !== 'created_desc';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Clients" />
      <div className="flex-1 p-6 space-y-4">

        {/* Toolbar & Business Filters */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Rechercher par nom, email, tél, pièce, ville..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-green/30 focus:border-green/40 bg-gray-50/50"
              />
            </div>

            {/* Create Client Button */}
            <Link
              href="/clients/new"
              className="flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-800 transition-colors shadow-xs ml-auto"
            >
              <Plus size={15} /> Nouveau client
            </Link>
          </div>

          {/* Business Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
            {/* Document Type */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <FileText size={13} className="text-gray-400" />
              <span className="text-gray-500 font-medium">Pièce :</span>
              <select
                value={docType}
                onChange={e => { setDocType(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-charcoal font-semibold text-xs focus:ring-0 cursor-pointer outline-hidden"
              >
                <option value="">Toutes les pièces</option>
                <option value="passport">Passeport</option>
                <option value="idCard">Carte d'Identité (CNI)</option>
                <option value="residencePermit">Titre de séjour</option>
              </select>
            </div>

            {/* Activity (Reservations) */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <UserCheck size={13} className="text-gray-400" />
              <span className="text-gray-500 font-medium">Historique :</span>
              <select
                value={hasResa}
                onChange={e => { setHasResa(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-charcoal font-semibold text-xs focus:ring-0 cursor-pointer outline-hidden"
              >
                <option value="all">Tous les clients</option>
                <option value="with">Avec réservations</option>
                <option value="without">Sans réservation</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <ArrowUpDown size={13} className="text-gray-400" />
              <span className="text-gray-500 font-medium">Tri :</span>
              <select
                value={sortOption}
                onChange={e => { setSortOption(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-charcoal font-semibold text-xs focus:ring-0 cursor-pointer outline-hidden"
              >
                <option value="created_desc">Plus récents d'abord</option>
                <option value="created_asc">Plus anciens d'abord</option>
                <option value="name_asc">Nom (A → Z)</option>
                <option value="name_desc">Nom (Z → A)</option>
              </select>
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded transition-colors"
              >
                <X size={13} /> Réinitialiser filtres
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-gray-100">
            <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
              {paged.items.map(client => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-green/40 transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-charcoal text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
                      {client.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-charcoal truncate group-hover:text-green-dark transition-colors">
                        {client.fullName}
                      </p>
                      {client.nationality && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Globe size={11} /> {client.nationality}
                        </p>
                      )}
                      <div className="mt-2 space-y-1">
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
                            <Mail size={11} className="text-gray-400 shrink-0" /> {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone size={11} className="text-gray-400 shrink-0" /> {client.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                      <span className="text-base font-bold text-charcoal">{client.totalReservations}</span>
                      <p className="text-[9px] text-gray-400 font-medium">résas</p>
                    </div>
                  </div>

                  {client.documentType && (
                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                      <span className="capitalize">{client.documentType === 'passport' ? 'Passeport' : client.documentType === 'idCard' ? 'CNI' : client.documentType}</span>
                      {client.documentNumber && <span className="font-mono text-gray-600">{client.documentNumber}</span>}
                    </div>
                  )}
                </Link>
              ))}

              {paged.items.length === 0 && (
                <div className="col-span-full py-16 text-center text-gray-400 text-sm">
                  Aucun client ne correspond aux critères de recherche.
                </div>
              )}
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
          </div>
        )}
      </div>
    </div>
  );
}
