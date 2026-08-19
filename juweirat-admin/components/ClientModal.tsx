'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { clients, companies as companiesApi } from '@/lib/api';
import type { ClientDto, CompanyDto } from '@/lib/types';
import DuplicateClientDialog from './DuplicateClientDialog';

const COUNTRIES = ["Côte d'Ivoire", 'Sénégal', 'Burkina Faso', 'France', 'Togo', 'Bénin', 'Ghana', 'Autre'];
const DOC_TYPES = ['Passeport', "Carte d'identité", 'Carte de séjour', 'Permis de conduire'];

function Req({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span>
      {children}
      {required && <span className="text-red-600 font-bold ml-0.5">*</span>}
    </span>
  );
}

interface Props {
  initial: ClientDto | null;
  /** Pré-sélection compagnie à la création (ex: appelé depuis /companies/[id]). Ignoré en édition. */
  defaultCompanyId?: number;
  onClose:  () => void;
  onSaved:  () => void | Promise<void>;
}

export default function ClientModal({ initial, defaultCompanyId, onClose, onSaved }: Props) {
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
    companyId:      initial?.companyId ?? defaultCompanyId ?? 0,
  });
  const [companyList, setCompanyList] = useState<CompanyDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [duplicates, setDuplicates] = useState<ClientDto[] | null>(null);

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

  async function submitClient() {
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

    if (!isEdit) {
      setSaving(true); setError('');
      try {
        const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim().toLowerCase();
        const results = await clients.getAll(fullName);
        const matches = results.filter(c => c.fullName.trim().toLowerCase() === fullName);
        if (matches.length > 0) {
          setDuplicates(matches);
          setSaving(false);
          return;
        }
      } catch { /* si l'API échoue, on tente la création */ }
    }

    await submitClient();
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
          onConfirm={async () => { setDuplicates(null); await submitClient(); }}
        />
      )}
    </div>
  );
}
