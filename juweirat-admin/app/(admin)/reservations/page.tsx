'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PaginationControl from '@/components/PaginationControl';
import { reservations } from '@/lib/api';
import type { ReservationDto, PagedResult } from '@/lib/types';
import {
  Plus, Search, Filter, Calendar, ArrowUpDown, DollarSign, X,
  Eye, PencilLine, Ban, UserX, AlertTriangle,
} from 'lucide-react';

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

function todayIso() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Compute the cancellation-penalty tier client-side to preview it before confirmation.
 * Must stay in sync with backend ReservationService.ComputeCancellationPenalty.
 */
function previewCancellationPenalty(nights: number, checkInDate: string): { penaltyNights: number; deadlineLabel: string; deadlinePassed: boolean } {
  const now = new Date();
  const [y, m, d] = checkInDate.split('-').map(Number);
  const checkInAt00 = new Date(Date.UTC(y, (m || 1) - 1, d || 1));

  if (nights < 15) {
    const deadline = new Date(checkInAt00.getTime());
    deadline.setUTCDate(deadline.getUTCDate() - 1);
    deadline.setUTCHours(18, 0, 0, 0);
    return { penaltyNights: 1, deadlineLabel: "avant 18h la veille de l'arrivée", deadlinePassed: now > deadline };
  }
  if (nights < 30) {
    const deadline = new Date(checkInAt00.getTime());
    deadline.setUTCDate(deadline.getUTCDate() - 4);
    return { penaltyNights: 2, deadlineLabel: "au plus tard 4 jours avant l'arrivée", deadlinePassed: now > deadline };
  }
  const deadline = new Date(checkInAt00.getTime());
  deadline.setUTCDate(deadline.getUTCDate() - 7);
  return { penaltyNights: 4, deadlineLabel: "au plus tard 1 semaine avant l'arrivée", deadlinePassed: now > deadline };
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

  // Confirmation modals
  const [cancelTarget,  setCancelTarget]  = useState<ReservationDto | null>(null);
  const [noShowTarget,  setNoShowTarget]  = useState<ReservationDto | null>(null);
  const [editTarget,    setEditTarget]    = useState<ReservationDto | null>(null);
  const today = todayIso();

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
                      <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paged.items.map(r => {
                      const s = STATUS_CONFIG[r.status] ?? { label: r.status, cls: 'bg-gray-100 text-gray-600' };
                      const isEditable   = r.status === 'Pending' || r.status === 'Confirmed' || r.status === 'CheckedIn';
                      const isCancelable = r.status === 'Pending' || r.status === 'Confirmed';
                      const showNoShow   = (r.status === 'Pending' || r.status === 'Confirmed') && r.checkInDate === today;
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
                          <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {isEditable && (
                                <button
                                  onClick={() => setEditTarget(r)}
                                  title="Éditer"
                                  className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <PencilLine size={15} />
                                </button>
                              )}
                              <button
                                onClick={() => router.push(`/reservations/${r.id}`)}
                                title="Détails"
                                className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <Eye size={15} />
                              </button>
                              {isCancelable && (
                                <button
                                  onClick={() => setCancelTarget(r)}
                                  title="Annuler la réservation"
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Ban size={15} />
                                </button>
                              )}
                              {showNoShow && (
                                <button
                                  onClick={() => setNoShowTarget(r)}
                                  title="Marquer No Show"
                                  className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                >
                                  <UserX size={15} />
                                </button>
                              )}
                            </div>
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
                    {/* colspan=8: Réf, Client, Logement, Arrivée, Départ, Statut, Total, Actions */}
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

      {cancelTarget && (
        <CancelConfirmModal
          reservation={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onDone={async () => { setCancelTarget(null); await fetchReservations(); }}
        />
      )}
      {noShowTarget && (
        <NoShowConfirmModal
          reservation={noShowTarget}
          onClose={() => setNoShowTarget(null)}
          onDone={async () => { setNoShowTarget(null); await fetchReservations(); }}
        />
      )}
      {editTarget && (
        <EditReservationModal
          reservation={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={async () => { setEditTarget(null); await fetchReservations(); }}
        />
      )}
    </div>
  );
}

/* ──────────────────── Confirmation modals ──────────────────── */
function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onEsc); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

function CancelConfirmModal({ reservation, onClose, onDone }: { reservation: ReservationDto; onClose: () => void; onDone: () => void | Promise<void> }) {
  const preview = previewCancellationPenalty(reservation.nights, reservation.checkInDate);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [result, setResult] = useState<{ penaltyNights: number; penaltyAmount: number; currency: string; deadlineLabel: string } | null>(null);

  async function submit() {
    setSaving(true); setError('');
    try {
      const res = await reservations.processCancellation(reservation.id, reason || undefined);
      setResult({
        penaltyNights: res.penaltyNights,
        penaltyAmount: res.penaltyAmount,
        currency:      res.currency,
        deadlineLabel: res.deadlineLabel,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg === 'Failed to fetch' ? "Impossible de joindre l'API." : msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
              <Ban size={16} className="text-red-600" />
            </div>
            <h2 className="text-sm font-bold text-charcoal">Annuler la réservation</h2>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-charcoal transition-colors flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="text-charcoal">
            Réservation <span className="font-mono font-bold text-green-dark">{reservation.reference}</span> — {reservation.clientFullName}
          </p>
          <p className="text-gray-500">Séjour de <b>{reservation.nights} nuit{reservation.nights > 1 ? 's' : ''}</b> à partir du <b>{reservation.checkInDate}</b>.</p>

          {!result ? (
            <>
              <div className={`rounded-lg border p-3 ${preview.deadlinePassed ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-green/10 border-green/30 text-green-dark'}`}>
                {preview.deadlinePassed ? (
                  <div className="flex gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Retenue applicable</p>
                      <p className="text-xs mt-1">
                        Délai gratuit dépassé ({preview.deadlineLabel}). Retenue de <b>{preview.penaltyNights} nuit{preview.penaltyNights > 1 ? 's' : ''}</b> = <b>{fmt(preview.penaltyNights * reservation.pricePerNightSnapshot, reservation.currency)}</b>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs">
                    <b>Annulation gratuite</b> — délai encore respecté ({preview.deadlineLabel}).
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Raison (optionnel)</label>
                <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Client indisponible, changement de plan…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300 resize-none" />
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
            </>
          ) : (
            <div className="rounded-lg border border-green/30 bg-green/10 text-green-dark p-3">
              <p className="font-semibold">Réservation annulée.</p>
              <p className="text-xs mt-1">
                {result.penaltyNights === 0
                  ? 'Aucune retenue appliquée.'
                  : <>Retenue de <b>{result.penaltyNights} nuit{result.penaltyNights > 1 ? 's' : ''}</b> = <b>{fmt(result.penaltyAmount, result.currency)}</b> enregistrée.</>}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          {!result ? (
            <>
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-charcoal transition-colors">Fermer</button>
              <button type="button" onClick={submit} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60">
                {saving ? 'Annulation…' : 'Confirmer l\'annulation'}
              </button>
            </>
          ) : (
            <button type="button" onClick={onDone} className="px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-800 transition-colors">Terminer</button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

function NoShowConfirmModal({ reservation, onClose, onDone }: { reservation: ReservationDto; onClose: () => void; onDone: () => void | Promise<void> }) {
  const penaltyNights = reservation.nights < 15 ? 1 : reservation.nights < 30 ? 2 : 4;
  const penaltyAmount = penaltyNights * reservation.pricePerNightSnapshot;
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState(false);

  async function submit() {
    setSaving(true); setError('');
    try {
      await reservations.processNoShow(reservation.id);
      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg === 'Failed to fetch' ? "Impossible de joindre l'API." : msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <UserX size={16} className="text-amber-600" />
            </div>
            <h2 className="text-sm font-bold text-charcoal">Marquer No Show</h2>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-charcoal transition-colors flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="text-charcoal">
            Réservation <span className="font-mono font-bold text-green-dark">{reservation.reference}</span> — {reservation.clientFullName}
          </p>
          {!done ? (
            <>
              <p className="text-gray-500">Le client n'a pas honoré son arrivée du <b>{reservation.checkInDate}</b>.</p>
              <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3">
                <p className="font-semibold">Retenue No Show</p>
                <p className="text-xs mt-1">
                  Séjour de <b>{reservation.nights} nuit{reservation.nights > 1 ? 's' : ''}</b> → retenue de <b>{penaltyNights} nuit{penaltyNights > 1 ? 's' : ''}</b> = <b>{fmt(penaltyAmount, reservation.currency)}</b>.
                </p>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
            </>
          ) : (
            <div className="rounded-lg border border-green/30 bg-green/10 text-green-dark p-3">
              <p className="font-semibold">Retenue No Show enregistrée.</p>
              <p className="text-xs mt-1">Statut passé à No Show. Le paiement a été enregistré automatiquement.</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          {!done ? (
            <>
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-charcoal transition-colors">Fermer</button>
              <button type="button" onClick={submit} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-60">
                {saving ? 'Traitement…' : 'Appliquer la retenue'}
              </button>
            </>
          ) : (
            <button type="button" onClick={onDone} className="px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-800 transition-colors">Terminer</button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

const SOURCES = ['Direct', 'Téléphone', 'Agence', 'Site web', 'OTA'];

function EditReservationModal({ reservation, onClose, onSaved }: { reservation: ReservationDto; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [form, setForm] = useState({
    source:              reservation.source ?? SOURCES[0],
    adults:              reservation.adults,
    children:            reservation.children,
    specialRequests:     reservation.specialRequests ?? '',
    internalNotes:       reservation.internalNotes ?? '',
    garantieType:        reservation.garantieType ?? '',
    garantieMontantCash: reservation.garantieMontantCash?.toString() ?? '',
    carteNom:            reservation.carteNom ?? '',
    carteExpiration:     reservation.carteExpiration ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await reservations.update(reservation.id, {
        source:              form.source,
        specialRequests:     form.specialRequests,
        internalNotes:       form.internalNotes,
        adults:              Number(form.adults),
        children:            Number(form.children),
        garantieType:        form.garantieType || undefined,
        garantieMontantCash: form.garantieMontantCash ? Number(form.garantieMontantCash) : undefined,
        carteNom:            form.carteNom || undefined,
        carteExpiration:     form.carteExpiration || undefined,
      });
      await onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg === 'Failed to fetch' ? "Impossible de joindre l'API." : msg);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';
  const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <ModalShell onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green/15 flex items-center justify-center">
              <PencilLine size={16} className="text-green-dark" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-charcoal">Éditer la réservation</h2>
              <p className="text-xs text-gray-400">
                <span className="font-mono">{reservation.reference}</span> · {reservation.clientFullName}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-charcoal transition-colors flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-auto">
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">{error}</div>
            )}
            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-2.5">
              Les dates, le logement et les prestations ne sont pas modifiables ici. Utilisez le PMS pour ces changements.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Adultes</label>
                <input type="number" min={1} max={20} value={form.adults}
                  onChange={e => setForm(f => ({ ...f, adults: Number(e.target.value) }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Enfants</label>
                <input type="number" min={0} max={10} value={form.children}
                  onChange={e => setForm(f => ({ ...f, children: Number(e.target.value) }))} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Canal d'origine</label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className={inputCls}>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Demandes spéciales du client</label>
                <textarea rows={2} value={form.specialRequests}
                  onChange={e => setForm(f => ({ ...f, specialRequests: e.target.value }))}
                  className={`${inputCls} resize-none`} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Notes internes</label>
                <textarea rows={2} value={form.internalNotes}
                  onChange={e => setForm(f => ({ ...f, internalNotes: e.target.value }))}
                  className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>Garantie</label>
                <select value={form.garantieType} onChange={e => setForm(f => ({ ...f, garantieType: e.target.value }))} className={inputCls}>
                  <option value="">— Aucune —</option>
                  <option value="Cash">Dépôt en espèces</option>
                  <option value="Carte">Carte bancaire</option>
                </select>
              </div>
              {form.garantieType === 'Cash' && (
                <div>
                  <label className={labelCls}>Montant du dépôt (FCFA)</label>
                  <input type="number" min={0} step={500} value={form.garantieMontantCash}
                    onChange={e => setForm(f => ({ ...f, garantieMontantCash: e.target.value }))} className={inputCls} />
                </div>
              )}
              {form.garantieType === 'Carte' && (
                <>
                  <div>
                    <label className={labelCls}>Nom sur la carte</label>
                    <input value={form.carteNom} onChange={e => setForm(f => ({ ...f, carteNom: e.target.value.toUpperCase() }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Expiration (MM/AAAA)</label>
                    <input value={form.carteExpiration} onChange={e => setForm(f => ({ ...f, carteExpiration: e.target.value }))} className={inputCls} />
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-100 bg-gray-50/50">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-charcoal transition-colors">Annuler</button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-60">
              {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}
