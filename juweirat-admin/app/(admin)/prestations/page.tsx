'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { prestations } from '@/lib/api';
import type { PrestationAnnexeDto } from '@/lib/types';
import { Plus, Search, CheckCircle2, XCircle, Trash2, X, Sparkles, Eye, PencilLine } from 'lucide-react';

const MODES: Record<string, { label: string; desc: string }> = {
  ParPersonneParNuit: { label: 'Par personne / nuit',    desc: 'Exemple : Petit-Déjeuner' },
  ParPersonne:        { label: 'Par personne (forfait)', desc: 'Exemple : Transfert aéroport' },
  Forfait:            { label: 'Forfait fixe',           desc: 'Exemple : Parking du séjour' },
};

const ICONS = ['coffee', 'car', 'utensils', 'wine', 'dumbbell', 'sparkles', 'ship', 'gift', 'baby', 'paw-print'];

export default function PrestationsPage() {
  const router = useRouter();
  const [list, setList]       = useState<PrestationAnnexeDto[]>([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modalTarget, setModalTarget] = useState<PrestationAnnexeDto | 'new' | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setLoadError('');
    try {
      setList(await prestations.getAll(false));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg === 'Failed to fetch' ? "Impossible de joindre l'API. Vérifiez que le backend est démarré." : msg);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = list.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.nameFr.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q);
  });

  // Optimistic update: apply the saved item to the local list immediately (no visible reload).
  function upsertLocal(saved: PrestationAnnexeDto) {
    setList(prev => {
      const idx = prev.findIndex(p => p.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = prev.slice();
      next[idx] = saved;
      return next;
    });
  }

  async function toggleActive(p: PrestationAnnexeDto) {
    // Optimistic UI: flip immediately, roll back on failure.
    const optimistic = { ...p, isActive: !p.isActive };
    upsertLocal(optimistic);
    try {
      const updated = await prestations.update(p.id, { isActive: !p.isActive });
      upsertLocal(updated);
    } catch {
      upsertLocal(p); // rollback
    }
  }

  async function handleDelete(p: PrestationAnnexeDto) {
    if (!confirm(`Supprimer "${p.nameFr}" ? Cette action est irréversible.`)) return;
    setList(prev => prev.filter(x => x.id !== p.id)); // optimistic remove
    try { await prestations.delete(p.id); } catch { await load({ silent: true }); /* rollback via reload */ }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Prestations Annexes" />
      <div className="flex-1 p-6 space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nom français ou anglais…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40 bg-white"
            />
          </div>
          <button
            onClick={() => setModalTarget('new')}
            className="flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-800 transition-colors ml-auto"
          >
            <Plus size={15} /> Nouvelle prestation
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
                    <th className="px-5 py-3.5 text-left font-medium">Prestation</th>
                    <th className="px-5 py-3.5 text-left font-medium">Mode</th>
                    <th className="px-5 py-3.5 text-right font-medium">Prix inclus</th>
                    <th className="px-5 py-3.5 text-right font-medium">Prix seule</th>
                    <th className="px-5 py-3.5 text-center font-medium">Statut</th>
                    <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p => (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                      onClick={() => router.push(`/prestations/${p.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-charcoal/5 flex items-center justify-center shrink-0">
                            <Sparkles size={14} className="text-charcoal/70" />
                          </div>
                          <div>
                            <div className="font-semibold text-charcoal">{p.nameFr}</div>
                            {p.nameEn && p.nameEn !== p.nameFr && (
                              <div className="text-xs text-gray-400">{p.nameEn}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{MODES[p.mode]?.label ?? p.mode}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-charcoal">
                        {p.prixInclus.toLocaleString('fr')} <span className="text-gray-400 font-normal">FCFA</span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-600">
                        {p.prixSeule.toLocaleString('fr')} <span className="text-gray-400">FCFA</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={e => { e.stopPropagation(); toggleActive(p); }}
                          title={p.isActive ? 'Désactiver' : 'Activer'}
                          className="inline-flex"
                        >
                          {p.isActive
                            ? <CheckCircle2 size={18} className="text-green" />
                            : <XCircle size={18} className="text-gray-300" />
                          }
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); router.push(`/prestations/${p.id}`); }}
                            title="Détails"
                            className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setModalTarget(p); }}
                            title="Modifier"
                            className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <PencilLine size={15} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(p); }}
                            title="Supprimer"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-sm">
                        Aucune prestation trouvée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalTarget && (
        <PrestationModal
          initial={modalTarget === 'new' ? null : modalTarget}
          onClose={() => setModalTarget(null)}
          onSaved={(saved) => { upsertLocal(saved); setModalTarget(null); }}
        />
      )}
    </div>
  );
}

/* ─────────────────────── Modal ─────────────────────── */
function PrestationModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: PrestationAnnexeDto | null;
  onClose: () => void;
  onSaved: (saved: PrestationAnnexeDto) => void;
}) {
  const isEdit = initial !== null;

  const [form, setForm] = useState({
    nameFr:     initial?.nameFr     ?? '',
    nameEn:     initial?.nameEn     ?? '',
    icon:       initial?.icon       ?? 'coffee',
    mode:       initial?.mode       ?? 'ParPersonneParNuit',
    prixInclus: initial ? String(initial.prixInclus) : '',
    prixSeule:  initial ? String(initial.prixSeule)  : '',
    sortOrder:  initial ? String(initial.sortOrder)  : '0',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  // Preload all prestations to detect duplicate names client-side
  const [allPrestations, setAllPrestations] = useState<PrestationAnnexeDto[]>([]);
  useEffect(() => {
    prestations.getAll(false).then(setAllPrestations).catch(() => setAllPrestations([]));
  }, []);

  const trimmedName = form.nameFr.trim();
  const nameLower = trimmedName.toLowerCase();
  const duplicate = trimmedName.length > 0 && allPrestations.some(p =>
    p.nameFr.trim().toLowerCase() === nameLower && p.id !== initial?.id
  );

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nameFr.trim()) { setError('Le nom français est requis.'); return; }
    if (duplicate) { setError(`Une prestation nommée « ${trimmedName} » existe déjà.`); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        nameFr:     form.nameFr.trim(),
        nameEn:     form.nameEn.trim() || form.nameFr.trim(),
        icon:       form.icon || undefined,
        mode:       form.mode,
        prixInclus: Number(form.prixInclus) || 0,
        prixSeule:  Number(form.prixSeule) || 0,
        sortOrder:  Number(form.sortOrder) || 0,
      };
      const saved = isEdit && initial
        ? await prestations.update(initial.id, body)
        : await prestations.create(body);
      onSaved(saved);
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
              <Sparkles size={16} className="text-green-dark" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-charcoal">
                {isEdit ? `Modifier — ${initial?.nameFr}` : 'Nouvelle prestation annexe'}
              </h2>
              <p className="text-xs text-gray-400">
                {isEdit ? 'Ajuster les paramètres de la prestation' : 'Ajouter un service facturable au catalogue'}
              </p>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nom français *</label>
                <input
                  value={form.nameFr}
                  onChange={e => set('nameFr', e.target.value)}
                  placeholder="Ex : Petit-déjeuner"
                  className={`${inputCls} ${duplicate ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : ''}`}
                  autoFocus
                />
                {duplicate && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <span className="text-red-500">⚠</span>
                    Ce nom est déjà utilisé par une autre prestation.
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>Nom anglais</label>
                <input
                  value={form.nameEn}
                  onChange={e => set('nameEn', e.target.value)}
                  placeholder="Ex : Breakfast"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Mode de facturation</label>
              <select value={form.mode} onChange={e => set('mode', e.target.value)} className={inputCls}>
                {Object.entries(MODES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">{MODES[form.mode]?.desc}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Prix inclus (FCFA)</label>
                <input
                  type="number" min="0" step="100"
                  value={form.prixInclus}
                  onChange={e => set('prixInclus', e.target.value)}
                  placeholder="3 500"
                  className={inputCls}
                />
                <p className="text-xs text-gray-400 mt-1">Tarif à la réservation</p>
              </div>
              <div>
                <label className={labelCls}>Prix seule (FCFA)</label>
                <input
                  type="number" min="0" step="100"
                  value={form.prixSeule}
                  onChange={e => set('prixSeule', e.target.value)}
                  placeholder="4 000"
                  className={inputCls}
                />
                <p className="text-xs text-gray-400 mt-1">Tarif en prestation seule</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Icône</label>
                <select value={form.icon} onChange={e => set('icon', e.target.value)} className={inputCls}>
                  {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Ordre d'affichage</label>
                <input
                  type="number" min="0"
                  value={form.sortOrder}
                  onChange={e => set('sortOrder', e.target.value)}
                  className={inputCls}
                />
              </div>
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
              disabled={saving || duplicate || !form.nameFr.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={duplicate ? `Nom déjà utilisé — choisissez un autre nom` : undefined}
            >
              {saving ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Créer la prestation')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
