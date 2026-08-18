'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { pmsMaintenanceCategories, pmsMaintenanceStaff } from '@/lib/pms';
import type { MaintenanceCategoryDto, MaintenanceStaffDto } from '@/lib/pmsTypes';
import { Plus, Trash2, PencilLine, Users, Tag, Phone, ChevronDown, ChevronRight, Check, X } from 'lucide-react';

export default function PersonnelPage() {
  const [categories, setCategories] = useState<MaintenanceCategoryDto[]>([]);
  const [staff, setStaff]           = useState<MaintenanceStaffDto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<Set<number>>(new Set());

  // Category form
  const [newCatName, setNewCatName]   = useState('');
  const [catSaving, setCatSaving]     = useState(false);
  const [editCatId, setEditCatId]     = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState('');

  // Staff form
  const [showStaffForm, setShowStaffForm] = useState<number | null>(null); // categoryId
  const [staffForm, setStaffForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [staffSaving, setStaffSaving] = useState(false);
  const [editStaff, setEditStaff] = useState<MaintenanceStaffDto | null>(null);

  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [cats, s] = await Promise.all([
      pmsMaintenanceCategories.getAll(),
      pmsMaintenanceStaff.getAll(),
    ]);
    setCategories(cats);
    setStaff(s);
    setLoading(false);
  }

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatSaving(true); setError('');
    try {
      const cat = await pmsMaintenanceCategories.create(newCatName.trim());
      setCategories(prev => [...prev, cat]);
      setNewCatName('');
      setExpanded(prev => new Set([...prev, cat.id]));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setCatSaving(false);
    }
  }

  async function handleUpdateCategory(id: number) {
    if (!editCatName.trim()) return;
    try {
      const updated = await pmsMaintenanceCategories.update(id, { name: editCatName.trim() });
      setCategories(prev => prev.map(c => c.id === id ? updated : c));
      setEditCatId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function handleToggleCatActive(cat: MaintenanceCategoryDto) {
    try {
      const updated = await pmsMaintenanceCategories.update(cat.id, { isActive: !cat.isActive });
      setCategories(prev => prev.map(c => c.id === cat.id ? updated : c));
    } catch { /* ignore */ }
  }

  async function handleDeleteCategory(id: number) {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    if (cat.staffCount > 0) { setError('Retirez le personnel avant de supprimer la catégorie.'); return; }
    if (!confirm('Supprimer cette catégorie ?')) return;
    try {
      await pmsMaintenanceCategories.delete(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function handleCreateStaff(e: React.FormEvent, categoryId: number) {
    e.preventDefault();
    if (!staffForm.firstName.trim() || !staffForm.lastName.trim()) return;
    setStaffSaving(true); setError('');
    try {
      const s = await pmsMaintenanceStaff.create({
        categoryId,
        firstName: staffForm.firstName.trim(),
        lastName: staffForm.lastName.trim(),
        phone: staffForm.phone.trim() || undefined,
      });
      setStaff(prev => [...prev, s]);
      setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, staffCount: c.staffCount + 1 } : c));
      setStaffForm({ firstName: '', lastName: '', phone: '' });
      setShowStaffForm(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setStaffSaving(false);
    }
  }

  async function handleUpdateStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!editStaff) return;
    setStaffSaving(true);
    try {
      const updated = await pmsMaintenanceStaff.update(editStaff.id, {
        firstName: staffForm.firstName.trim() || undefined,
        lastName: staffForm.lastName.trim() || undefined,
        phone: staffForm.phone.trim() || undefined,
      });
      setStaff(prev => prev.map(s => s.id === editStaff.id ? updated : s));
      setEditStaff(null);
      setStaffForm({ firstName: '', lastName: '', phone: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setStaffSaving(false);
    }
  }

  async function handleToggleStaffActive(s: MaintenanceStaffDto) {
    try {
      const updated = await pmsMaintenanceStaff.update(s.id, { isActive: !s.isActive });
      setStaff(prev => prev.map(st => st.id === s.id ? updated : st));
    } catch { /* ignore */ }
  }

  async function handleDeleteStaff(s: MaintenanceStaffDto) {
    if (!confirm(`Supprimer ${s.fullName} ?`)) return;
    try {
      await pmsMaintenanceStaff.delete(s.id);
      setStaff(prev => prev.filter(st => st.id !== s.id));
      setCategories(prev => prev.map(c => c.id === s.categoryId ? { ...c, staffCount: Math.max(0, c.staffCount - 1) } : c));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  function startEditStaff(s: MaintenanceStaffDto) {
    setEditStaff(s);
    setStaffForm({ firstName: s.firstName, lastName: s.lastName, phone: s.phone ?? '' });
    setShowStaffForm(null);
  }

  if (loading) return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Personnel Maintenance" />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Personnel Maintenance" />
      <div className="flex-1 p-6 max-w-3xl space-y-6">
        <p className="text-sm text-gray-500">
          Gérez les catégories de maintenance et les intervenants associés. Ces données apparaîtront dans les tickets de maintenance.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* New category form */}
        <form onSubmit={handleCreateCategory} className="flex gap-2">
          <div className="flex-1 relative">
            <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={newCatName} onChange={e => setNewCatName(e.target.value)}
              placeholder="Nouvelle catégorie (ex: Plomberie, Électricité…)"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green/30"
            />
          </div>
          <button type="submit" disabled={catSaving || !newCatName.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-charcoal text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-40">
            <Plus size={14} /> Créer
          </button>
        </form>

        {/* Categories list */}
        {categories.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            <Tag size={32} className="mx-auto mb-3 opacity-30" />
            Aucune catégorie créée
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map(cat => {
              const catStaff = staff.filter(s => s.categoryId === cat.id);
              const isExpanded = expanded.has(cat.id);
              return (
                <div key={cat.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Category header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => toggleExpand(cat.id)} className="flex items-center gap-2 flex-1 text-left">
                      {isExpanded ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
                      {editCatId === cat.id ? (
                        <input
                          autoFocus
                          value={editCatName}
                          onChange={e => setEditCatName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleUpdateCategory(cat.id); } if (e.key === 'Escape') setEditCatId(null); }}
                          onClick={e => e.stopPropagation()}
                          className="flex-1 border border-gray-200 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-green/30"
                        />
                      ) : (
                        <span className="font-semibold text-sm text-charcoal">{cat.name}</span>
                      )}
                      <span className="text-xs text-gray-400">{cat.staffCount} intervenant{cat.staffCount !== 1 ? 's' : ''}</span>
                      {!cat.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">Inactif</span>}
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      {editCatId === cat.id ? (
                        <>
                          <button onClick={() => handleUpdateCategory(cat.id)} className="p-1.5 text-green rounded hover:bg-green/10"><Check size={13} /></button>
                          <button onClick={() => setEditCatId(null)} className="p-1.5 text-gray-400 rounded hover:bg-gray-100"><X size={13} /></button>
                        </>
                      ) : (
                        <button onClick={() => { setEditCatId(cat.id); setEditCatName(cat.name); }} className="p-1.5 text-gray-400 hover:text-charcoal rounded hover:bg-gray-100">
                          <PencilLine size={13} />
                        </button>
                      )}
                      <button onClick={() => handleToggleCatActive(cat)} className="p-1.5 text-gray-400 hover:text-amber-500 rounded hover:bg-gray-100 text-xs">
                        {cat.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                      <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Staff list */}
                  {isExpanded && (
                    <div className="border-t border-gray-50">
                      {catStaff.length === 0 && showStaffForm !== cat.id && (
                        <div className="px-6 py-4 text-center text-xs text-gray-400">
                          <Users size={20} className="mx-auto mb-1 opacity-30" />
                          Aucun intervenant
                        </div>
                      )}
                      {catStaff.map(s => (
                        <div key={s.id} className="flex items-center gap-3 px-6 py-2.5 border-b border-gray-50 last:border-0">
                          {editStaff?.id === s.id ? (
                            <form onSubmit={handleUpdateStaff} className="flex items-center gap-2 flex-1">
                              <input autoFocus value={staffForm.firstName} onChange={e => setStaffForm(f => ({ ...f, firstName: e.target.value }))}
                                placeholder="Prénom" className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green/30" />
                              <input value={staffForm.lastName} onChange={e => setStaffForm(f => ({ ...f, lastName: e.target.value }))}
                                placeholder="Nom" className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green/30" />
                              <input value={staffForm.phone} onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))}
                                placeholder="Téléphone" className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green/30" />
                              <button type="submit" disabled={staffSaving} className="p-1 text-green hover:bg-green/10 rounded"><Check size={13} /></button>
                              <button type="button" onClick={() => setEditStaff(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={13} /></button>
                            </form>
                          ) : (
                            <>
                              <div className="flex-1">
                                <span className={`text-sm font-medium ${s.isActive ? 'text-charcoal' : 'text-gray-400'}`}>{s.fullName}</span>
                                {s.phone && (
                                  <span className="ml-2 text-xs text-gray-400 flex-inline items-center gap-1">
                                    <Phone size={10} className="inline mr-0.5" />{s.phone}
                                  </span>
                                )}
                                {!s.isActive && <span className="ml-2 text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-400">Inactif</span>}
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => startEditStaff(s)} className="p-1 text-gray-400 hover:text-charcoal rounded hover:bg-gray-100"><PencilLine size={12} /></button>
                                <button onClick={() => handleToggleStaffActive(s)} className="text-[10px] px-1.5 py-0.5 text-gray-400 hover:text-amber-500 rounded hover:bg-gray-100">
                                  {s.isActive ? 'Désact.' : 'Activer'}
                                </button>
                                <button onClick={() => handleDeleteStaff(s)} className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100"><Trash2 size={12} /></button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}

                      {/* Add staff form */}
                      {showStaffForm === cat.id ? (
                        <form onSubmit={e => handleCreateStaff(e, cat.id)}
                          className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-t border-gray-100">
                          <input autoFocus required value={staffForm.firstName} onChange={e => setStaffForm(f => ({ ...f, firstName: e.target.value }))}
                            placeholder="Prénom *" className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green/30" />
                          <input required value={staffForm.lastName} onChange={e => setStaffForm(f => ({ ...f, lastName: e.target.value }))}
                            placeholder="Nom *" className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green/30" />
                          <input value={staffForm.phone} onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))}
                            placeholder="Téléphone" className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green/30" />
                          <button type="submit" disabled={staffSaving}
                            className="flex items-center gap-1 px-3 py-1.5 bg-charcoal text-white text-xs rounded hover:opacity-90 disabled:opacity-50">
                            <Check size={12} /> Ajouter
                          </button>
                          <button type="button" onClick={() => { setShowStaffForm(null); setStaffForm({ firstName: '', lastName: '', phone: '' }); }}
                            className="p-1 text-gray-400 hover:text-charcoal rounded hover:bg-gray-100"><X size={14} /></button>
                        </form>
                      ) : (
                        <button
                          onClick={() => { setShowStaffForm(cat.id); setStaffForm({ firstName: '', lastName: '', phone: '' }); setEditStaff(null); }}
                          className="w-full flex items-center gap-2 px-6 py-2.5 text-xs text-gray-400 hover:text-charcoal hover:bg-gray-50 transition-colors border-t border-gray-50">
                          <Plus size={12} /> Ajouter un intervenant
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
