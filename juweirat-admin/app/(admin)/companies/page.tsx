'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { companies } from '@/lib/api';
import type { CompanyDto, PagedResult } from '@/lib/types';
import {
  Plus, Search, Building2, X, Pencil, Eye,
  Trash2, RotateCcw, ChevronLeft, ChevronRight,
  Tag, UserPlus,
} from 'lucide-react';

const PAGE_SIZE_DEFAULT = 10;
const ACTIVE_FILTERS: Array<{ value: 'all' | 'active' | 'inactive'; label: string }> = [
  { value: 'all',      label: 'Tous les statuts' },
  { value: 'active',   label: 'Actifs uniquement' },
  { value: 'inactive', label: 'Inactifs uniquement' },
];

export default function CompaniesPage() {
  const router = useRouter();

  const [page, setPage]                 = useState<PagedResult<CompanyDto> | null>(null);
  const [pageNumber, setPageNumber]     = useState(1);
  const [pageSize, setPageSize]         = useState(PAGE_SIZE_DEFAULT);
  const [search, setSearch]             = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState('');
  const [modalTarget, setModalTarget]   = useState<CompanyDto | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const isActiveParam = activeFilter === 'all' ? undefined : activeFilter === 'active';
      const res = await companies.getPaged({
        pageNumber, pageSize,
        search: search.trim() || undefined,
        sortBy: 'Name',
        isDescending: false,
        isActive: isActiveParam,
      });
      setPage(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg === 'Failed to fetch' ? "Impossible de joindre l'API. Vérifiez que le backend est démarré." : msg);
      setPage(null);
    } finally {
      setLoading(false);
    }
  }, [pageNumber, pageSize, search, activeFilter]);

  // Debounced reload on search/filter/page change
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // Reset page when search / filter / pageSize changes
  useEffect(() => { setPageNumber(1); }, [search, activeFilter, pageSize]);

  const items = page?.items ?? [];
  const totalPages = page?.totalPages ?? 0;
  const totalCount = page?.totalCount ?? 0;

  const rangeLabel = useMemo(() => {
    if (!page || totalCount === 0) return '0 résultat';
    const from = (page.pageNumber - 1) * page.pageSize + 1;
    const to   = Math.min(page.pageNumber * page.pageSize, page.totalCount);
    return `${from}–${to} sur ${page.totalCount}`;
  }, [page, totalCount]);

  async function toggleActive(c: CompanyDto) {
    try {
      await companies.update(c.id, { isActive: !c.isActive });
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg === 'Failed to fetch' ? "Impossible de joindre l'API. Vérifiez que le backend est démarré." : msg);
    }
  }

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
          <select
            value={activeFilter}
            onChange={e => setActiveFilter(e.target.value as typeof activeFilter)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40"
          >
            {ACTIVE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <button
            onClick={() => setModalTarget('new')}
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
                    <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(c => (
                    <tr key={c.id} className={`transition-colors ${c.isActive ? 'hover:bg-gray-50/70' : 'bg-gray-50/40 text-gray-500'}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.isActive ? 'bg-charcoal/5' : 'bg-charcoal/[.03]'}`}>
                            <Building2 size={15} className={c.isActive ? 'text-charcoal/70' : 'text-gray-400'} />
                          </div>
                          <span className={`font-semibold ${c.isActive ? 'text-charcoal' : 'text-gray-500'}`}>{c.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">{c.responsableNom || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3.5">{c.ville || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3.5">{c.phone || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3.5">{c.email || <span className="text-gray-300">—</span>}</td>
                      <td className={`px-5 py-3.5 text-right font-semibold ${c.isActive ? 'text-charcoal' : 'text-gray-400'}`}>
                        {c.clientCount}
                      </td>
                      <td className="px-5 py-3.5">
                        {c.isActive ? (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green/20 text-green-dark">Actif</span>
                        ) : (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-charcoal/10 text-charcoal/60">Inactif</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setModalTarget(c)}
                            title="Modifier"
                            className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => router.push(`/companies/${c.id}`)}
                            title="Détails"
                            className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => router.push(`/companies/${c.id}?tab=tarifs`)}
                            title="Éditer la liste de prix"
                            className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Tag size={15} />
                          </button>
                          <button
                            onClick={() => router.push(`/companies/${c.id}?tab=clients`)}
                            title="Ajouter un client"
                            className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <UserPlus size={15} />
                          </button>
                          {c.isActive ? (
                            <button
                              onClick={() => toggleActive(c)}
                              title="Désactiver"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleActive(c)}
                              title="Restaurer"
                              className="p-1.5 text-gray-400 hover:text-green-dark hover:bg-green/10 rounded-lg transition-colors"
                            >
                              <RotateCcw size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-gray-400 text-sm">
                        Aucune compagnie trouvée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination footer */}
          {!loading && page && totalCount > 0 && (
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-gray-100 text-xs text-gray-500 flex-wrap">
              <div className="flex items-center gap-3">
                <span>{rangeLabel}</span>
                <label className="flex items-center gap-1.5">
                  <span className="text-gray-400">Par page :</span>
                  <select
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                    className="border border-gray-200 rounded px-1.5 py-0.5 bg-white text-charcoal focus:outline-none focus:ring-1 focus:ring-green/30"
                  >
                    {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={!page.hasPreviousPage}
                  onClick={() => setPageNumber(n => Math.max(1, n - 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  aria-label="Page précédente"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="px-2 font-medium text-charcoal">
                  Page {page.pageNumber} / {totalPages}
                </span>
                <button
                  disabled={!page.hasNextPage}
                  onClick={() => setPageNumber(n => Math.min(totalPages, n + 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  aria-label="Page suivante"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalTarget && (
        <CompanyModal
          initial={modalTarget === 'new' ? null : modalTarget}
          onClose={() => setModalTarget(null)}
          onSaved={async () => { setModalTarget(null); await load(); }}
        />
      )}
    </div>
  );
}

/* ─────────────────────── Modal ─────────────────────── */
function CompanyModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: CompanyDto | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const isEdit = initial !== null;
  const [form, setForm] = useState({
    name:           initial?.name           ?? '',
    responsableNom: initial?.responsableNom ?? '',
    phone:          initial?.phone          ?? '',
    email:          initial?.email          ?? '',
    adresse:        initial?.adresse        ?? '',
    ville:          initial?.ville          ?? '',
    notes:          initial?.notes          ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  // Preload all companies to detect duplicate names client-side
  const [allCompanies, setAllCompanies] = useState<CompanyDto[]>([]);
  useEffect(() => {
    companies.getAll().then(setAllCompanies).catch(() => setAllCompanies([]));
  }, []);

  // Detect duplicate name (case-insensitive, trim), excluding current company when editing
  const trimmedName = form.name.trim();
  const nameLower = trimmedName.toLowerCase();
  const duplicate = trimmedName.length > 0 && allCompanies.some(c =>
    c.name.trim().toLowerCase() === nameLower && c.id !== initial?.id
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est obligatoire.'); return; }
    if (duplicate) { setError(`Une compagnie nommée « ${trimmedName} » existe déjà.`); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        name:           form.name.trim(),
        responsableNom: form.responsableNom || undefined,
        phone:          form.phone || undefined,
        email:          form.email || undefined,
        adresse:        form.adresse || undefined,
        ville:          form.ville || undefined,
        notes:          form.notes || undefined,
      };
      if (isEdit && initial) {
        await companies.update(initial.id, body);
      } else {
        await companies.create(body);
      }
      await onSaved();
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
              <h2 className="text-sm font-bold text-charcoal">
                {isEdit ? `Modifier — ${initial?.name}` : 'Nouvelle compagnie'}
              </h2>
              <p className="text-xs text-gray-400">
                {isEdit ? 'Modifier la fiche de la compagnie' : 'Créer une fiche entreprise partenaire'}
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

            <div>
              <label className={labelCls}>Nom de la compagnie *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex : Total Togo SA"
                className={`${inputCls} ${duplicate ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : ''}`}
                autoFocus
              />
              {duplicate && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <span className="text-red-500">⚠</span>
                  Ce nom est déjà utilisé par une autre compagnie.
                </p>
              )}
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
                  placeholder="+228 70 79 08 89"
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
              disabled={saving || duplicate || !form.name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={duplicate ? `Nom déjà utilisé — choisissez un autre nom` : undefined}
            >
              {saving ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Créer la compagnie')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
