'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { reservations, payments } from '@/lib/api';
import type { ReservationDto, PaymentDto } from '@/lib/types';
import { CreditCard, Search } from 'lucide-react';

const METHOD_LABELS: Record<string, string> = {
  Cash: 'Espèces', BankTransfer: 'Virement', MobileMoney: 'Mobile Money',
  CreditCard: 'Carte bancaire', Fedapay: 'FedaPay', Stripe: 'Stripe',
};

export default function PaymentsPage() {
  const [resList, setResList]     = useState<ReservationDto[]>([]);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<ReservationDto | null>(null);
  const [payList, setPayList]     = useState<PaymentDto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [amount, setAmount]       = useState('');
  const [method, setMethod]       = useState('Cash');
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    reservations.getAll().then(setResList).finally(() => setLoading(false));
  }, []);

  async function selectReservation(r: ReservationDto) {
    setSelected(r);
    setPayList([]);
    const list = await payments.getByReservation(r.id);
    setPayList(list);
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
        method,
        notes: notes || undefined,
      });
      setPayList(prev => [p, ...prev]);
      setAmount(''); setNotes(''); setShowForm(false);
      // Refresh reservation to update amountDue
      const updated = await reservations.getAll();
      setResList(updated);
      const upd = updated.find(r => r.id === selected.id);
      if (upd) setSelected(upd);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  const filtered = resList.filter(r =>
    !search ||
    r.reference.toLowerCase().includes(search.toLowerCase()) ||
    r.clientFullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Paiements" />
      <div className="flex-1 p-6 flex gap-5 min-h-0">

        {/* Left: reservation list */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Référence ou client…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8 text-gray-400">Chargement…</div>
            ) : filtered.map(r => (
              <button
                key={r.id}
                onClick={() => selectReservation(r)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selected?.id === r.id
                    ? 'border-navy bg-charcoal text-white'
                    : 'border-gray-200 bg-white hover:border-navy/30'
                }`}
              >
                <p className={`font-mono text-xs font-bold ${selected?.id === r.id ? 'text-green' : 'text-green-dark'}`}>
                  {r.reference}
                </p>
                <p className={`text-sm font-medium mt-0.5 ${selected?.id === r.id ? 'text-white' : 'text-charcoal'}`}>
                  {r.clientFullName}
                </p>
                <div className="flex justify-between mt-1">
                  <span className={`text-xs ${selected?.id === r.id ? 'text-white/60' : 'text-gray-400'}`}>
                    {r.checkInDate} → {r.checkOutDate}
                  </span>
                  <span className={`text-xs font-medium ${r.amountDue > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {r.amountDue > 0 ? `−${r.amountDue.toLocaleString('fr')}` : '✓ Soldé'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: payment detail */}
        <div className="flex-1 space-y-4">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-gray-400 flex-col gap-2">
              <CreditCard size={40} className="text-gray-300" />
              <p>Sélectionnez une réservation</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-sm font-bold text-green-dark">{selected.reference}</p>
                    <p className="text-lg font-semibold text-charcoal mt-0.5">{selected.clientFullName}</p>
                    <p className="text-sm text-gray-500">
                      Chambre {selected.roomNumber} · {selected.nights} nuits · {selected.checkInDate} → {selected.checkOutDate}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-dark transition-colors"
                  >
                    + Encaisser
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                  {[
                    { label: 'Total', value: selected.totalPrice },
                    { label: 'Payé',  value: selected.amountPaid },
                    { label: 'Restant', value: selected.amountDue },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-lg font-bold text-charcoal">{value.toLocaleString('fr')} <span className="text-xs font-normal">{selected.currency}</span></p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add payment form */}
              {showForm && (
                <form onSubmit={handleAddPayment} className="bg-charcoal/5 border border-navy/20 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-charcoal">Enregistrer un paiement</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Montant ({selected.currency})</label>
                      <input
                        type="number"
                        required
                        min="1"
                        step="1"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder={String(selected.amountDue)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Méthode</label>
                      <select
                        value={method}
                        onChange={e => setMethod(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
                      >
                        {Object.entries(METHOD_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Note (optionnel)</label>
                    <input
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Remarques sur ce paiement"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-800 disabled:opacity-60 transition-colors"
                    >
                      {saving ? 'Enregistrement…' : 'Confirmer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="text-sm text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}

              {/* Payment history */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-charcoal">
                  Historique des paiements
                </div>
                {payList.length === 0 ? (
                  <div className="px-5 py-8 text-center text-gray-400 text-sm">
                    Aucun paiement enregistré
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-xs text-gray-500 uppercase tracking-wide">
                        <th className="px-5 py-3 text-left">Référence</th>
                        <th className="px-5 py-3 text-left">Méthode</th>
                        <th className="px-5 py-3 text-left">Date</th>
                        <th className="px-5 py-3 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {payList.map(p => (
                        <tr key={p.id}>
                          <td className="px-5 py-3 font-mono text-xs text-gray-500">{p.internalReference}</td>
                          <td className="px-5 py-3 text-gray-700">{METHOD_LABELS[p.method] ?? p.method}</td>
                          <td className="px-5 py-3 text-gray-500">
                            {p.paidAt ? new Date(p.paidAt).toLocaleDateString('fr') : '—'}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-green-700">
                            +{p.amount.toLocaleString('fr')} {p.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
