'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { pmsDebiteurs } from '@/lib/pms';
import type { DebiteurDto } from '@/lib/pmsTypes';
import { Plus, Banknote, X } from 'lucide-react';

const PAYMENT_MODES = [
  'Espèces',
  'Mobile Money (TMoney)',
  'Mobile Money (Flooz)',
  'Carte bancaire',
  'Virement bancaire',
  'Chèque',
];

interface DebiteurForm {
  client: string; label: string; amount: string; dueDate: string;
}
const EMPTY_FORM: DebiteurForm = { client: '', label: '', amount: '', dueDate: '' };

interface PayForm {
  id: number;
  solde: number;
  mode: string;
  amount: string;
  ref: string;
}

export default function DebiteursPage() {
  const [list, setList]         = useState<DebiteurDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState<DebiteurForm>(EMPTY_FORM);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const [payForm, setPayForm]   = useState<PayForm | null>(null);
  const [payBusy, setPayBusy]   = useState(false);

  const load = useCallback(async () => {
    pmsDebiteurs.getAll().then(l => {
      // N'afficher que les débiteurs non soldés
      setList(l.filter(d => d.solde > 0));
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  function openPayForm(d: DebiteurDto) {
    setPayForm({
      id:     d.id,
      solde:  d.solde,
      mode:   'Espèces',
      amount: String(d.solde),
      ref:    '',
    });
  }

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

  async function doPay() {
    if (!payForm) return;
    const m = parseInt(payForm.amount);
    if (!m || m <= 0) { setError('Montant invalide'); return; }
    setPayBusy(true); setError('');
    try {
      const modeLabel = payForm.ref.trim()
        ? `${payForm.mode} [${payForm.ref.trim()}]`
        : payForm.mode;
      await pmsDebiteurs.pay(payForm.id, m, modeLabel);
      setPayForm(null);
      await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* KPI + new button */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-3 flex-wrap">
            <div className="px-4 py-2.5 rounded-xl border border-gray-100 bg-white text-sm flex items-center gap-3">
              <span className="opacity-60">Débiteurs en cours</span>
              <span className="font-bold">{list.length}</span>
            </div>
            {totalSolde > 0 && (
              <div className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-sm flex items-center gap-3">
                <span className="text-red-500">Solde total dû</span>
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

        {/* Formulaire d'encaissement débiteur */}
        {payForm && (
          <div className="bg-white rounded-xl border border-green/20 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-charcoal">Encaissement débiteur</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Solde restant dû : <span className="font-bold text-red-600">{payForm.solde.toLocaleString('fr')} FCFA</span>
                </p>
              </div>
              <button onClick={() => setPayForm(null)} className="text-gray-400 hover:text-charcoal">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mode de paiement</label>
                <select
                  value={payForm.mode}
                  onChange={e => setPayForm(f => f ? { ...f, mode: e.target.value } : f)}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green/30"
                >
                  {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Montant (FCFA)</label>
                <input
                  type="number" min={1} max={payForm.solde}
                  value={payForm.amount}
                  onChange={e => setPayForm(f => f ? { ...f, amount: e.target.value } : f)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Réf / N° Reçu (opt.)</label>
                <input
                  type="text"
                  value={payForm.ref}
                  onChange={e => setPayForm(f => f ? { ...f, ref: e.target.value } : f)}
                  placeholder="ex: TX-9021"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green/30"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={doPay}
                disabled={payBusy || !parseInt(payForm.amount)}
                className="bg-green text-charcoal text-xs font-bold px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 shadow-sm"
              >
                {payBusy ? 'Validation…' : 'Valider le règlement'}
              </button>
              <button
                onClick={() => setPayForm(null)}
                className="text-xs text-gray-500 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                Annuler
              </button>
              {(() => {
                const m = parseInt(payForm.amount) || 0;
                const reste = Math.max(0, payForm.solde - m);
                return (
                  <span className="text-xs text-gray-400 ml-auto">
                    Solde après : <strong className={reste === 0 ? 'text-green-dark' : 'text-amber-600'}>{reste === 0 ? 'Soldé ✓' : `${reste.toLocaleString('fr')} FCFA`}</strong>
                  </span>
                );
              })()}
            </div>
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
                    <tr key={d.id} className={`hover:bg-gray-50/70 ${payForm?.id === d.id ? 'bg-green/5' : ''}`}>
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
                        <span className="text-red-600 font-semibold">{d.solde.toLocaleString('fr')}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex gap-1.5 justify-end items-center">
                          {payForm?.id !== d.id && (
                            <button onClick={() => openPayForm(d)}
                              className="flex items-center gap-1 text-xs text-green-dark border border-green/30 px-2.5 py-1 rounded-lg hover:bg-green/5">
                              <Banknote size={11} /> Encaisser
                            </button>
                          )}
                          <button onClick={() => doDelete(d.id)}
                            className="text-xs text-red-400 border border-red-100 px-2.5 py-1 rounded-lg hover:bg-red-50">
                            Suppr.
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-gray-400 text-sm">
                        Aucun débiteur en cours — tous les soldes sont réglés
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
