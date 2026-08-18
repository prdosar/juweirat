'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import { pmsMaintenance, pmsUnits } from '@/lib/pms';
import type { MaintenanceTicketDto, UnitDto } from '@/lib/pmsTypes';
import { Plus, Wrench, CheckCircle, AlertTriangle, Clock, X } from 'lucide-react';

const PRIORITIES = ['Basse', 'Normale', 'Haute', 'Urgente'];
const STATUSES   = ['Ouvert', 'EnCours', 'Resolu'];
const CATEGORIES = ['Plomberie', 'Électricité', 'Climatisation', 'Mobilier', 'Ménage', 'Serrurerie', 'Autre'];

const PRIORITY_CLS: Record<string, string> = {
  Basse:   'bg-gray-100 text-gray-500',
  Normale: 'bg-blue-50 text-blue-600',
  Haute:   'bg-amber-50 text-amber-600',
  Urgente: 'bg-red-100 text-red-600',
};
const STATUS_CLS: Record<string, string> = {
  Ouvert:  'bg-amber-50 text-amber-600',
  EnCours: 'bg-blue-50 text-blue-600',
  Resolu:  'bg-green/15 text-green-dark',
};
const STATUS_FR: Record<string, string> = {
  Ouvert: 'Ouvert', EnCours: 'En cours', Resolu: 'Résolu',
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'Resolu')  return <CheckCircle  size={13} className="text-green-dark" />;
  if (status === 'EnCours') return <Clock        size={13} className="text-blue-500"   />;
  return                           <AlertTriangle size={13} className="text-amber-500"  />;
}

interface TicketForm {
  zone: string; unitId: string; spot: string; category: string;
  priority: string; title: string; description: string; tech: string;
}
const EMPTY_FORM: TicketForm = {
  zone: 'Appartement', unitId: '', spot: '', category: 'Autre',
  priority: 'Normale', title: '', description: '', tech: '',
};

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<MaintenanceTicketDto[]>([]);
  const [units, setUnits]     = useState<UnitDto[]>([]);
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState<TicketForm>(EMPTY_FORM);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const [patchBusy, setPatchBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [t, u] = await Promise.all([
      pmsMaintenance.getAll({
        status:   filterStatus   || undefined,
        priority: filterPriority || undefined,
      }),
      pmsUnits.getAll(),
    ]);
    setTickets(t); setUnits(u); setLoading(false);
  }, [filterStatus, filterPriority]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  async function doCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await pmsMaintenance.create({
        zone:        form.zone,
        unitId:      form.unitId ? Number(form.unitId) : null,
        spot:        form.spot || null,
        category:    form.category,
        priority:    form.priority,
        title:       form.title,
        description: form.description || null,
        tech:        form.tech || null,
      });
      setShowForm(false); setForm(EMPTY_FORM); await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  }

  async function doSetStatus(id: number, status: string) {
    setPatchBusy(id);
    try { await pmsMaintenance.update(id, { status }); await load(); }
    catch { /* silent — list refreshes anyway */ }
    finally { setPatchBusy(null); }
  }

  async function doDelete(id: number) {
    if (!confirm('Supprimer ce ticket ?')) return;
    setPatchBusy(id);
    try { await pmsMaintenance.delete(id); await load(); }
    finally { setPatchBusy(null); }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Maintenance" />
      <div className="flex-1 p-6 space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green/30 bg-white">
            <option value="">Tous statuts</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_FR[s]}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green/30 bg-white">
            <option value="">Toutes priorités</option>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
          <button
            onClick={() => setShowForm(v => !v)}
            className="ml-auto flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90">
            <Plus size={15} /> Nouveau ticket
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-charcoal">Nouveau ticket</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-charcoal">
                <X size={16} />
              </button>
            </div>
            {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>}
            <form onSubmit={doCreate} className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Zone</label>
                <select value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30">
                  <option>Appartement</option>
                  <option>Communs</option>
                  <option>Extérieur</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Appartement</label>
                <select value={form.unitId} onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30">
                  <option value="">—</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.pmsRoomNo ?? u.nameFr}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Catégorie</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Priorité</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30">
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Titre *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Robinet qui fuit dans la salle de bain"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Emplacement précis</label>
                <input value={form.spot} onChange={e => setForm(f => ({ ...f, spot: e.target.value }))}
                  placeholder="Ex: Salle de bain principale"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Technicien assigné</label>
                <input value={form.tech} onChange={e => setForm(f => ({ ...f, tech: e.target.value }))}
                  placeholder="Nom du technicien"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/30" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Détails supplémentaires…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green/30" />
              </div>
              <div className="col-span-2 flex gap-2">
                <button type="submit" disabled={busy}
                  className="bg-charcoal text-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
                  {busy ? 'Création…' : 'Créer le ticket'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {tickets.map(t => (
                <div key={t.id} className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50/50">
                  <div className="mt-0.5">
                    <StatusIcon status={t.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-charcoal">{t.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_CLS[t.priority] ?? 'bg-gray-100 text-gray-500'}`}>
                        {t.priority}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CLS[t.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_FR[t.status] ?? t.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1"><Wrench size={11} /> {t.category}</span>
                      {t.unitLabel && <span>Appt {t.unitLabel}</span>}
                      {t.spot      && <span>{t.spot}</span>}
                      {t.tech      && <span>→ {t.tech}</span>}
                      <span>{new Date(t.createdAt).toLocaleDateString('fr')}</span>
                    </div>
                    {t.description && <p className="text-xs text-gray-500 mt-1 truncate">{t.description}</p>}
                    {t.resolvedAt  && <p className="text-xs text-green-dark mt-1">Résolu le {new Date(t.resolvedAt).toLocaleDateString('fr')}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {t.status === 'Ouvert' && (
                      <button onClick={() => doSetStatus(t.id, 'EnCours')} disabled={patchBusy === t.id}
                        className="text-xs text-blue-600 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 disabled:opacity-40">
                        En cours
                      </button>
                    )}
                    {t.status !== 'Resolu' && (
                      <button onClick={() => doSetStatus(t.id, 'Resolu')} disabled={patchBusy === t.id}
                        className="text-xs text-green-dark border border-green/30 px-2.5 py-1 rounded-lg hover:bg-green/5 disabled:opacity-40">
                        Résoudre
                      </button>
                    )}
                    <button onClick={() => doDelete(t.id)} disabled={patchBusy === t.id}
                      className="text-xs text-red-500 border border-red-100 px-2.5 py-1 rounded-lg hover:bg-red-50 disabled:opacity-40">
                      Suppr.
                    </button>
                  </div>
                </div>
              ))}
              {tickets.length === 0 && (
                <div className="px-5 py-12 text-center text-gray-400 text-sm">Aucun ticket de maintenance</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
