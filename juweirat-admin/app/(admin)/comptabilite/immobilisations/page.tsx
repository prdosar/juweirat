'use client';

import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import { fixedAssets, suppliers, cash } from '@/lib/api';
import type { FixedAssetDto, DepreciationScheduleDto, SupplierDto, CashRegisterDto } from '@/lib/types';
import { Package, Plus, X, ChevronDown, ChevronUp, Play } from 'lucide-react';

function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function isoPeriod(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}`;
}
function fmt(n: number): string { return Math.round(n).toLocaleString('fr-FR'); }
function fmtD(n: number): string { return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

const CATEGORIES = ['Mobilier', 'Electromenager', 'Informatique', 'Infrastructure', 'Vehicule', 'Autre'];
const METHODS = [
  { value: 'Linear', label: 'Linéaire' },
  { value: 'Declining', label: 'Dégressif' },
];

const STATUS_STYLE: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  Disposed: 'bg-gray-100 text-gray-500',
};

export default function ImmobilisationsPage() {
  const today = new Date();

  const [assets, setAssets] = useState<FixedAssetDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<DepreciationScheduleDto | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const [suppliersList, setSuppliersList] = useState<SupplierDto[]>([]);
  const [registers, setRegisters] = useState<CashRegisterDto[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', category: 'Mobilier',
    acquisitionDate: isoDate(today), acquisitionCost: '',
    usefulLifeMonths: '', residualValue: '0',
    depreciationMethod: 'Linear', notes: '',
    supplierId: '', cashRegisterId: '',
  });

  const [period, setPeriod] = useState(isoPeriod(today));
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState('');

  useEffect(() => {
    suppliers.getAll().then(setSuppliersList).catch(() => {});
    cash.getRegisters().then(setRegisters).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fixedAssets.getAll({ status: statusFilter || undefined, pageSize: 500 });
      setAssets(r.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function toggleExpand(id: number) {
    if (expandedId === id) { setExpandedId(null); setSchedule(null); return; }
    setExpandedId(id);
    setSchedule(null);
    setLoadingSchedule(true);
    try {
      const s = await fixedAssets.getSchedule(id);
      setSchedule(s);
    } catch { setSchedule(null); }
    finally { setLoadingSchedule(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fixedAssets.create({
        name:               form.name.trim(),
        description:        form.description.trim() || undefined,
        category:           form.category,
        acquisitionDate:    `${form.acquisitionDate}T12:00:00Z`,
        acquisitionCost:    parseFloat(form.acquisitionCost),
        usefulLifeMonths:   parseInt(form.usefulLifeMonths),
        residualValue:      parseFloat(form.residualValue || '0'),
        depreciationMethod: form.depreciationMethod,
        notes:              form.notes.trim() || undefined,
        supplierId:         form.supplierId ? parseInt(form.supplierId) : undefined,
        cashRegisterId:     form.cashRegisterId ? parseInt(form.cashRegisterId) : undefined,
      });
      setShowModal(false);
      setForm({ name: '', description: '', category: 'Mobilier', acquisitionDate: isoDate(today),
                acquisitionCost: '', usefulLifeMonths: '', residualValue: '0',
                depreciationMethod: 'Linear', notes: '', supplierId: '', cashRegisterId: '' });
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRunDepreciation() {
    if (!period) return;
    if (!confirm(`Lancer le calcul des amortissements pour la période ${period} ?`)) return;
    setRunning(true); setRunResult('');
    try {
      const r = await fixedAssets.runDepreciation(period);
      setRunResult(`✓ ${r.assetsProcessed} actif(s) amorti(s), ${r.skipped} ignoré(s), total ${fmt(r.totalAmount)} FCFA`);
      await load();
      if (expandedId) {
        const s = await fixedAssets.getSchedule(expandedId);
        setSchedule(s);
      }
    } catch (err: unknown) {
      setRunResult(`Erreur : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Immobilisations" />
      <div className="flex-1 p-6 space-y-4">

        {/* Barre de commandes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Statut</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls}>
                <option value="">Tous</option>
                <option value="Active">Actifs</option>
                <option value="Disposed">Sortis</option>
              </select>
            </div>
            <div className="border-l border-gray-200 pl-3 ml-1">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Lancer amortissement</label>
              <div className="flex items-center gap-2">
                <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className={inputCls} />
                <button type="button" onClick={handleRunDepreciation} disabled={running || !period}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-green-dark text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                  <Play size={12} className={running ? 'animate-spin' : ''} />
                  {running ? 'Calcul…' : 'Lancer'}
                </button>
              </div>
            </div>
            <div className="ml-auto">
              <button type="button" onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal text-white rounded-lg hover:bg-charcoal-800">
                <Plus size={13} /> Nouvelle immobilisation
              </button>
            </div>
          </div>
          {runResult && (
            <p className={`mt-3 text-xs px-3 py-2 rounded-lg ${runResult.startsWith('Erreur') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {runResult}
            </p>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

        {/* KPIs */}
        {!loading && assets.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Valeur brute</p>
              <p className="text-xl font-bold text-charcoal mt-1">{fmt(assets.reduce((s, a) => s + a.acquisitionCost, 0))}</p>
              <p className="text-[10px] text-gray-400">FCFA</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Amorti cumulé</p>
              <p className="text-xl font-bold text-amber-600 mt-1">{fmt(assets.reduce((s, a) => s + a.depreciatedAmount, 0))}</p>
              <p className="text-[10px] text-gray-400">FCFA</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">VNC totale</p>
              <p className="text-xl font-bold text-green-dark mt-1">{fmt(assets.reduce((s, a) => s + a.bookValue, 0))}</p>
              <p className="text-[10px] text-gray-400">FCFA</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actifs</p>
              <p className="text-xl font-bold text-charcoal mt-1">{assets.length}</p>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
          </div>
        ) : assets.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <Package size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aucune immobilisation enregistrée.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/60">
                  <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                    <th className="w-8" />
                    <th className="px-4 py-2.5 text-left font-medium">Désignation</th>
                    <th className="px-4 py-2.5 text-left font-medium">Catégorie</th>
                    <th className="px-4 py-2.5 text-left font-medium">Méthode</th>
                    <th className="px-4 py-2.5 text-left font-medium">Date acq.</th>
                    <th className="px-4 py-2.5 text-right font-medium">Coût brut</th>
                    <th className="px-4 py-2.5 text-right font-medium">Amorti</th>
                    <th className="px-4 py-2.5 text-right font-medium text-green-dark">VNC</th>
                    <th className="px-4 py-2.5 text-center font-medium">Statut</th>
                    <th className="px-4 py-2.5 text-center font-medium">Tableau</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(a => (
                    <>
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                        <td className="pl-3 text-gray-300 text-xs font-mono">{a.id}</td>
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-charcoal">{a.name}</div>
                          {a.supplierName && <div className="text-xs text-gray-400">{a.supplierName}</div>}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-600">{a.category}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">
                          {a.depreciationMethod === 'Linear' ? 'Linéaire' : 'Dégressif'}
                          <span className="ml-1 text-gray-400">/ {a.usefulLifeMonths} mois</span>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500">
                          {new Date(a.acquisitionDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-charcoal">{fmt(a.acquisitionCost)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-amber-600">{fmt(a.depreciatedAmount)}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-bold text-green-dark">{fmt(a.bookValue)}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {a.status === 'Active' ? 'Actif' : 'Sorti'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button onClick={() => toggleExpand(a.id)}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                            {expandedId === a.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            Tableau
                          </button>
                        </td>
                      </tr>
                      {expandedId === a.id && (
                        <tr key={`schedule-${a.id}`} className="bg-blue-50/30">
                          <td colSpan={10} className="px-6 py-4">
                            {loadingSchedule ? (
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <div className="w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                                Chargement du tableau…
                              </div>
                            ) : schedule ? (
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                  Tableau d'amortissement — {schedule.asset.name}
                                </p>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                                    <thead className="bg-gray-100">
                                      <tr className="text-[10px] text-gray-500 uppercase">
                                        <th className="px-3 py-2 text-left">Période</th>
                                        <th className="px-3 py-2 text-right">Dotation</th>
                                        <th className="px-3 py-2 text-right">Cumul amorti</th>
                                        <th className="px-3 py-2 text-right">VNC</th>
                                        <th className="px-3 py-2 text-center">Comptabilisé</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                      {schedule.entries.map(e => (
                                        <tr key={e.period} className={e.isRecorded ? '' : 'text-gray-400 italic'}>
                                          <td className="px-3 py-1.5 font-mono">{e.period}</td>
                                          <td className="px-3 py-1.5 text-right tabular-nums">{fmtD(e.amount)}</td>
                                          <td className="px-3 py-1.5 text-right tabular-nums">{fmtD(e.cumulativeAmount)}</td>
                                          <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-green-dark">{fmtD(e.bookValue)}</td>
                                          <td className="px-3 py-1.5 text-center">
                                            {e.isRecorded
                                              ? <span className="text-green-600">✓</span>
                                              : <span className="text-gray-300">—</span>}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 border-t border-gray-200">
                                      <tr className="text-[10px] font-bold text-charcoal">
                                        <td className="px-3 py-2">Total amorti</td>
                                        <td className="px-3 py-2 text-right">{fmtD(schedule.totalDepreciation)}</td>
                                        <td />
                                        <td className="px-3 py-2 text-right text-green-dark">VR : {fmtD(schedule.finalResidualValue)}</td>
                                        <td />
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400">Impossible de charger le tableau.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal nouvelle immobilisation */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-semibold text-charcoal">Nouvelle immobilisation</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-charcoal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Désignation *</label>
                <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex : Climatiseur Samsung chambre 3" className={inputCls + ' w-full'} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Catégorie *</label>
                  <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls + ' w-full'}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Méthode *</label>
                  <select required value={form.depreciationMethod} onChange={e => setForm(f => ({ ...f, depreciationMethod: e.target.value }))} className={inputCls + ' w-full'}>
                    {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date d'acquisition *</label>
                  <input type="date" required value={form.acquisitionDate} onChange={e => setForm(f => ({ ...f, acquisitionDate: e.target.value }))} className={inputCls + ' w-full'} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Coût d'acquisition (FCFA) *</label>
                  <input type="number" min="1" step="1" required value={form.acquisitionCost}
                    onChange={e => setForm(f => ({ ...f, acquisitionCost: e.target.value }))}
                    placeholder="0" className={inputCls + ' w-full'} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Durée (mois) *</label>
                  <input type="number" min="1" max="600" step="1" required value={form.usefulLifeMonths}
                    onChange={e => setForm(f => ({ ...f, usefulLifeMonths: e.target.value }))}
                    placeholder="Ex : 60 = 5 ans" className={inputCls + ' w-full'} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Valeur résiduelle</label>
                  <input type="number" min="0" step="1" value={form.residualValue}
                    onChange={e => setForm(f => ({ ...f, residualValue: e.target.value }))}
                    placeholder="0" className={inputCls + ' w-full'} />
                </div>
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
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Caisse (achat)</label>
                  <select value={form.cashRegisterId} onChange={e => setForm(f => ({ ...f, cashRegisterId: e.target.value }))} className={inputCls + ' w-full'}>
                    <option value="">— Aucune —</option>
                    {registers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description / Notes</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description complémentaire…" className={inputCls + ' w-full resize-none'} />
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
