'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { clients, companies } from '@/lib/api';
import type { ClientDto, CompanyDto } from '@/lib/types';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

const DOC_TYPES = ['Passeport', "Carte d'identité", 'Carte de séjour', 'Permis de conduire'];

export default function ClientFormPage() {
  const { id }  = useParams<{ id: string }>();
  const isNew   = id === 'new';
  const router  = useRouter();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    nationality: '', documentType: '', documentNumber: '',
    city: '', country: '', notes: '', companyId: 0,
  });
  const [companyList, setCompanyList] = useState<CompanyDto[]>([]);

  useEffect(() => {
    companies.getAll().then(setCompanyList).catch(() => setCompanyList([]));
  }, []);

  useEffect(() => {
    if (!isNew) {
      clients.getById(Number(id)).then((c: ClientDto) => {
        setForm({
          firstName: c.firstName, lastName: c.lastName,
          email: c.email ?? '', phone: c.phone ?? '',
          nationality: c.nationality ?? '', documentType: c.documentType ?? '',
          documentNumber: c.documentNumber ?? '', city: c.city ?? '',
          country: c.country ?? '', notes: c.notes ?? '',
          companyId: c.companyId ?? 0,
        });
      }).finally(() => setLoading(false));
    }
  }, [id, isNew]);

  function set(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || null,
        phone: form.phone || null,
        nationality: form.nationality || null,
        documentType: form.documentType || null,
        documentNumber: form.documentNumber || null,
        city: form.city || null,
        country: form.country || null,
        notes: form.notes || null,
        companyId: form.companyId > 0 ? form.companyId : null,
      };
      if (isNew) {
        await clients.create(body);
        router.push('/clients');
      } else {
        await clients.update(Number(id), body);
        router.push('/clients');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex flex-col min-h-full">
      <Header title="Client" />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full">
      <Header title={isNew ? 'Nouveau client' : 'Modifier le client'} />
      <div className="flex-1 p-6 max-w-2xl">
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal mb-5">
          <ArrowLeft size={16} /> Retour aux clients
        </Link>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Identité */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-charcoal">Identité</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Prénom *</label>
                <input required value={form.firstName} onChange={e => set('firstName', e.target.value)}
                  placeholder="Jean" className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Nom *</label>
                <input required value={form.lastName} onChange={e => set('lastName', e.target.value)}
                  placeholder="Dupont" className="input" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Nationalité</label>
              <input value={form.nationality} onChange={e => set('nationality', e.target.value)}
                placeholder="Togolaise" className="input" />
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-charcoal">Contact</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="jean@exemple.com" className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Téléphone</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="+228 90 00 00 00" className="input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Ville</label>
                <input value={form.city} onChange={e => set('city', e.target.value)}
                  placeholder="Lomé" className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Pays</label>
                <input value={form.country} onChange={e => set('country', e.target.value)}
                  placeholder="Togo" className="input" />
              </div>
            </div>
          </div>

          {/* Document */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-charcoal">{"Document d'identité"}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Type de document</label>
                <select value={form.documentType} onChange={e => set('documentType', e.target.value)} className="input">
                  <option value="">— Sélectionner —</option>
                  {DOC_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Numéro de document</label>
                <input value={form.documentNumber} onChange={e => set('documentNumber', e.target.value)}
                  placeholder="AB123456" className="input" />
              </div>
            </div>
          </div>

          {/* Compagnie */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-charcoal">Compagnie de rattachement</h2>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Compagnie (optionnel)</label>
              <select
                value={form.companyId}
                onChange={e => set('companyId', Number(e.target.value))}
                className="input"
                disabled={companyList.length === 0}
              >
                <option value={0}>— Aucune compagnie —</option>
                {companyList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {companyList.length === 0 && (
                <p className="text-xs text-gray-400">
                  Aucune compagnie configurée. Créez-en une depuis le menu Compagnies.
                </p>
              )}
              {form.companyId > 0 && (
                <p className="text-xs text-green-dark font-medium">
                  Ce client bénéficiera du tarif entreprise associé à sa compagnie.
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-charcoal">Notes internes</h2>
            <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Observations, préférences…" className="input resize-none" />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-charcoal text-white font-medium px-6 py-2.5 rounded-lg hover:bg-charcoal-800 disabled:opacity-60 transition-colors"
            >
              <Save size={15} />
              {saving ? 'Enregistrement…' : isNew ? 'Créer le client' : 'Sauvegarder'}
            </button>
            <Link href="/clients" className="px-5 py-2.5 text-sm text-gray-500 rounded-lg hover:bg-gray-100 transition-colors">
              Annuler
            </Link>
          </div>
        </form>
      </div>

      <style>{`
        .input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          background: white;
        }
        .input:focus {
          box-shadow: 0 0 0 2px rgba(61,199,32,0.25);
          border-color: rgba(61,199,32,0.4);
        }
      `}</style>
    </div>
  );
}
