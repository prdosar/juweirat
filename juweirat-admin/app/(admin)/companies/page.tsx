'use client';

import { useEffect, useState } from 'react';
import { companies } from '@/lib/api';
import type { CompanyDto } from '@/lib/types';
import { Plus, Search, Building2, Phone, Mail, Users, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function CompaniesPage() {
  const [list, setList]         = useState<CompanyDto[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError]       = useState('');
  const [form, setForm] = useState({
    name: '', responsableNom: '', phone: '', email: '', adresse: '', ville: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setList(await companies.getAll()); } finally { setLoading(false); }
  }

  const filtered = list.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.responsableNom ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.ville ?? '').toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est obligatoire.'); return; }
    setSaving(true);
    setError('');
    try {
      await companies.create({
        name: form.name.trim(),
        responsableNom: form.responsableNom || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        adresse: form.adresse || undefined,
        ville: form.ville || undefined,
        notes: form.notes || undefined,
      });
      setShowForm(false);
      setForm({ name: '', responsableNom: '', phone: '', email: '', adresse: '', ville: '', notes: '' });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Compagnies</h1>
          <p className="text-white/40 text-sm mt-1">Gérer les entreprises partenaires et leurs tarifs préférentiels</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-green text-charcoal rounded-lg text-sm font-semibold hover:bg-green/90 transition-colors"
        >
          <Plus size={16} />
          Nouvelle compagnie
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold text-white mb-4">Nouvelle compagnie</h2>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-white/50 mb-1">Nom de la compagnie *</label>
              <input
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green"
                placeholder="Ex: Total Togo SA"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Responsable</label>
              <input
                value={form.responsableNom} onChange={e => setForm(f => ({ ...f, responsableNom: e.target.value }))}
                className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Téléphone</label>
              <input
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Email</label>
              <input
                type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Ville</label>
              <input
                value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-white/50 mb-1">Adresse</label>
              <input
                value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-white/50 mb-1">Notes</label>
              <textarea
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="submit" disabled={saving}
              className="px-5 py-2 bg-green text-charcoal rounded-lg text-sm font-semibold hover:bg-green/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Enregistrement…' : 'Créer'}
            </button>
            <button
              type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2 bg-white/8 text-white/60 rounded-lg text-sm hover:bg-white/12 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, responsable, ville…"
          className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/25 outline-none focus:border-white/25"
        />
      </div>

      {/* List */}
      {loading ? (
        <p className="text-white/30 text-sm">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/25">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune compagnie</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(company => (
            <Link
              key={company.id}
              href={`/companies/${company.id}`}
              className="flex items-center gap-4 p-4 bg-white/5 border border-white/8 rounded-xl hover:bg-white/8 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white text-sm">{company.name}</span>
                  {!company.isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/40">Inactif</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-0.5">
                  {company.responsableNom && (
                    <span className="text-xs text-white/40">{company.responsableNom}</span>
                  )}
                  {company.ville && (
                    <span className="text-xs text-white/30">{company.ville}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-5 shrink-0">
                {company.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-white/35">
                    <Phone size={12} />
                    {company.phone}
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center gap-1.5 text-xs text-white/35">
                    <Mail size={12} />
                    {company.email}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <Users size={12} />
                  {company.clientCount} client{company.clientCount !== 1 ? 's' : ''}
                </div>
                <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
