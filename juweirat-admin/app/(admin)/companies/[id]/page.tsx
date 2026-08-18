'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { companies, categories as categoriesApi } from '@/lib/api';
import type { CompanyDetailDto, RoomCategoryDto } from '@/lib/types';
import {
  Building2, Phone, Mail, MapPin, User, ArrowLeft,
  Plus, Trash2, Save, PencilLine, Users, Tag,
} from 'lucide-react';

type Tab = 'info' | 'clients' | 'tarifs';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router   = useRouter();
  const companyId = Number(id);

  const [company, setCompany]       = useState<CompanyDetailDto | null>(null);
  const [cats, setCats]             = useState<RoomCategoryDto[]>([]);
  const [tab, setTab]               = useState<Tab>('info');
  const [loading, setLoading]       = useState(true);
  const [editMode, setEditMode]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  // Info edit form
  const [form, setForm] = useState({
    name: '', responsableNom: '', phone: '', email: '',
    adresse: '', ville: '', notes: '', isActive: true,
  });

  // Client assignment
  const [clientSearch, setClientSearch] = useState('');
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientMsg, setClientMsg]         = useState('');

  // Tarif form
  const [tarifCatId, setTarifCatId]   = useState('');
  const [tarifNuit, setTarifNuit]     = useState('');
  const [tarifN15, setTarifN15]       = useState('');
  const [tarifN30, setTarifN30]       = useState('');
  const [tarifMsg, setTarifMsg]       = useState('');
  const [tarifSaving, setTarifSaving] = useState(false);

  useEffect(() => { load(); }, [companyId]);

  async function load() {
    setLoading(true);
    try {
      const [c, catList] = await Promise.all([
        companies.getById(companyId),
        categoriesApi.getAll(),
      ]);
      setCompany(c);
      setCats(catList);
      setForm({
        name: c.name, responsableNom: c.responsableNom ?? '',
        phone: c.phone ?? '', email: c.email ?? '',
        adresse: c.adresse ?? '', ville: c.ville ?? '',
        notes: c.notes ?? '', isActive: c.isActive,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est obligatoire.'); return; }
    setSaving(true); setError('');
    try {
      await companies.update(companyId, {
        name: form.name.trim(),
        responsableNom: form.responsableNom || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        adresse: form.adresse || undefined,
        ville: form.ville || undefined,
        notes: form.notes || undefined,
        isActive: form.isActive,
      });
      setEditMode(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignClient(e: React.FormEvent) {
    e.preventDefault();
    const cid = Number(clientIdInput.trim());
    if (!cid) { setClientMsg('Entrez un ID client valide.'); return; }
    setClientMsg('');
    try {
      await companies.assignClient(companyId, cid);
      setClientIdInput('');
      setClientMsg('Client ajouté.');
      await load();
    } catch (err: unknown) {
      setClientMsg(err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function handleRemoveClient(clientId: number) {
    if (!confirm('Retirer ce client de la compagnie ?')) return;
    try {
      await companies.removeClient(companyId, clientId);
      await load();
    } catch { /* ignore */ }
  }

  async function handleSetTarif(e: React.FormEvent) {
    e.preventDefault();
    if (!tarifCatId) { setTarifMsg('Sélectionnez une catégorie.'); return; }
    setTarifSaving(true); setTarifMsg('');
    try {
      await companies.setTarif(companyId, {
        categoryId: Number(tarifCatId),
        tarifNuit: Number(tarifNuit) || 0,
        tarifN15: Number(tarifN15) || 0,
        tarifN30: Number(tarifN30) || 0,
      });
      setTarifCatId(''); setTarifNuit(''); setTarifN15(''); setTarifN30('');
      setTarifMsg('Tarif enregistré.');
      await load();
    } catch (err: unknown) {
      setTarifMsg(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setTarifSaving(false);
    }
  }

  function startEditTarif(t: { categoryId: number; tarifNuit: number; tarifN15: number; tarifN30: number }) {
    setTarifCatId(String(t.categoryId));
    setTarifNuit(String(t.tarifNuit));
    setTarifN15(String(t.tarifN15));
    setTarifN30(String(t.tarifN30));
    setTarifMsg('');
  }

  const filteredClients = company?.clients.filter(c =>
    c.fullName.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(clientSearch.toLowerCase())
  ) ?? [];

  if (loading) return <div className="p-8 text-white/30 text-sm">Chargement…</div>;
  if (!company) return <div className="p-8 text-white/40 text-sm">Compagnie introuvable.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back + header */}
      <button onClick={() => router.push('/companies')} className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft size={14} />
        Retour aux compagnies
      </button>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Building2 size={22} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{company.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {!company.isActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/40">Inactif</span>
              )}
              <span className="text-xs text-white/35">{company.clientCount} client{company.clientCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 mb-6">
        {([['info', 'Informations'], ['clients', 'Clients'], ['tarifs', 'Tarifs']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-green text-white' : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── INFO TAB ─── */}
      {tab === 'info' && (
        <div>
          {!editMode ? (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {company.responsableNom && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/35 mb-1 flex items-center gap-1.5"><User size={11} />Responsable</p>
                    <p className="text-sm text-white">{company.responsableNom}</p>
                  </div>
                )}
                {company.phone && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/35 mb-1 flex items-center gap-1.5"><Phone size={11} />Téléphone</p>
                    <p className="text-sm text-white">{company.phone}</p>
                  </div>
                )}
                {company.email && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/35 mb-1 flex items-center gap-1.5"><Mail size={11} />Email</p>
                    <p className="text-sm text-white">{company.email}</p>
                  </div>
                )}
                {company.ville && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/35 mb-1 flex items-center gap-1.5"><MapPin size={11} />Ville</p>
                    <p className="text-sm text-white">{company.ville}</p>
                  </div>
                )}
                {company.adresse && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/35 mb-1 flex items-center gap-1.5"><MapPin size={11} />Adresse</p>
                    <p className="text-sm text-white">{company.adresse}</p>
                  </div>
                )}
                {company.notes && (
                  <div className="col-span-2 bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/35 mb-1">Notes</p>
                    <p className="text-sm text-white/70 whitespace-pre-wrap">{company.notes}</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/8 text-white/60 rounded-lg text-sm hover:bg-white/12 transition-colors"
              >
                <PencilLine size={14} />
                Modifier
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveInfo}>
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block text-xs text-white/50 mb-1">Nom *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Responsable</label>
                  <input value={form.responsableNom} onChange={e => setForm(f => ({ ...f, responsableNom: e.target.value }))}
                    className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Téléphone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Ville</label>
                  <input value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                    className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-white/50 mb-1">Adresse</label>
                  <input value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                    className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-white/50 mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                    className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green resize-none" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="rounded" />
                  <label htmlFor="isActive" className="text-sm text-white/60">Compagnie active</label>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-green text-charcoal rounded-lg text-sm font-semibold hover:bg-green/90 disabled:opacity-50 transition-colors">
                  <Save size={14} />
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button type="button" onClick={() => setEditMode(false)}
                  className="px-5 py-2 bg-white/8 text-white/60 rounded-lg text-sm hover:bg-white/12 transition-colors">
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ─── CLIENTS TAB ─── */}
      {tab === 'clients' && (
        <div>
          {/* Assign form */}
          <form onSubmit={handleAssignClient} className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5">
            <p className="text-xs text-white/50 mb-3">Ajouter un client existant à cette compagnie par son ID</p>
            <div className="flex gap-3">
              <input
                value={clientIdInput} onChange={e => setClientIdInput(e.target.value)}
                placeholder="ID du client"
                className="flex-1 bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green"
              />
              <button type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-green text-charcoal rounded-lg text-sm font-semibold hover:bg-green/90 transition-colors">
                <Plus size={14} />
                Ajouter
              </button>
            </div>
            {clientMsg && (
              <p className={`text-xs mt-2 ${clientMsg.includes('ajouté') ? 'text-green' : 'text-red-400'}`}>{clientMsg}</p>
            )}
          </form>

          {/* Search */}
          <div className="relative mb-4">
            <input
              value={clientSearch} onChange={e => setClientSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full pl-4 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/25 outline-none focus:border-white/25"
            />
          </div>

          {filteredClients.length === 0 ? (
            <div className="text-center py-12 text-white/25">
              <Users size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun client</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClients.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/8 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-white">{c.fullName}</p>
                    <p className="text-xs text-white/35 mt-0.5">{c.email ?? c.phone ?? `#${c.id}`}</p>
                  </div>
                  <button onClick={() => handleRemoveClient(c.id)}
                    className="p-2 text-white/25 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TARIFS TAB ─── */}
      {tab === 'tarifs' && (
        <div>
          {/* Tarif upsert form */}
          <form onSubmit={handleSetTarif} className="bg-white/5 border border-white/10 rounded-xl p-5 mb-5">
            <p className="text-xs text-white/50 mb-3">
              Définir ou modifier un tarif préférentiel par catégorie. Tous les montants sont en FCFA/nuit.
            </p>
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div className="col-span-4 sm:col-span-1">
                <label className="block text-xs text-white/50 mb-1">Catégorie</label>
                <select value={tarifCatId} onChange={e => setTarifCatId(e.target.value)}
                  className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green">
                  <option value="">— choisir —</option>
                  {cats.map(c => (
                    <option key={c.id} value={c.id}>{c.nameFr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">&lt;15 nuits/nuit</label>
                <input type="number" min={0} value={tarifNuit} onChange={e => setTarifNuit(e.target.value)}
                  className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">15-29 nuits/nuit</label>
                <input type="number" min={0} value={tarifN15} onChange={e => setTarifN15(e.target.value)}
                  className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">≥30 nuits/nuit</label>
                <input type="number" min={0} value={tarifN30} onChange={e => setTarifN30(e.target.value)}
                  className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={tarifSaving}
                className="flex items-center gap-2 px-4 py-2 bg-green text-charcoal rounded-lg text-sm font-semibold hover:bg-green/90 disabled:opacity-50 transition-colors">
                <Save size={14} />
                {tarifSaving ? 'Enregistrement…' : 'Enregistrer le tarif'}
              </button>
              {tarifMsg && (
                <p className={`text-xs ${tarifMsg.includes('enregistré') ? 'text-green' : 'text-red-400'}`}>{tarifMsg}</p>
              )}
            </div>
          </form>

          {/* Existing tarifs */}
          {company.tarifs.length === 0 ? (
            <div className="text-center py-12 text-white/25">
              <Tag size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun tarif configuré</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="text-left text-xs text-white/35 font-medium px-4 py-3">Catégorie</th>
                    <th className="text-right text-xs text-white/35 font-medium px-4 py-3">&lt;15 nuits</th>
                    <th className="text-right text-xs text-white/35 font-medium px-4 py-3">15-29 nuits</th>
                    <th className="text-right text-xs text-white/35 font-medium px-4 py-3">≥30 nuits</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {company.tarifs.map(t => (
                    <tr key={t.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-white">{t.categoryNameFr}</p>
                        <p className="text-xs text-white/30">{t.categorySlug}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-white">{t.tarifNuit.toLocaleString('fr')} FCFA</td>
                      <td className="px-4 py-3 text-right text-sm text-white">{t.tarifN15.toLocaleString('fr')} FCFA</td>
                      <td className="px-4 py-3 text-right text-sm text-white">{t.tarifN30.toLocaleString('fr')} FCFA</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => startEditTarif(t)}
                          className="p-1.5 text-white/25 hover:text-white transition-colors rounded">
                          <PencilLine size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
