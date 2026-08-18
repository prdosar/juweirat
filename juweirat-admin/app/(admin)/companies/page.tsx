'use client';

import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import { companies } from '@/lib/api';
import type { CompanyDto } from '@/lib/types';
import { Plus, Search, Building2, X } from 'lucide-react';

export default function CompaniesPage() {
  const [list, setList]         = useState<CompanyDto[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setList(await companies.getAll());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg === 'Failed to fetch' ? "Impossible de joindre l'API. Vérifiez que le backend est démarré." : msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = list.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q)
      || (c.responsableNom ?? '').toLowerCase().includes(q)
      || (c.ville ?? '').toLowerCase().includes(q)
      || (c.email ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Compagnies" />
      <div className="flex-1 p-6 space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nom, responsable, ville, email…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40 bg-white"
            />
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-800 transition-colors ml-auto"
          >
            <Plus size={15} /> Nouvelle compagnie
          </button>
        </div>

        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {loadError}
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
                    <th className="px-5 py-3.5 text-left font-medium">Compagnie</th>
                    <th className="px-5 py-3.5 text-left font-medium">Responsable</th>
                    <th className="px-5 py-3.5 text-left font-medium">Ville</th>
                    <th className="px-5 py-3.5 text-left font-medium">Téléphone</th>
                    <th className="px-5 py-3.5 text-left font-medium">Email</th>
                    <th className="px-5 py-3.5 text-right font-medium">Clients</th>
                    <th className="px-5 py-3.5 text-left font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(c => (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/companies/${c.id}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-charcoal/5 flex items-center justify-center shrink-0">
                            <Building2 size={15} className="text-charcoal/70" />
                          </div>
                          <span className="font-semibold text-charcoal">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{c.responsableNom || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-gray-500">{c.ville || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-gray-500">{c.phone || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-gray-500">{c.email || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-charcoal">
                        {c.clientCount}
                      </td>
                      <td className="px-5 py-3.5">
                        {c.isActive ? (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green/20 text-green-dark">Actif</span>
                        ) : (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-charcoal/10 text-charcoal/60">Inactif</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                        Aucune compagnie
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <NewCompanyModal
          onClose={() => setModalOpen(false)}
          onCreated={async () => { setModalOpen(false); await load(); }}
        />
      )}
    </div>
  );
}

/* ─────────────────────── Modal ─────────────────────── */
function NewCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void | Promise<void> }) {
  const [form, setForm] = useState({
    name: '', responsableNom: '', phone: '', email: '', adresse: '', ville: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est obligatoire.'); return; }
    setSaving(true);
    setError('');
    try {
      await companies.create({
        name: form.name.trim(),
        responsableNom: form.responsableNom || undefined,
        phone:          form.phone || undefined,
        email:          form.email || undefined,
        adresse:        form.adresse || undefined,
        ville:          form.ville || undefined,
        notes:          form.notes || undefined,
      });
      await onCreated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg === 'Failed to fetch' ? "Impossible de joindre l'API. Vérifiez que le backend est démarré." : msg);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';
  const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green/15 flex items-center justify-center">
              <Building2 size={16} className="text-green-dark" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-charcoal">Nouvelle compagnie</h2>
              <p className="text-xs text-gray-400">Créer une fiche entreprise partenaire</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-charcoal transition-colors flex items-center justify-center"
            aria-label="Fermer"
          ><X size={16} /></button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className={labelCls}>Nom de la compagnie *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex : Total Togo SA"
                className={inputCls}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Responsable</label>
                <input
                  value={form.responsableNom}
                  onChange={e => setForm(f => ({ ...f, responsableNom: e.target.value }))}
                  placeholder="Nom du contact"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Téléphone</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+228 90 00 00 00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="contact@societe.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Ville</label>
                <input
                  value={form.ville}
                  onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                  placeholder="Lomé"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Adresse</label>
              <input
                value={form.adresse}
                onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                placeholder="Rue / Quartier"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Notes</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Remarques internes…"
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          {/* Modal footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-100 bg-gray-50/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-charcoal transition-colors"
            >Annuler</button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-60"
            >
              {saving ? 'Enregistrement…' : 'Créer la compagnie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

