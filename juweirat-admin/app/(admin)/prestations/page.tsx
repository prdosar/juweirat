'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { prestations } from '@/lib/api';
import type { PrestationAnnexeDto } from '@/lib/types';
import { Plus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';

const MODES: Record<string, { label: string; desc: string }> = {
  ParPersonneParNuit: { label: 'Par personne / nuit',  desc: 'Exemple : Petit-Déjeuner' },
  ParPersonne:        { label: 'Par personne (forfait)', desc: 'Exemple : Transfert aéroport' },
  Forfait:            { label: 'Forfait fixe',           desc: 'Exemple : Parking du séjour' },
};

const ICONS = ['coffee', 'car', 'utensils', 'wine', 'dumbbell', 'sparkles', 'ship', 'gift', 'baby', 'paw-print'];

const EMPTY_FORM = {
  nameFr: '', nameEn: '', icon: 'coffee',
  mode: 'ParPersonneParNuit', prixInclus: '', prixSeule: '', sortOrder: '0',
};

export default function PrestationsPage() {
  const [list, setList]       = useState<PrestationAnnexeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PrestationAnnexeDto | null>(null);
  const [form, setForm]       = useState({ ...EMPTY_FORM });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  async function load() {
    setLoading(true);
    const data = await prestations.getAll(false);
    setList(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setError('');
    setShowForm(true);
  }

  function openEdit(p: PrestationAnnexeDto) {
    setEditing(p);
    setForm({
      nameFr: p.nameFr, nameEn: p.nameEn, icon: p.icon ?? 'coffee',
      mode: p.mode, prixInclus: String(p.prixInclus), prixSeule: String(p.prixSeule),
      sortOrder: String(p.sortOrder),
    });
    setError('');
    setShowForm(true);
  }

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nameFr.trim()) { setError('Le nom français est requis.'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        nameFr: form.nameFr.trim(),
        nameEn: form.nameEn.trim() || form.nameFr.trim(),
        icon: form.icon || undefined,
        mode: form.mode,
        prixInclus: Number(form.prixInclus) || 0,
        prixSeule:  Number(form.prixSeule) || 0,
        sortOrder:  Number(form.sortOrder) || 0,
      };
      if (editing) {
        await prestations.update(editing.id, body);
      } else {
        await prestations.create(body);
      }
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: PrestationAnnexeDto) {
    await prestations.update(p.id, { isActive: !p.isActive });
    await load();
  }

  async function handleDelete(p: PrestationAnnexeDto) {
    if (!confirm(`Supprimer "${p.nameFr}" ? Cette action est irréversible.`)) return;
    await prestations.delete(p.id);
    await load();
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Prestations Annexes" />
      <div className="flex-1 p-6 space-y-5">

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Catalogue des services facturables proposés aux clients à la réservation.
          </p>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal/90 transition-colors"
          >
            <Plus size={15} /> Nouvelle prestation
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider">
              {editing ? `Modifier — ${editing.nameFr}` : 'Nouvelle prestation annexe'}
            </h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Nom français *</label>
                  <input required value={form.nameFr} onChange={e => set('nameFr', e.target.value)}
                    placeholder="Ex : Petit Déjeuner"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green/20 focus:border-green" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Nom anglais</label>
                  <input value={form.nameEn} onChange={e => set('nameEn', e.target.value)}
                    placeholder="Ex : Breakfast"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green/20 focus:border-green" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Mode de facturation</label>
                  <select value={form.mode} onChange={e => set('mode', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green/20 focus:border-green">
                    {Object.entries(MODES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400">{MODES[form.mode]?.desc}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Prix inclus (FCFA)</label>
                  <input type="number" min="0" step="100" value={form.prixInclus}
                    onChange={e => set('prixInclus', e.target.value)}
                    placeholder="3 500"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green/20 focus:border-green" />
                  <p className="text-xs text-gray-400">Tarif à la réservation</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Prix seule (FCFA)</label>
                  <input type="number" min="0" step="100" value={form.prixSeule}
                    onChange={e => set('prixSeule', e.target.value)}
                    placeholder="4 000"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green/20 focus:border-green" />
                  <p className="text-xs text-gray-400">Tarif en prestation seule</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Icône</label>
                  <select value={form.icon} onChange={e => set('icon', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green/20 focus:border-green">
                    {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Ordre d'affichage</label>
                  <input type="number" min="0" value={form.sortOrder}
                    onChange={e => set('sortOrder', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green/20 focus:border-green" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="bg-gold text-white font-bold px-6 py-2.5 rounded-lg text-sm hover:bg-gold/90 disabled:opacity-60 transition-colors">
                  {saving ? 'Enregistrement…' : (editing ? 'Mettre à jour' : 'Créer la prestation')}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-sm text-gray-500 hover:text-charcoal transition-colors">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5 text-left font-medium">Prestation</th>
                    <th className="px-5 py-3.5 text-left font-medium">Mode</th>
                    <th className="px-5 py-3.5 text-right font-medium">Prix inclus</th>
                    <th className="px-5 py-3.5 text-right font-medium">Prix seule</th>
                    <th className="px-5 py-3.5 text-center font-medium">Statut</th>
                    <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {list.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-charcoal">{p.nameFr}</div>
                        {p.nameEn !== p.nameFr && <div className="text-xs text-gray-400">{p.nameEn}</div>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{MODES[p.mode]?.label ?? p.mode}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-charcoal">
                        {p.prixInclus.toLocaleString('fr')} <span className="text-gray-400 font-normal">FCFA</span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-600">
                        {p.prixSeule.toLocaleString('fr')} <span className="text-gray-400">FCFA</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button onClick={() => toggleActive(p)} title={p.isActive ? 'Désactiver' : 'Activer'}>
                          {p.isActive
                            ? <CheckCircle2 size={18} className="text-green mx-auto" />
                            : <XCircle size={18} className="text-gray-300 mx-auto" />
                          }
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(p)}
                            className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => handleDelete(p)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-sm">
                        Aucune prestation créée. Cliquez sur «&nbsp;Nouvelle prestation&nbsp;» pour commencer.
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
