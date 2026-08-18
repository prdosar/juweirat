'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { pmsDebiteurs } from '@/lib/pms';
import type { DebiteurDto } from '@/lib/pmsTypes';
import { Plus, Banknote, X } from 'lucide-react';

interface DebiteurForm {
  client: string; label: string; amount: string; dueDate: string;
}
const EMPTY_FORM: DebiteurForm = { client: '', label: '', amount: '', dueDate: '' };

export default function DebiteursPage() {
  const [list, setList]   = useState<DebiteurDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState<DebiteurForm>(EMPTY_FORM);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const [payId, setPayId]       = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payBusy, setPayBusy]   = useState(false);

  const load = useCallback(async () => {
    pmsDebiteurs.getAll().then(l => { setList(l); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function doCreate(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseInt(form.amount);
    if (!amount || amount <= 0) { setError('Montant invalide'); return; }
    setBusy(true); setError('');
    try {
      await pmsDebiteurs.create({
        client:  form.client,
        label:   form.label,
        amount,
        dueDate: form.dueDate || null,
      });
      setShowForm(false); setForm(EMPTY_FORM); await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  }

  async function doPay(id: number) {
    const m = parseInt(payAmount);
    if (!m || m <= 0) return;
    setPayBusy(true);
    try { await pmsDebiteurs.pay(id, m); setPayId(null); setPayAmount(''); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setPayBusy(false); }
  }

  async function doDelete(id: number) {
    if (!confirm('Supprimer ce débiteur ?')) return;
    await pmsDebiteurs.delete(id);
    await load();
  }

  const totalSolde = list.reduce((s, d) => s + d.solde, 0);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Débiteurs" />
      <div className="flex-1 p-6 space-y-4">

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

        {/* KPI + new button */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-3 flex-wrap">
            <div className="px-4 py-2.5 rounded-xl border border-gray-100 bg-white text-sm flex items-center gap-3">
              <span className="opacity-60">Débiteurs</span>
              <span className="font-bold">{list.length}</span>
            </div>
            {totalSolde > 0 && (
              <div className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-sm flex items-center gap-3">
                <span className="text-red-500">Solde total</span>
                <span className="font-bold text-red-600">{totalSolde.toLocaleString('fr')} FCFA</span>
              </div>
            )}
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90">
            <Plus size={15} /> Nouveau débiteur
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-charcoal">Nouveau débiteur</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-charcoal">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={doCreate} className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Client *</label>
                <input required value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                  placeholder="Nom du débiteur"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Montant (FCFA) *</label>
                <input required type="number" min={1} value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/30" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Libellé *</label>
                <input required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="Ex: Solde séjour juillet, Prestation supplémentaire…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Échéance</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/30" />
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" disabled={busy}
                  className="bg-charcoal text-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
                  {busy ? 'Création…' : 'Créer'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100">
                  Annuler
                </button>
              </div>
            </form>
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
                    <th className="px-5 py-3.5 text-left font-medium">Libellé</th>
                    <th className="px-5 py-3.5 text-left font-medium">Folio lié</th>
                    <th className="px-5 py-3.5 text-left font-medium">Échéance</th>
                    <th className="px-5 py-3.5 text-right font-medium">Montant</th>
                    <th className="px-5 py-3.5 text-right font-medium">Encaissé</th>
                    <th className="px-5 py-3.5 text-right font-medium">Solde</th>
                    <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {list.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50/70">
                      <td className="px-5 py-3.5 font-medium text-charcoal">{d.client}</td>
                      <td className="px-5 py-3.5 text-gray-500 max-w-[200px] truncate">{d.label}</td>
                      <td className="px-5 py-3.5">
                        {d.folioNumber
                          ? <Link href={`/pms/folios/${d.folioId}`} className="font-mono text-xs text-green-dark hover:underline">{d.folioNumber}</Link>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{d.dueDate ?? '—'}</td>
                      <td className="px-5 py-3.5 text-right text-charcoal">{d.amount.toLocaleString('fr')}</td>
                      <td className="px-5 py-3.5 text-right text-gray-500">{d.paid.toLocaleString('fr')}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={d.solde > 0 ? 'text-red-600 font-semibold' : 'text-green-dark font-semibold'}>
                          {d.solde > 0 ? d.solde.toLocaleString('fr') : '✓ Soldé'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex gap-1.5 justify-end items-center">
                          {d.solde > 0 && payId !== d.id && (
                            <button onClick={() => { setPayId(d.id); setPayAmount(''); }}
                              className="flex items-center gap-1 text-xs text-green-dark border border-green/30 px-2.5 py-1 rounded-lg hover:bg-green/5">
                              <Banknote size={11} /> Encaisser
                            </button>
                          )}
                          {payId === d.id && (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number" min={1} value={payAmount}
                                onChange={e => setPayAmount(e.target.value)}
                                placeholder="Montant"
                                className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green/30"
                              />
                              <button onClick={() => doPay(d.id)} disabled={payBusy}
                                className="text-xs bg-green text-charcoal font-semibold px-2.5 py-1 rounded-lg hover:opacity-90 disabled:opacity-50">
                                OK
                              </button>
                              <button onClick={() => setPayId(null)} className="text-gray-400 hover:text-charcoal">
                                <X size={14} />
                              </button>
                            </div>
                          )}
                          {d.solde === 0 && (
                            <button onClick={() => doDelete(d.id)}
                              className="text-xs text-red-500 border border-red-100 px-2.5 py-1 rounded-lg hover:bg-red-50">
                              Suppr.
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-gray-400 text-sm">Aucun débiteur</td>
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
