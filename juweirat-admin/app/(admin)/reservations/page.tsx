'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PaginationControl from '@/components/PaginationControl';
import { reservations } from '@/lib/api';
import type { ReservationDto, PagedResult } from '@/lib/types';
import { Plus, Search, Filter, Calendar, ArrowUpDown, DollarSign, X } from 'lucide-react';

const STATUSES = ['', 'Pending', 'Confirmed', 'CheckedIn', 'CheckedOut', 'Cancelled', 'NoShow'];

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  Pending:    { label: 'En attente', cls: 'bg-amber-100 text-amber-800 border border-amber-200' },
  Confirmed:  { label: 'Confirmée',  cls: 'bg-green/20 text-green-dark border border-green/30' },
  CheckedIn:  { label: 'En séjour',  cls: 'bg-emerald-500 text-white shadow-xs' },
  CheckedOut: { label: 'Terminé',    cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  Cancelled:  { label: 'Annulée',    cls: 'bg-red-100 text-red-700 border border-red-200' },
  NoShow:     { label: 'No Show',    cls: 'bg-charcoal/15 text-charcoal/60' },
};

function fmt(n: number, currency = 'XOF') {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)} ${currency}`;
}

export default function ReservationsPage() {
  const router = useRouter();
  const [paged, setPaged]             = useState<PagedResult<ReservationDto>>({
    items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false,
  });
  const [search, setSearch]           = useState('');
  const [status, setStatus]           = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [sortOption, setSortOption]   = useState('created_desc');
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(10);
  const [loading, setLoading]         = useState(true);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      let sortBy = 'CreatedAt';
      let isDescending = true;
      if (sortOption === 'checkin_desc') { sortBy = 'CheckInDate'; isDescending = true; }
      else if (sortOption === 'checkin_asc') { sortBy = 'CheckInDate'; isDescending = false; }
      else if (sortOption === 'total_desc') { sortBy = 'TotalPrice'; isDescending = true; }
      else if (sortOption === 'created_asc') { sortBy = 'CreatedAt'; isDescending = false; }

      const res = await reservations.getPaged({
        pageNumber: page,
        pageSize,
        search: search.trim() || undefined,
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        isDescending,
      });
      setPaged(res);
    } catch (err) {
      console.error('Erreur chargement réservations:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status, paymentStatus, startDate, endDate, sortOption]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setPaymentStatus('');
    setStartDate('');
    setEndDate('');
    setSortOption('created_desc');
    setPage(1);
  };

  const hasActiveFilters = search || status || paymentStatus || startDate || endDate || sortOption !== 'created_desc';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Réservations" />
      <div className="flex-1 p-6 space-y-4">

        {/* Filters Card */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Réf (ex: RES-2026-...), client, tél, apt..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-green/30 focus:border-green/40 bg-gray-50/50"
              />
            </div>

            {/* Create Reservation button */}
            <Link
              href="/reservations/new"
              className="flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-800 transition-colors shadow-xs ml-auto"
            >
              <Plus size={15} /> Nouvelle réservation
            </Link>
          </div>

          {/* Business Filters Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <Filter size={13} className="text-gray-400" />
              <span className="text-gray-500 font-medium">Statut :</span>
              <select
                value={status}
                onChange={e => { setStatus(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-charcoal font-semibold text-xs focus:ring-0 cursor-pointer outline-hidden"
              >
                <option value="">Tous les statuts</option>
                {STATUSES.slice(1).map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>
                ))}
              </select>
            </div>

            {/* Payment Status Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <DollarSign size={13} className="text-gray-400" />
              <span className="text-gray-500 font-medium">Paiement :</span>
              <select
                value={paymentStatus}
                onChange={e => { setPaymentStatus(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-charcoal font-semibold text-xs focus:ring-0 cursor-pointer outline-hidden"
              >
                <option value="">Tous</option>
                <option value="paid">Soldé (100%)</option>
                <option value="partial">Acompte versé</option>
                <option value="unpaid">Non payé</option>
              </select>
            </div>

            {/* Date Arrivée >= */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <Calendar size={13} className="text-gray-400" />
              <span className="text-gray-500 font-medium">Arrivée dès :</span>
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-charcoal font-semibold text-xs focus:ring-0 cursor-pointer outline-hidden"
              />
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
                <option value="created_desc">Création (récentes d'abord)</option>
                <option value="checkin_desc">Date d'arrivée (proches/futures)</option>
                <option value="checkin_asc">Date d'arrivée (anciennes)</option>
                <option value="total_desc">Montant le plus élevé</option>
              </select>
            </div>

            {/* Reset button */}
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

        {/* Table & Pagination */}
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
                      <th className="px-5 py-3.5 text-left font-medium">Référence</th>
                      <th className="px-5 py-3.5 text-left font-medium">Client</th>
                      <th className="px-5 py-3.5 text-left font-medium">Logement</th>
                      <th className="px-5 py-3.5 text-left font-medium">Arrivée</th>
                      <th className="px-5 py-3.5 text-left font-medium">Départ</th>
                      <th className="px-5 py-3.5 text-left font-medium">Statut</th>
                      <th className="px-5 py-3.5 text-right font-medium">Montant Total</th>
                      <th className="px-5 py-3.5 text-right font-medium">Solde Dû</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paged.items.map(r => {
                      const s = STATUS_CONFIG[r.status] ?? { label: r.status, cls: 'bg-gray-100 text-gray-600' };
                      const remaining = r.amountDue ?? (r.totalPrice - r.amountPaid);
                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                          onClick={() => router.push(`/reservations/${r.id}`)}
                        >
                          <td className="px-5 py-3.5 font-mono text-xs text-green-dark font-bold">{r.reference}</td>
                          <td className="px-5 py-3.5 font-medium text-charcoal">{r.clientFullName}</td>
                          <td className="px-5 py-3.5 text-gray-500">
                            <span className="font-medium text-charcoal">{r.categoryNameFr}</span>
                            {r.roomNumber && <span className="text-xs text-gray-400 ml-1">· Apt {r.roomNumber}</span>}
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{r.checkInDate}</td>
                          <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{r.checkOutDate}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-charcoal">
                            {fmt(r.totalPrice, r.currency)}
                          </td>
                          <td className={`px-5 py-3.5 text-right font-semibold ${remaining > 0 ? 'text-amber-600' : 'text-green-dark'}`}>
                            {remaining > 0 ? fmt(remaining, r.currency) : 'Soldé ✓'}
                          </td>
                        </tr>
                      );
                    })}

                    {paged.items.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-gray-400 text-sm">
                          Aucune réservation ne correspond aux critères.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Server-side Pagination */}
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
