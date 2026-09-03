'use client';

import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import { suppliers } from '@/lib/api';
import type { SupplierDto } from '@/lib/types';
import { Building2, Plus, X, Pencil, UserMinus } from 'lucide-react';

function fmt(n: number): string { return Math.round(n).toLocaleString('fr-FR'); }

const emptyForm = { name: '', phone: '', email: '', address: '' };

export default function FournisseursPage() {
  const [list, setList] = useState<SupplierDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SupplierDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await suppliers.getAll({ search: search || undefined, includeInactive });
      setList(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [search, includeInactive]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(s: SupplierDto) {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '' });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name:    form.name.trim(),
        phone:   form.phone.trim() || undefined,
        email:   form.email.trim() || undefined,
        address: form.address.trim() || undefined,
      };
      if (editing) {
        await suppliers.update(editing.id, body);
      } else {
        await suppliers.create(body);
      }
      setShowModal(false);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(s: SupplierDto) {
    if (!confirm(`Désactiver le fournisseur « ${s.name} » ? Il ne sera plus proposé dans les nouvelles charges.`)) return;
    try {
      await suppliers.deactivate(s.id);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur.');
    }
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Fournisseurs" />
      <div className="flex-1 p-6 space-y-4">

        {/* Filtres */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <input type="text" placeholder="Rechercher un fournisseur…" value={search}
              onChange={e => setSearch(e.target.value)} className={inputCls + ' flex-1 min-w-48'} />
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)}
                className="rounded text-green-dark" />
              Inclure inactifs
            </label>
            <button type="button" onClick={() => openCreate()}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal text-white rounded-lg hover:bg-charcoal-800">
              <Plus size={13} /> Nouveau fournisseur
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <Building2 size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aucun fournisseur enregistré.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/60">
                  <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left font-medium">Nom</th>
                    <th className="px-4 py-2.5 text-left font-medium">Téléphone</th>
                    <th className="px-4 py-2.5 text-left font-medium">Email</th>
                    <th className="px-4 py-2.5 text-left font-medium">Adresse</th>
                    <th className="px-4 py-2.5 text-right font-medium">Charges</th>
                    <th className="px-4 py-2.5 text-center font-medium">Statut</th>
                    <th className="px-4 py-2.5 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {list.map(s => (
                    <tr key={s.id} className={`hover:bg-gray-50/60 ${!s.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2.5 font-medium text-charcoal">{s.name}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{s.phone ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{s.email ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 max-w-xs truncate">{s.address ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{fmt(s.expenseCount)}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {s.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(s)} title="Modifier"
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                            <Pencil size={13} />
                          </button>
                          {s.isActive && (
                            <button onClick={() => handleDeactivate(s)} title="Désactiver"
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                              <UserMinus size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal création / édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-charcoal">{editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-charcoal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nom *</label>
                <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex : CEET - Compagnie Énergie Électrique" className={inputCls + ' w-full'} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Téléphone</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+228 90 00 00 00" className={inputCls + ' w-full'} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="contact@exemple.com" className={inputCls + ' w-full'} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Adresse</label>
                <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Quartier, ville…" className={inputCls + ' w-full'} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-charcoal">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 text-sm bg-charcoal text-white rounded-lg hover:bg-charcoal-800 disabled:opacity-50">
                  {saving ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
