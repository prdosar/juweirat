'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PaginationControl from '@/components/PaginationControl';
import DuplicateClientDialog from '@/components/DuplicateClientDialog';
import { clients, companies as companiesApi } from '@/lib/api';
import type { ClientDto, CompanyDto, PagedResult } from '@/lib/types';
import {
  Plus, Search, Building2, X, PencilLine, Eye, BedDouble, Sparkles,
} from 'lucide-react';

const PAGE_SIZE_DEFAULT = 10;
const COUNTRIES  = ["Côte d'Ivoire", 'Sénégal', 'Burkina Faso', 'France', 'Togo', 'Bénin', 'Ghana', 'Autre'];
const DOC_TYPES  = ['Passeport', "Carte d'identité", 'Carte de séjour', 'Permis de conduire'];

const ACTIVITY_FILTERS: Array<{ value: 'all' | 'with' | 'without'; label: string }> = [
  { value: 'all',     label: 'Tous les clients' },
  { value: 'with',    label: 'Avec réservations' },
  { value: 'without', label: 'Sans réservation' },
];

/* Red asterisk on required fields */
function Req({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span>
      {children}
      {required && <span className="text-red-600 font-bold ml-0.5">*</span>}
    </span>
  );
}

export default function ClientsPage() {
  const router = useRouter();

  const [paged, setPaged]         = useState<PagedResult<ClientDto> | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize]     = useState(PAGE_SIZE_DEFAULT);
  const [search, setSearch]         = useState('');
  const [activity, setActivity]     = useState<'all' | 'with' | 'without'>('all');

  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState('');
  const [modalTarget, setModalTarget] = useState<ClientDto | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await clients.getPaged({
        pageNumber, pageSize,
        search: search.trim() || undefined,
        sortBy: 'LastName',
        isDescending: false,
        hasReservations: activity === 'with' ? true : activity === 'without' ? false : undefined,
      });
      setPaged(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg === 'Failed to fetch' ? "Impossible de joindre l'API. Vérifiez que le backend est démarré." : msg);
      setPaged(null);
    } finally {
      setLoading(false);
    }
  }, [pageNumber, pageSize, search, activity]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => { setPageNumber(1); }, [search, activity, pageSize]);

  const items = paged?.items ?? [];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Clients" />
      <div className="flex-1 p-6 space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nom, email, téléphone, pièce, ville…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40 bg-white"
            />
          </div>
          <select
            value={activity}
            onChange={e => setActivity(e.target.value as typeof activity)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40"
          >
            {ACTIVITY_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <button
            onClick={() => setModalTarget('new')}
            className="flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-800 transition-colors ml-auto"
          >
            <Plus size={15} /> Nouveau client
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
                    <th className="px-5 py-3.5 text-left font-medium">Client</th>
                    <th className="px-5 py-3.5 text-left font-medium">Téléphone</th>
                    <th className="px-5 py-3.5 text-left font-medium">Email</th>
                    <th className="px-5 py-3.5 text-left font-medium">Ville / Pays</th>
                    <th className="px-5 py-3.5 text-left font-medium">Pièce</th>
                    <th className="px-5 py-3.5 text-right font-medium">Résas</th>
                    <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-charcoal text-white flex items-center justify-center shrink-0 shadow-sm">
                            <span className="text-[11px] font-bold">
                              {c.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-charcoal truncate">{c.fullName}</div>
                            {c.companyName && (
                              <div className="text-xs text-blue-600 font-medium truncate flex items-center gap-1 mt-0.5">
                                <Building2 size={10} />
                                {c.companyName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{c.phone || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-gray-500 max-w-[220px] truncate">{c.email || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-gray-500">
                        {c.city || c.country ? (
                          <span>
                            {c.city}{c.city && c.country ? ' · ' : ''}{c.country}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">
                        {c.documentType || c.documentNumber ? (
                          <div>
                            <div className="text-xs text-gray-500">{c.documentType || '—'}</div>
                            {c.documentNumber && <div className="text-xs font-mono text-charcoal">{c.documentNumber}</div>}
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-charcoal">
                        {c.totalReservations}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setModalTarget(c)}
                            title="Modifier"
                            className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <PencilLine size={15} />
                          </button>
                          <button
                            onClick={() => router.push(`/clients/${c.id}`)}
                            title="Détails"
                            className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => router.push(`/reservations/new?clientId=${c.id}`)}
                            title="Ajouter une réservation"
                            className="p-1.5 text-gray-400 hover:text-green-dark hover:bg-green/10 rounded-lg transition-colors"
                          >
                            <BedDouble size={15} />
                          </button>
                          <button
                            onClick={() => router.push(`/ventes-directes?clientId=${c.id}`)}
                            title="Ajouter une prestation"
                            className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Sparkles size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                        Aucun client trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && paged && (
            <PaginationControl
              pageNumber={paged.pageNumber}
              pageSize={paged.pageSize}
              totalCount={paged.totalCount}
              totalPages={paged.totalPages}
              onPageChange={setPageNumber}
              onPageSizeChange={size => { setPageSize(size); setPageNumber(1); }}
              isLoading={loading}
            />
          )}
        </div>
      </div>

      {modalTarget && (
        <ClientModal
          initial={modalTarget === 'new' ? null : modalTarget}
          onClose={() => setModalTarget(null)}
          onSaved={async () => { setModalTarget(null); await load(); }}
        />
      )}
    </div>
  );
}

/* ─────────────────────── Client Modal (create / edit) ─────────────────────── */
function ClientModal({
  initial, onClose, onSaved,
}: {
  initial: ClientDto | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const isEdit = initial !== null;

  const [form, setForm] = useState({
    firstName:      initial?.firstName ?? '',
    lastName:       initial?.lastName ?? '',
    email:          initial?.email ?? '',
    phone:          initial?.phone ?? '',
    nationality:    initial?.nationality ?? '',
    documentType:   initial?.documentType ?? '',
    documentNumber: initial?.documentNumber ?? '',
    city:           initial?.city ?? '',
    country:        initial?.country ?? '',
    notes:          initial?.notes ?? '',
    companyId:      initial?.companyId ?? 0,
  });
  const [companyList, setCompanyList] = useState<CompanyDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [duplicates, setDuplicates] = useState<ClientDto[] | null>(null); // null = pas encore checké

  useEffect(() => {
    companiesApi.getAll().then(setCompanyList).catch(() => setCompanyList([]));
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  async function submitClient(force: boolean) {
    setSaving(true); setError('');
    try {
      const body = {
        firstName:      form.firstName.trim(),
        lastName:       form.lastName.trim(),
        email:          form.email.trim() || null,
        phone:          form.phone.trim() || null,
        nationality:    form.nationality.trim() || null,
        documentType:   form.documentType || null,
        documentNumber: form.documentNumber.trim() || null,
        city:           form.city.trim() || null,
        country:        form.country || null,
        notes:          form.notes.trim() || null,
        companyId:      form.companyId > 0 ? form.companyId : null,
      };
      if (isEdit && initial) {
        await clients.update(initial.id, body);
      } else {
        await clients.create(body);
      }
      await onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg === 'Failed to fetch' ? "Impossible de joindre l'API. Vérifiez que le backend est démarré." : msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim()) { setError('Le prénom est obligatoire.'); return; }
    if (!form.lastName.trim())  { setError('Le nom est obligatoire.'); return; }

    // Vérification homonymes uniquement à la création (pas en édition)
    if (!isEdit) {
      setSaving(true); setError('');
      try {
        const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim().toLowerCase();
        const results = await clients.getAll(fullName);
        const matches = results.filter(c => c.fullName.trim().toLowerCase() === fullName);
        if (matches.length > 0) {
          setDuplicates(matches);
          setSaving(false);
          return; // affiche le dialog de confirmation
        }
      } catch { /* si l'API échoue, on tente la création (le backend ne rejettera pas les homonymes) */ }
    }

    await submitClient(false);
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';
  const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green/15 flex items-center justify-center">
              <span className="text-[11px] font-bold text-green-dark">
                {isEdit
                  ? (initial?.fullName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '?')
                  : '+'}
              </span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-charcoal">
                {isEdit ? `Modifier — ${initial?.fullName}` : 'Nouveau client'}
              </h2>
              <p className="text-xs text-gray-400">
                {isEdit ? 'Modifier la fiche client' : 'Créer une nouvelle fiche client'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-charcoal transition-colors flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}><Req required>Prénom</Req></label>
                <input
                  autoFocus
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  placeholder="Jean"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}><Req required>Nom</Req></label>
                <input
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  placeholder="Dupont"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}><Req>Téléphone</Req></label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+228 90 00 00 00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}><Req>E-mail</Req></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jean@exemple.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}><Req>Nationalité</Req></label>
                <input
                  value={form.nationality}
                  onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}
                  placeholder="Togolaise"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}><Req>Pays</Req></label>
                <select
                  value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">— Sélectionner —</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}><Req>Ville</Req></label>
                <input
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Lomé"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}><Req>Type de pièce</Req></label>
                <select
                  value={form.documentType}
                  onChange={e => setForm(f => ({ ...f, documentType: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">— Sélectionner —</option>
                  {DOC_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}><Req>N° de pièce</Req></label>
                <input
                  value={form.documentNumber}
                  onChange={e => setForm(f => ({ ...f, documentNumber: e.target.value }))}
                  placeholder="AB123456"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}><Req>Compagnie de rattachement</Req></label>
              <select
                value={form.companyId}
                onChange={e => setForm(f => ({ ...f, companyId: Number(e.target.value) }))}
                className={inputCls}
                disabled={companyList.length === 0}
              >
                <option value={0}>— Aucune compagnie —</option>
                {companyList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {form.companyId > 0 && (
                <p className="text-xs text-green-dark font-medium mt-1">
                  Ce client bénéficiera du tarif entreprise associé à sa compagnie.
                </p>
              )}
            </div>

            <div>
              <label className={labelCls}><Req>Notes internes</Req></label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Observations, préférences…"
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-100 bg-gray-50/50">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-charcoal transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-60">
              {saving ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Créer le client')}
            </button>
          </div>
        </form>
      </div>

      {duplicates && (
        <DuplicateClientDialog
          duplicates={duplicates}
          firstName={form.firstName}
          lastName={form.lastName}
          saving={saving}
          onCancel={() => setDuplicates(null)}
          onConfirm={async () => { setDuplicates(null); await submitClient(true); }}
        />
      )}
    </div>
  );
}

