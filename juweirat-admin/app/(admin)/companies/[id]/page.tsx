'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { companies, categories as categoriesApi, clients as clientsApi } from '@/lib/api';
import type { ClientDto, CompanyDetailDto, CompanyStayDto, RoomCategoryDto } from '@/lib/types';
import DuplicateClientDialog from '@/components/DuplicateClientDialog';
import ClientModal from '@/components/ClientModal';

const COUNTRIES  = ["Côte d'Ivoire", 'Sénégal', 'Burkina Faso', 'France', 'Togo', 'Bénin', 'Ghana', 'Autre'];
const DOC_TYPES  = ['Passeport', "Carte d'identité", 'Carte de séjour', 'Permis de conduire'];

/* Small helper to render a form label with an optional red asterisk for required fields. */
function Req({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span>
      {children}
      {required && <span className="text-red-600 font-bold ml-0.5">*</span>}
    </span>
  );
}
import {
  Building2, Phone, Mail, MapPin, User, ArrowLeft,
  Plus, Trash2, Save, PencilLine, Users, Tag, CalendarRange,
  Search, X, RotateCcw,
} from 'lucide-react';

type Tab = 'info' | 'clients' | 'stays' | 'tarifs';
const TABS: [Tab, string, React.ComponentType<{ size?: number; className?: string }>][] = [
  ['info',    'Informations', Building2],
  ['clients', 'Clients',      Users],
  ['stays',   'Séjours',      CalendarRange],
  ['tarifs',  'Tarifs',       Tag],
];

function iso(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function fmtDate(d: string) {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  Pending:    { label: 'En attente', cls: 'bg-amber-100 text-amber-800'      },
  Confirmed:  { label: 'Confirmée',  cls: 'bg-green/20 text-green-dark'      },
  CheckedIn:  { label: 'Arrivé',     cls: 'bg-green text-white'              },
  CheckedOut: { label: 'Parti',      cls: 'bg-charcoal/10 text-charcoal/60'  },
  Cancelled:  { label: 'Annulée',    cls: 'bg-red-100 text-red-700'          },
  NoShow:     { label: 'No Show',    cls: 'bg-charcoal/15 text-charcoal/50'  },
};

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = Number(id);

  const initialTab: Tab = ((): Tab => {
    const q = searchParams.get('tab');
    return q === 'clients' || q === 'tarifs' || q === 'stays' ? q : 'info';
  })();

  const [company, setCompany] = useState<CompanyDetailDto | null>(null);
  const [cats, setCats]       = useState<RoomCategoryDto[]>([]);
  const [tab, setTab]         = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [c, catList] = await Promise.all([
        companies.getById(companyId),
        categoriesApi.getAll(),
      ]);
      setCompany(c);
      setCats(catList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg === 'Failed to fetch' ? "Impossible de joindre l'API. Vérifiez que le backend est démarré." : msg);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Compagnie" />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
      </div>
    </div>
  );

  if (loadError || !company) return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Compagnie" />
      <div className="flex-1 p-6">
        <button onClick={() => router.push('/companies')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal mb-4">
          <ArrowLeft size={14} /> Retour
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {loadError || 'Compagnie introuvable.'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Compagnie" />
      <div className="flex-1 p-6 space-y-4">
        <button onClick={() => router.push('/companies')} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-charcoal">
          <ArrowLeft size={13} /> Retour aux compagnies
        </button>

        {/* Company header card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green/15 flex items-center justify-center shrink-0">
            <Building2 size={22} className="text-green-dark" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-charcoal truncate">{company.name}</h1>
              {company.isActive ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green/20 text-green-dark">Actif</span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-charcoal/10 text-charcoal/60">Inactif</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {company.clientCount} client{company.clientCount !== 1 ? 's' : ''} · Créée le {fmtDate(company.createdAt)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <nav className="flex border-b border-gray-100">
            {TABS.map(([t, label, Icon]) => {
              const on = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                    on ? 'text-green-dark border-b-2 border-green -mb-px' : 'text-gray-400 hover:text-charcoal'
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="p-5">
            {tab === 'info'    && <InfoTab company={company} onSaved={load} />}
            {tab === 'clients' && <ClientsTab company={company} onChanged={load} />}
            {tab === 'stays'   && <StaysTab companyId={companyId} />}
            {tab === 'tarifs'  && <TarifsTab company={company} cats={cats} onChanged={load} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── INFO TAB ──────────────────── */
function InfoTab({ company, onSaved }: { company: CompanyDetailDto; onSaved: () => void | Promise<void> }) {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name:           company.name,
    responsableNom: company.responsableNom ?? '',
    phone:          company.phone ?? '',
    email:          company.email ?? '',
    adresse:        company.adresse ?? '',
    ville:          company.ville ?? '',
    notes:          company.notes ?? '',
    isActive:       company.isActive,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est obligatoire.'); return; }
    setSaving(true); setError('');
    try {
      await companies.update(company.id, {
        name:           form.name.trim(),
        responsableNom: form.responsableNom || undefined,
        phone:          form.phone || undefined,
        email:          form.email || undefined,
        adresse:        form.adresse || undefined,
        ville:          form.ville || undefined,
        notes:          form.notes || undefined,
        isActive:       form.isActive,
      });
      setEditMode(false);
      await onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  if (editMode) {
    const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';
    const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';
    return (
      <form onSubmit={handleSave} className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">{error}</div>}
        <div>
          <label className={labelCls}>Nom *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Responsable</label>
            <input value={form.responsableNom} onChange={e => setForm(f => ({ ...f, responsableNom: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Téléphone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ville</label>
            <input value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Adresse</label>
          <input value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputCls} resize-none`} />
        </div>
        <label className="flex items-center gap-2 text-sm text-charcoal">
          <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="accent-green" />
          Compagnie active
        </label>
        <div className="flex items-center gap-2 pt-1">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-60">
            <Save size={14} />
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button type="button" onClick={() => setEditMode(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-charcoal transition-colors">
            Annuler
          </button>
        </div>
      </form>
    );
  }

  const rows: { label: string; value: string | null; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { label: 'Responsable', value: company.responsableNom, Icon: User },
    { label: 'Téléphone',   value: company.phone,          Icon: Phone },
    { label: 'Email',       value: company.email,          Icon: Mail },
    { label: 'Ville',       value: company.ville,          Icon: MapPin },
    { label: 'Adresse',     value: company.adresse,        Icon: MapPin },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map(({ label, value, Icon }) => (
          <div key={label} className="bg-gray-50/60 rounded-lg p-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Icon size={11} /> {label}
            </p>
            <p className="text-sm text-charcoal">{value || <span className="text-gray-300">Non renseigné</span>}</p>
          </div>
        ))}
      </div>
      {company.notes && (
        <div className="bg-gray-50/60 rounded-lg p-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes internes</p>
          <p className="text-sm text-charcoal whitespace-pre-wrap">{company.notes}</p>
        </div>
      )}
      <button
        onClick={() => setEditMode(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-charcoal border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <PencilLine size={14} /> Modifier
      </button>
    </div>
  );
}

/* ──────────────────── CLIENTS TAB ──────────────────── */
function ClientsTab({ company, onChanged }: { company: CompanyDetailDto; onChanged: () => void | Promise<void> }) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient]   = useState<ClientDto | null>(null);
  const [editLoadingId, setEditLoadingId]   = useState<number | null>(null);
  const [editError, setEditError]           = useState('');

  const filtered = company.clients.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.fullName.toLowerCase().includes(q)
      || (c.email ?? '').toLowerCase().includes(q)
      || (c.phone ?? '').toLowerCase().includes(q);
  });

  const currentClientIds = new Set(company.clients.map(c => c.id));

  async function remove(clientId: number) {
    if (!confirm('Retirer ce client de la compagnie ?')) return;
    try { await companies.removeClient(company.id, clientId); await onChanged(); } catch { /* ignore */ }
  }

  async function openEdit(clientId: number) {
    setEditError('');
    setEditLoadingId(clientId);
    try {
      const full = await clientsApi.getById(clientId);
      setEditingClient(full);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Impossible de charger la fiche client.');
    } finally {
      setEditLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher dans les clients…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40 bg-white"
          />
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-800 transition-colors ml-auto"
        >
          <Plus size={15} /> Ajouter un client
        </button>
      </div>

      {editError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
          {editError}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Aucun client rattaché.</div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
          {filtered.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-charcoal/5 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-charcoal/70">
                    {c.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-charcoal truncate">{c.fullName}</p>
                  <p className="text-xs text-gray-400 truncate">{c.email ?? c.phone ?? `#${c.id}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(c.id)}
                  disabled={editLoadingId === c.id}
                  title="Modifier la fiche client"
                  className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {editLoadingId === c.id ? (
                    <div className="w-[15px] h-[15px] border-2 border-gray-300 border-t-charcoal rounded-full animate-spin" />
                  ) : (
                    <PencilLine size={15} />
                  )}
                </button>
                <button
                  onClick={() => remove(c.id)}
                  title="Retirer"
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <AddClientToCompanyModal
          companyId={company.id}
          companyName={company.name}
          disabledClientIds={currentClientIds}
          onClose={() => setModalOpen(false)}
          onDone={async () => { setModalOpen(false); await onChanged(); }}
        />
      )}

      {editingClient && (
        <ClientModal
          initial={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={async () => { setEditingClient(null); await onChanged(); }}
        />
      )}
    </div>
  );
}

/* ──────────────────── Add-client modal (create or link existing) ──────────────────── */
function AddClientToCompanyModal({
  companyId, companyName, disabledClientIds, onClose, onDone,
}: {
  companyId: number;
  companyName: string;
  disabledClientIds: Set<number>;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState<ClientDto[] | null>(null);

  // Create-client form
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    documentType: '', documentNumber: '',
    city: '', country: '', notes: '',
  });

  // Existing-client picker
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerResults, setPickerResults] = useState<ClientDto[]>([]);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onEsc); document.body.style.overflow = ''; };
  }, [onClose]);

  useEffect(() => {
    if (mode !== 'existing') return;
    const t = setTimeout(() => {
      clientsApi.getAll(pickerQuery || undefined)
        .then(setPickerResults)
        .catch(() => setPickerResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [mode, pickerQuery]);

  async function createClientDirect() {
    setSaving(true); setError('');
    try {
      await clientsApi.create({
        firstName:      form.firstName.trim(),
        lastName:       form.lastName.trim(),
        email:          form.email.trim() || null,
        phone:          form.phone.trim() || null,
        nationality:    null,
        documentType:   form.documentType || null,
        documentNumber: form.documentNumber.trim() || null,
        city:           form.city.trim() || null,
        country:        form.country || null,
        notes:          form.notes.trim() || null,
        companyId:      companyId,
      });
      await onDone();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg === 'Failed to fetch' ? "Impossible de joindre l'API. Vérifiez que le backend est démarré." : msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim()) { setError('Le prénom est obligatoire.'); return; }
    if (!form.lastName.trim())  { setError('Le nom est obligatoire.'); return; }

    // Vérification homonymes exacts avant création
    setSaving(true); setError('');
    try {
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim().toLowerCase();
      const results = await clientsApi.getAll(fullName);
      const matches = results.filter(c => c.fullName.trim().toLowerCase() === fullName);
      if (matches.length > 0) {
        setDuplicates(matches);
        setSaving(false);
        return;
      }
    } catch { /* on tente quand même la création */ }

    await createClientDirect();
  }

  async function assignExisting(clientId: number) {
    setSaving(true); setError('');
    try {
      await companies.assignClient(companyId, clientId);
      await onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green/15 flex items-center justify-center">
              <User size={16} className="text-green-dark" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-charcoal">Ajouter un client</h2>
              <p className="text-xs text-gray-400">Rattaché à la compagnie <span className="font-semibold text-charcoal">{companyName}</span></p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-charcoal transition-colors flex items-center justify-center" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 border-b border-gray-100">
          <div className="inline-flex p-1 gap-1 bg-gray-100 rounded-lg mb-3">
            {([
              ['new', 'Nouveau client'],
              ['existing', 'Client existant'],
            ] as const).map(([m, label]) => {
              const on = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(''); }}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    on ? 'bg-white text-charcoal shadow-sm' : 'text-gray-500 hover:text-charcoal'
                  }`}
                >{label}</button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        {mode === 'new' ? (
          <form onSubmit={handleCreate} className="flex-1 overflow-auto">
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
                    placeholder="+228 70 79 08 89"
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
                <div>
                  <label className={labelCls}><Req>N° de pièce</Req></label>
                  <input
                    value={form.documentNumber}
                    onChange={e => setForm(f => ({ ...f, documentNumber: e.target.value }))}
                    placeholder="AB123456"
                    className={inputCls}
                  />
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
                {saving ? 'Création…' : 'Créer et rattacher'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={pickerQuery}
                  onChange={e => setPickerQuery(e.target.value)}
                  placeholder="Rechercher un client par nom, téléphone, email…"
                  className={`${inputCls} pl-9`}
                />
              </div>
              {error && (
                <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto divide-y divide-gray-50">
              {pickerResults.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">Aucun client trouvé.</div>
              ) : pickerResults.map(c => {
                const disabled = disabledClientIds.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={disabled || saving}
                    onClick={() => assignExisting(c.id)}
                    className={`w-full flex items-center justify-between gap-3 p-3 text-left transition-colors ${
                      disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-green/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-charcoal/5 flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-bold text-charcoal/70">
                          {c.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-charcoal truncate">{c.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{c.email ?? c.phone ?? `#${c.id}`}</p>
                      </div>
                    </div>
                    {disabled ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-charcoal/10 text-charcoal/60 shrink-0">Déjà rattaché</span>
                    ) : (
                      <Plus size={15} className="text-charcoal/60 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {duplicates && (
        <DuplicateClientDialog
          duplicates={duplicates}
          firstName={form.firstName}
          lastName={form.lastName}
          saving={saving}
          onCancel={() => setDuplicates(null)}
          onConfirm={async () => { setDuplicates(null); await createClientDirect(); }}
        />
      )}
    </div>
  );
}

/* ──────────────────── STAYS TAB ──────────────────── */
function StaysTab({ companyId }: { companyId: number }) {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [from, setFrom] = useState(iso(firstOfMonth));
  const [to, setTo]     = useState(iso(now));
  const [stays, setStays] = useState<CompanyStayDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const list = await companies.getStays(companyId, from, to);
      setStays(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg === 'Failed to fetch' ? "Impossible de joindre l'API." : msg);
      setStays([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, from, to]);

  useEffect(() => { load(); }, [load]);

  function applyPreset(kind: 'this-month' | 'last-month' | 'ytd' | 'last-30') {
    const today = new Date();
    if (kind === 'this-month') {
      setFrom(iso(new Date(today.getFullYear(), today.getMonth(), 1)));
      setTo(iso(today));
    } else if (kind === 'last-month') {
      setFrom(iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)));
      setTo(iso(new Date(today.getFullYear(), today.getMonth(), 0)));
    } else if (kind === 'ytd') {
      setFrom(iso(new Date(today.getFullYear(), 0, 1)));
      setTo(iso(today));
    } else {
      const d = new Date(today); d.setDate(d.getDate() - 30);
      setFrom(iso(d)); setTo(iso(today));
    }
  }

  const totals = useMemo(() => {
    const totalNights = stays.reduce((s, r) => s + r.nightsInPeriod, 0);
    const uniqueRooms = new Set(stays.map(s => s.roomNumber ?? `cat-${s.categoryId}`)).size;
    const uniqueGuests = new Set(stays.map(s => s.clientId)).size;
    return { totalNights, uniqueRooms, uniqueGuests };
  }, [stays]);

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';

  return (
    <div className="space-y-4">
      {/* Period picker */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Du</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Au</label>
          <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className={inputCls} />
        </div>
        <div className="flex items-center gap-1.5 pb-0.5">
          {([
            ['this-month', 'Ce mois'],
            ['last-month', 'Mois dernier'],
            ['last-30',    '30 derniers jours'],
            ['ytd',        'Année en cours'],
          ] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => applyPreset(k)}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-charcoal transition-colors">
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => load()}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-charcoal border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <RotateCcw size={13} /> Rafraîchir
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Nuitées sur la période" value={totals.totalNights.toString()} />
        <StatCard label="Chambres occupées"      value={totals.uniqueRooms.toString()} />
        <StatCard label="Clients logés"          value={totals.uniqueGuests.toString()} />
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
        </div>
      ) : stays.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Aucun séjour sur cette période.</div>
      ) : (
        <div className="border border-gray-100 rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60">
              <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left font-medium">Réf.</th>
                <th className="px-4 py-2.5 text-left font-medium">Client</th>
                <th className="px-4 py-2.5 text-left font-medium">Chambre</th>
                <th className="px-4 py-2.5 text-left font-medium">Arrivée</th>
                <th className="px-4 py-2.5 text-left font-medium">Départ</th>
                <th className="px-4 py-2.5 text-right font-medium">Nuits</th>
                <th className="px-4 py-2.5 text-right font-medium">Nuits sur période</th>
                <th className="px-4 py-2.5 text-left font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stays.map(s => {
                const st = STATUS_CONFIG[s.status] ?? { label: s.status, cls: 'bg-gray-100 text-gray-600' };
                return (
                  <tr key={s.reservationId} className="hover:bg-gray-50/70">
                    <td className="px-4 py-2.5 font-mono text-xs text-green-dark font-bold">{s.reference}</td>
                    <td className="px-4 py-2.5 font-medium text-charcoal">{s.clientFullName}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-charcoal">{s.categoryNameFr}</span>
                      {s.roomNumber && <span className="text-xs text-gray-400 ml-1">· Apt {s.roomNumber}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{fmtDate(s.checkInDate)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{fmtDate(s.checkOutDate)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{s.nights}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-charcoal">{s.nightsInPeriod}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50/60 rounded-lg p-3 border border-gray-100">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-charcoal mt-0.5">{value}</p>
    </div>
  );
}

/* ──────────────────── TARIFS TAB ──────────────────── */
function TarifsTab({ company, cats, onChanged }: { company: CompanyDetailDto; cats: RoomCategoryDto[]; onChanged: () => void | Promise<void> }) {
  const [catId, setCatId]     = useState('');
  const [tarifNuit, setTN]    = useState('');
  const [tarifN15, setTN15]   = useState('');
  const [tarifN30, setTN30]   = useState('');
  const [msg, setMsg]         = useState('');
  const [saving, setSaving]   = useState(false);

  function startEdit(t: { categoryId: number; tarifNuit: number; tarifN15: number; tarifN30: number }) {
    setCatId(String(t.categoryId));
    setTN(String(t.tarifNuit));
    setTN15(String(t.tarifN15));
    setTN30(String(t.tarifN30));
    setMsg('');
  }

  async function handleSet(e: React.FormEvent) {
    e.preventDefault();
    if (!catId) { setMsg('Sélectionnez une catégorie.'); return; }
    setSaving(true); setMsg('');
    try {
      await companies.setTarif(company.id, {
        categoryId: Number(catId),
        tarifNuit: Number(tarifNuit) || 0,
        tarifN15:  Number(tarifN15)  || 0,
        tarifN30:  Number(tarifN30)  || 0,
      });
      setCatId(''); setTN(''); setTN15(''); setTN30('');
      setMsg('Tarif enregistré.');
      await onChanged();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';
  const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="space-y-5">
      {/* Upsert form */}
      <form onSubmit={handleSet} className="bg-gray-50/60 border border-gray-100 rounded-lg p-4 space-y-3">
        <p className="text-xs text-gray-500">
          Définir ou modifier un tarif préférentiel par catégorie. Montants en FCFA / nuit.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Catégorie</label>
            <select value={catId} onChange={e => setCatId(e.target.value)} className={inputCls}>
              <option value="">— Choisir —</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.nameFr}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>&lt; 15 nuits</label>
            <input type="number" min={0} value={tarifNuit} onChange={e => setTN(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>15–29 nuits</label>
            <input type="number" min={0} value={tarifN15} onChange={e => setTN15(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>≥ 30 nuits</label>
            <input type="number" min={0} value={tarifN30} onChange={e => setTN30(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-60">
            <Save size={14} /> {saving ? 'Enregistrement…' : 'Enregistrer le tarif'}
          </button>
          {msg && <span className={`text-xs ${msg.includes('enregistré') ? 'text-green-dark' : 'text-red-600'}`}>{msg}</span>}
        </div>
      </form>

      {/* Existing tarifs */}
      {company.tarifs.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Aucun tarif configuré pour cette compagnie.</div>
      ) : (
        <div className="border border-gray-100 rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60">
              <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left font-medium">Catégorie</th>
                <th className="px-4 py-2.5 text-right font-medium">&lt; 15 nuits</th>
                <th className="px-4 py-2.5 text-right font-medium">15–29 nuits</th>
                <th className="px-4 py-2.5 text-right font-medium">≥ 30 nuits</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {company.tarifs.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/70">
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-charcoal">{t.categoryNameFr}</p>
                    <p className="text-xs text-gray-400">{t.categorySlug}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right text-charcoal">{t.tarifNuit.toLocaleString('fr')} <span className="text-xs text-gray-400">FCFA</span></td>
                  <td className="px-4 py-2.5 text-right text-charcoal">{t.tarifN15.toLocaleString('fr')}  <span className="text-xs text-gray-400">FCFA</span></td>
                  <td className="px-4 py-2.5 text-right text-charcoal">{t.tarifN30.toLocaleString('fr')}  <span className="text-xs text-gray-400">FCFA</span></td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => startEdit(t)} title="Modifier"
                      className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors">
                      <PencilLine size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
