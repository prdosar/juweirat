'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import PaginationControl from '@/components/PaginationControl';
import { reservations, payments } from '@/lib/api';
import type { ReservationDto, PaymentDto, PagedResult } from '@/lib/types';
import { CreditCard, Search, Filter, Calendar, Plus, CheckCircle2, ArrowUpDown, History, Receipt, DollarSign, X } from 'lucide-react';

const METHOD_LABELS: Record<string, string> = {
  Cash: 'Espèces',
  BankTransfer: 'Virement',
  MobileMoney: 'Mobile Money (T-Money/Flooz)',
  CreditCard: 'Carte Bancaire',
  Fedapay: 'FedaPay',
  Stripe: 'Stripe',
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  Completed: { label: 'Validé', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  Pending:   { label: 'En attente', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  Failed:    { label: 'Échoué', cls: 'bg-red-50 text-red-700 border border-red-200' },
  Refunded:  { label: 'Remboursé', cls: 'bg-gray-100 text-gray-700 border border-gray-200' },
};

function fmt(n: number, currency = 'XOF') {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)} ${currency}`;
}

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<'journal' | 'new_payment'>('journal');

  // Paged payments state
  const [paged, setPaged] = useState<PagedResult<PaymentDto>>({
    items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false,
  });
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOption, setSortOption] = useState('date_desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  // New payment tool state
  const [resList, setResList]   = useState<ReservationDto[]>([]);
  const [resSearch, setResSearch] = useState('');
  const [selected, setSelected] = useState<ReservationDto | null>(null);
  const [payList, setPayList]   = useState<PaymentDto[]>([]);
  const [resLoading, setResLoading] = useState(false);
  const [amount, setAmount]     = useState('');
  const [newPayMethod, setNewPayMethod] = useState('Cash');
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);

  // Fetch paged payments
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      let sortBy = 'PaidAt';
      let isDescending = true;
      if (sortOption === 'date_asc') { sortBy = 'PaidAt'; isDescending = false; }
      else if (sortOption === 'amount_desc') { sortBy = 'Amount'; isDescending = true; }
      else if (sortOption === 'amount_asc') { sortBy = 'Amount'; isDescending = false; }

      const res = await payments.getPaged({
        pageNumber: page,
        pageSize,
        search: search.trim() || undefined,
        method: method || undefined,
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        isDescending,
      });
      setPaged(res);
    } catch (err) {
      console.error('Erreur chargement paiements:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, method, status, startDate, endDate, sortOption]);

  useEffect(() => {
    if (activeTab === 'journal') {
      fetchPayments();
    }
  }, [activeTab, fetchPayments]);

  // Load reservations for direct payment
  useEffect(() => {
    if (activeTab === 'new_payment') {
      setResLoading(true);
      reservations.getAll().then(setResList).finally(() => setResLoading(false));
    }
  }, [activeTab]);

  async function selectReservation(r: ReservationDto) {
    setSelected(r);
    setPayList([]);
    const list = await payments.getByReservation(r.id);
    setPayList(list);
    const remaining = r.amountDue ?? (r.totalPrice - r.amountPaid);
    if (remaining > 0) setAmount(String(remaining));
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const p = await payments.create({
        reservationId: selected.id,
        amount: parseFloat(amount),
        currency: selected.currency,
        method: newPayMethod,
        notes: notes || undefined,
      });
      setPayList(prev => [p, ...prev]);
      setAmount(''); setNotes('');
      const updated = await reservations.getAll();
      setResList(updated);
      const upd = updated.find(r => r.id === selected.id);
      if (upd) setSelected(upd);
      fetchPayments();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  const resetJournalFilters = () => {
    setSearch('');
    setMethod('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setSortOption('date_desc');
    setPage(1);
  };

  const hasJournalFilters = search || method || status || startDate || endDate || sortOption !== 'date_desc';

  const filteredRes = resList.filter(r =>
    !resSearch ||
    r.reference.toLowerCase().includes(resSearch.toLowerCase()) ||
    r.clientFullName.toLowerCase().includes(resSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Paiements & Règlements" />
      <div className="flex-1 p-6 space-y-4">

        {/* Tab switcher */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('journal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'journal'
                  ? 'bg-charcoal text-white shadow-xs'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <History size={15} /> Journal des Encaissements
            </button>
            <button
              onClick={() => setActiveTab('new_payment')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'new_payment'
                  ? 'bg-charcoal text-white shadow-xs'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Receipt size={15} /> Encaisser sur Réservation
            </button>
          </div>
        </div>

        {/* TAB 1: JOURNAL DES PAIEMENTS PAGINÉ */}
        {activeTab === 'journal' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Réf paiement, réf résa, client, notes..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-green/30 focus:border-green/40 bg-gray-50/50"
                  />
                </div>

                <button
                  onClick={() => setActiveTab('new_payment')}
                  className="flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-800 transition-colors shadow-xs ml-auto"
                >
                  <Plus size={15} /> Encaisser
                </button>
              </div>

              {/* Business Filters */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
                {/* Method */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                  <CreditCard size={13} className="text-gray-400" />
                  <span className="text-gray-500 font-medium">Mode :</span>
                  <select
                    value={method}
                    onChange={e => { setMethod(e.target.value); setPage(1); }}
                    className="bg-transparent border-none text-charcoal font-semibold text-xs focus:ring-0 cursor-pointer outline-hidden"
                  >
                    <option value="">Tous les modes</option>
                    <option value="Cash">Espèces</option>
                    <option value="Card">Carte Bancaire</option>
                    <option value="MobileMoney">Mobile Money</option>
                    <option value="BankTransfer">Virement</option>
                    <option value="Fedapay">FedaPay</option>
                    <option value="Stripe">Stripe</option>
                  </select>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                  <Filter size={13} className="text-gray-400" />
                  <span className="text-gray-500 font-medium">Statut :</span>
                  <select
                    value={status}
                    onChange={e => { setStatus(e.target.value); setPage(1); }}
                    className="bg-transparent border-none text-charcoal font-semibold text-xs focus:ring-0 cursor-pointer outline-hidden"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="Completed">Validé</option>
                    <option value="Pending">En attente</option>
                    <option value="Failed">Échoué</option>
                    <option value="Refunded">Remboursé</option>
                  </select>
                </div>

                {/* Date Du */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                  <Calendar size={13} className="text-gray-400" />
                  <span className="text-gray-500 font-medium">Du :</span>
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
                    <option value="date_desc">Date (récents d'abord)</option>
                    <option value="date_asc">Date (anciens d'abord)</option>
                    <option value="amount_desc">Montant le plus élevé</option>
                    <option value="amount_asc">Montant le plus bas</option>
                  </select>
                </div>

                {/* Reset */}
                {hasJournalFilters && (
                  <button
                    type="button"
                    onClick={resetJournalFilters}
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
                          <th className="px-5 py-3.5 text-left font-medium">Réf Paiement</th>
                          <th className="px-5 py-3.5 text-left font-medium">Réservation</th>
                          <th className="px-5 py-3.5 text-left font-medium">Date d'encaissement</th>
                          <th className="px-5 py-3.5 text-left font-medium">Mode</th>
                          <th className="px-5 py-3.5 text-left font-medium">Statut</th>
                          <th className="px-5 py-3.5 text-left font-medium">Notes</th>
                          <th className="px-5 py-3.5 text-right font-medium">Montant</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paged.items.map(p => {
                          const st = STATUS_LABELS[p.status] ?? { label: p.status, cls: 'bg-gray-100 text-gray-600' };
                          const d = p.paidAt ?? p.createdAt;
                          const dateStr = d ? new Date(d).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                          }) : '—';

                          return (
                            <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                              <td className="px-5 py-3.5 font-mono text-xs font-bold text-charcoal">
                                {p.internalReference ?? `PAY-${p.id}`}
                              </td>
                              <td className="px-5 py-3.5">
                                <a
                                  href={`/reservations/${p.reservationId}`}
                                  className="font-mono text-xs font-semibold text-green-dark hover:underline"
                                >
                                  {p.reservationReference}
                                </a>
                              </td>
                              <td className="px-5 py-3.5 text-gray-500 text-xs">{dateStr}</td>
                              <td className="px-5 py-3.5 text-gray-700 font-medium">
                                {METHOD_LABELS[p.method] ?? p.method}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${st.cls}`}>
                                  {st.label}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-gray-400 text-xs max-w-xs truncate">
                                {p.notes ?? '—'}
                              </td>
                              <td className="px-5 py-3.5 text-right font-bold text-charcoal">
                                {fmt(p.amount, p.currency)}
                              </td>
                            </tr>
                          );
                        })}

                        {paged.items.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-16 text-center text-gray-400 text-sm">
                              Aucun paiement trouvé pour ces critères.
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
        )}

        {/* TAB 2: ENCAISSEMENT DIRECT SUR RÉSERVATION */}
        {activeTab === 'new_payment' && (
          <div className="flex flex-col md:flex-row gap-5 min-h-0">
            {/* Left: reservation picker */}
            <div className="w-full md:w-80 shrink-0 flex flex-col gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={resSearch}
                  onChange={e => setResSearch(e.target.value)}
                  placeholder="Référence ou client…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-green/30 focus:border-green/40 bg-white"
                />
              </div>
              <div className="space-y-1.5 max-h-[calc(100vh-14rem)] overflow-y-auto">
                {resLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
                  </div>
                ) : filteredRes.map(r => {
                  const rem = r.amountDue ?? (r.totalPrice - r.amountPaid);
                  return (
                    <button
                      key={r.id}
                      onClick={() => selectReservation(r)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selected?.id === r.id
                          ? 'border-charcoal bg-charcoal text-white shadow-xs'
                          : 'border-gray-200 bg-white hover:border-green/40 hover:bg-green/5'
                      }`}
                    >
                      <p className={`font-mono text-xs font-bold ${selected?.id === r.id ? 'text-green' : 'text-green-dark'}`}>
                        {r.reference}
                      </p>
                      <p className="font-semibold text-sm truncate mt-0.5">{r.clientFullName}</p>
                      <div className="flex items-center justify-between text-xs mt-2 pt-1.5 border-t border-gray-100/20">
                        <span className={selected?.id === r.id ? 'text-white/70' : 'text-gray-400'}>
                          Total: {fmt(r.totalPrice, r.currency)}
                        </span>
                        <span className={`font-bold ${rem > 0 ? (selected?.id === r.id ? 'text-amber-300' : 'text-amber-600') : 'text-green'}`}>
                          {rem > 0 ? `Reste ${fmt(rem, r.currency)}` : 'Soldé'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Payment form & history */}
            <div className="flex-1 bg-white rounded-xl shadow-xs border border-gray-100 p-6 space-y-6">
              {selected ? (
                <>
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div>
                      <span className="font-mono text-xs text-green-dark font-bold">{selected.reference}</span>
                      <h2 className="text-xl font-bold text-charcoal">{selected.clientFullName}</h2>
                      <p className="text-xs text-gray-400">
                        {selected.categoryNameFr} · Du {selected.checkInDate} au {selected.checkOutDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Montant restant</p>
                      <p className={`text-2xl font-bold ${selected.amountDue > 0 ? 'text-amber-600' : 'text-green-dark'}`}>
                        {fmt(Math.max(0, selected.amountDue), selected.currency)}
                      </p>
                    </div>
                  </div>

                  {/* Payment form */}
                  <form onSubmit={handleAddPayment} className="space-y-4 bg-gray-50/70 p-5 rounded-xl border border-gray-200">
                    <h3 className="text-sm font-bold text-charcoal flex items-center gap-1.5">
                      <CreditCard size={16} className="text-green-dark" /> Enregistrer un règlement
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Montant ({selected.currency})</label>
                        <input
                          type="number"
                          step="1"
                          required
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          placeholder="ex: 50000"
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-green/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Mode de règlement</label>
                        <select
                          value={newPayMethod}
                          onChange={e => setNewPayMethod(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-green/30"
                        >
                          <option value="Cash">Espèces</option>
                          <option value="Card">Carte bancaire</option>
                          <option value="MobileMoney">Mobile Money (T-Money / Flooz)</option>
                          <option value="BankTransfer">Virement bancaire</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Note interne ou référence de reçu</label>
                      <input
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="ex: Reçu N° 4589..."
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-green/30"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full bg-charcoal hover:bg-charcoal-800 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2"
                    >
                      {saving ? 'Enregistrement…' : 'Valider le paiement'}
                    </button>
                  </form>

                  {/* Payment history of this reservation */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-charcoal">Historique des règlements sur ce dossier</h3>
                    {payList.length === 0 ? (
                      <p className="text-xs text-gray-400">Aucun paiement enregistré pour cette réservation.</p>
                    ) : (
                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                        {payList.map(p => (
                          <div key={p.id} className="p-3.5 flex items-center justify-between bg-white text-xs">
                            <div>
                              <p className="font-semibold text-charcoal font-mono">{p.internalReference ?? `PAY-${p.id}`}</p>
                              <p className="text-gray-400 mt-0.5">
                                {METHOD_LABELS[p.method] ?? p.method} · {p.paidAt ? new Date(p.paidAt).toLocaleDateString('fr-FR') : ''}
                              </p>
                              {p.notes && <p className="text-gray-500 italic mt-0.5">{p.notes}</p>}
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-sm text-charcoal">{fmt(p.amount, p.currency)}</span>
                              <p className="text-green-dark font-medium text-[10px]">Validé ✓</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
                  <CreditCard size={36} className="text-gray-300" />
                  <p className="text-sm">Sélectionnez une réservation à gauche pour enregistrer un encaissement.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
