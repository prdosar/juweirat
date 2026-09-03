'use client';

import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import { expenses, expenseCategories, suppliers, cash } from '@/lib/api';
import type { ExpenseReportDto, ExpenseCategoryDto, SupplierDto, CashRegisterDto, ExpenseDto } from '@/lib/types';
import { Download, RotateCcw, TrendingDown, Plus, Trash2, X } from 'lucide-react';

function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function fmt(n: number): string { return Math.round(n).toLocaleString('fr-FR'); }
function csvEscape(v: string | number | null): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function ChargesPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [from, setFrom]   = useState(isoDate(firstOfMonth));
  const [to,   setTo]     = useState(isoDate(today));
  const [catFilter, setCatFilter] = useState('');
  const [supFilter, setSupFilter] = useState('');

  const [report,  setReport]  = useState<ExpenseReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [categories, setCategories] = useState<ExpenseCategoryDto[]>([]);
  const [suppliersList, setSuppliersList] = useState<SupplierDto[]>([]);
  const [registers, setRegisters] = useState<CashRegisterDto[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: isoDate(today),
    label: '',
    amount: '',
    categoryId: '',
    supplierId: '',
    cashRegisterId: '',
    notes: '',
  });

  useEffect(() => {
    expenseCategories.getAll().then(setCategories).catch(() => {});
    suppliers.getAll().then(setSuppliersList).catch(() => {});
    cash.getRegisters().then(setRegisters).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await expenses.getReport({
        from: `${from}T00:00:00Z`,
        to:   `${to}T23:59:59Z`,
      });
      setReport(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.categoryId) return;
    setSaving(true);
    try {
      await expenses.create({
        date:           `${form.date}T12:00:00Z`,
        label:          form.label.trim(),
        amount:         parseFloat(form.amount),
        categoryId:     parseInt(form.categoryId),
        supplierId:     form.supplierId ? parseInt(form.supplierId) : undefined,
        cashRegisterId: form.cashRegisterId ? parseInt(form.cashRegisterId) : undefined,
        notes:          form.notes.trim() || undefined,
      });
      setShowModal(false);
      setForm({ date: isoDate(today), label: '', amount: '', categoryId: '', supplierId: '', cashRegisterId: '', notes: '' });
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(expense: ExpenseDto) {
    if (!confirm(`Supprimer la charge « ${expense.label} » (${fmt(expense.amount)} FCFA) ?`)) return;
    try {
      await expenses.remove(expense.id);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    }
  }

  function exportCsv() {
    if (!report) return;
    const header = ['Date', 'Libellé', 'Catégorie', 'Fournisseur', 'Caisse', 'Montant'];
    const rows = filteredEntries.map(e => [
      e.date.slice(0, 10),
      e.label,
      e.categoryName,
      e.supplierName ?? '',
      e.cashRegisterName ?? '',
      e.amount,
    ]);
    const csv = [header, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `charges_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredEntries = (report?.entries ?? []).filter(e => {
    if (catFilter && e.categoryId !== parseInt(catFilter)) return false;
    if (supFilter && e.supplierId !== parseInt(supFilter)) return false;
    return true;
  });

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Charges" />
      <div className="flex-1 p-6 space-y-4">

        {/* Filtres */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Du</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Au</label>
              <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Catégorie</label>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={inputCls}>
                <option value="">Toutes</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Fournisseur</label>
              <select value={supFilter} onChange={e => setSupFilter(e.target.value)} className={inputCls}>
                <option value="">Tous</option>
                {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={load} disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-charcoal border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                <RotateCcw size={13} className={loading ? 'animate-spin' : ''} /> Rafraîchir
              </button>
              <button type="button" onClick={exportCsv} disabled={filteredEntries.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-charcoal border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                <Download size={13} /> CSV
              </button>
              <button type="button" onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal text-white rounded-lg hover:bg-charcoal-800">
                <Plus size={13} /> Nouvelle charge
              </button>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

        {/* KPIs */}
        {report && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total période</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{fmt(filteredEntries.reduce((s, e) => s + e.amount, 0))}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">FCFA</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nombre d'écritures</p>
              <p className="text-2xl font-bold text-charcoal mt-1">{filteredEntries.length}</p>
            </div>
            {report.byCategory.slice(0, 2).map(cat => (
              <div key={cat.categoryId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-1.5">
                  {cat.categoryColor && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.categoryColor }} />}
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate">{cat.categoryName}</p>
                </div>
                <p className="text-xl font-bold text-charcoal mt-1">{fmt(cat.total)}</p>
                <p className="text-[10px] text-gray-400">{cat.count} charge(s)</p>
              </div>
            ))}
          </div>
        )}

        {/* Répartition par catégorie */}
        {report && !loading && report.byCategory.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Répartition par catégorie</p>
            <div className="space-y-2">
              {report.byCategory.map(cat => {
                const pct = report.totalAmount > 0 ? (cat.total / report.totalAmount) * 100 : 0;
                return (
                  <div key={cat.categoryId}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        {cat.categoryColor && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.categoryColor }} />}
                        <span className="text-charcoal font-medium">{cat.categoryName}</span>
                        <span className="text-gray-400">({cat.count})</span>
                      </div>
                      <span className="font-semibold text-charcoal">{fmt(cat.total)} FCFA</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-red-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <TrendingDown size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aucune charge sur cette période.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/60">
                  <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left font-medium">Date</th>
                    <th className="px-4 py-2.5 text-left font-medium">Libellé</th>
                    <th className="px-4 py-2.5 text-left font-medium">Catégorie</th>
                    <th className="px-4 py-2.5 text-left font-medium">Fournisseur</th>
                    <th className="px-4 py-2.5 text-left font-medium">Caisse</th>
                    <th className="px-4 py-2.5 text-right font-medium">Montant</th>
                    <th className="px-4 py-2.5 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredEntries.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2 text-charcoal font-medium">{e.label}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {e.categoryColor && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.categoryColor }} />}
                          {e.categoryName}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">{e.supplierName ?? '—'}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{e.cashRegisterName ?? '—'}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold text-red-600">{fmt(e.amount)}</td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => handleDelete(e)} title="Supprimer"
                          className="p-1 text-gray-400 hover:text-red-500 rounded">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-charcoal bg-charcoal/5">
                  <tr className="text-xs font-bold text-charcoal">
                    <td colSpan={5} className="px-4 py-3">Total période</td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {fmt(filteredEntries.reduce((s, e) => s + e.amount, 0))} FCFA
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal nouvelle charge */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-charcoal">Nouvelle charge</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-charcoal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date *</label>
                  <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls + ' w-full'} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Montant (FCFA) *</label>
                  <input type="number" min="1" step="1" required value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0" className={inputCls + ' w-full'} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Libellé *</label>
                <input type="text" required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="Ex : Facture eau novembre" className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Catégorie *</label>
                <select required value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} className={inputCls + ' w-full'}>
                  <option value="">— Choisir —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Fournisseur</label>
                  <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))} className={inputCls + ' w-full'}>
                    <option value="">— Aucun —</option>
                    {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Caisse</label>
                  <select value={form.cashRegisterId} onChange={e => setForm(f => ({ ...f, cashRegisterId: e.target.value }))} className={inputCls + ' w-full'}>
                    <option value="">— Aucune —</option>
                    {registers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Remarques éventuelles..." className={inputCls + ' w-full resize-none'} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-charcoal">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 text-sm bg-charcoal text-white rounded-lg hover:bg-charcoal-800 disabled:opacity-50">
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
