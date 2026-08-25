'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import { pmsUnits, pmsMaintenanceCategories, pmsMaintenanceStaff } from '@/lib/pms';
import type { UnitDto, MaintenanceStaffDto } from '@/lib/pmsTypes';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

const FLOORS = [2, 4, 5, 6];
const HOUSEKEEPING_CATEGORY_NAME = 'Femme/Valet de chambre';

type MenageAction = 'Propre' | 'Sale';

function UnitCard({ unit, onUpdate, onOpenPropreModal }: { unit: UnitDto; onUpdate: () => void; onOpenPropreModal: (unit: UnitDto) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  async function patch(statut: MenageAction) {
    if (statut === 'Propre') { onOpenPropreModal(unit); return; }
    setBusy(true); setErr('');
    try { await pmsUnits.patchMenage(unit.id, statut); onUpdate(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  }
  async function toggleHs() {
    setBusy(true); setErr('');
    try { await pmsUnits.patchHs(unit.id, !unit.horsService); onUpdate(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  }

  const propre = unit.statutMenage === 'Propre';
  const occupe = !!unit.currentFolioNumber;

  const bg = unit.horsService
    ? 'bg-charcoal/8 border-charcoal/20'
    : occupe
      ? (propre ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200')
      : (propre ? 'bg-green/6 border-green/20' : 'bg-red-50 border-red-200');

  return (
    <div className={`rounded-xl border p-3.5 space-y-2.5 ${bg}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-charcoal text-sm">Appt {unit.pmsRoomNo}</p>
          <p className="text-[11px] text-gray-500">{unit.pmsType} · {unit.pmsGamme}</p>
        </div>
        {unit.horsService
          ? <span className="text-[10px] font-bold bg-charcoal text-white px-2 py-0.5 rounded">HS</span>
          : propre
            ? <CheckCircle size={16} className="text-green-dark shrink-0" />
            : <XCircle    size={16} className="text-red-500 shrink-0" />}
      </div>

      {unit.currentFolioNumber && (
        <p className={`text-[11px] px-2 py-0.5 rounded w-fit ${propre ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'}`}>
          <span className="font-mono">Occupé · {unit.currentFolioNumber}</span>
          {unit.currentGuestName && (
            <> · <span className="font-semibold">{unit.currentGuestName}</span>{unit.currentCompanyName && <> ({unit.currentCompanyName})</>}</>
          )}
        </p>
      )}

      {err && <p className="text-[11px] text-red-600">{err}</p>}

      <div className="flex gap-1.5">
        <button onClick={() => patch('Propre')} disabled={busy || propre}
          className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg bg-green/15 text-green-dark hover:bg-green/25 disabled:opacity-40 transition-colors">
          Propre
        </button>
        <button onClick={() => patch('Sale')} disabled={busy || !propre}
          className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-40 transition-colors">
          Sale
        </button>
        <button onClick={toggleHs} disabled={busy}
          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-charcoal/8 text-charcoal/60 hover:bg-charcoal/15 disabled:opacity-40 transition-colors">
          {unit.horsService ? 'Réactiver' : 'HS'}
        </button>
      </div>
    </div>
  );
}

export default function GouvernantePage() {
  const [units, setUnits]   = useState<UnitDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalUnit, setModalUnit] = useState<UnitDto | null>(null);
  const [staffList, setStaffList] = useState<MaintenanceStaffDto[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');

  const load = useCallback(() => {
    pmsUnits.getAll().then(u => { setUnits(u); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  // Charge la liste des femmes/valets de chambre à la première ouverture de la modale.
  const openPropreModal = useCallback(async (unit: UnitDto) => {
    setModalUnit(unit);
    setStaffError('');
    if (staffList.length > 0) return;
    setStaffLoading(true);
    try {
      const categories = await pmsMaintenanceCategories.getAll();
      const cat = categories.find(c => c.name === HOUSEKEEPING_CATEGORY_NAME && c.isActive);
      if (!cat) {
        setStaffError(`Catégorie "${HOUSEKEEPING_CATEGORY_NAME}" introuvable. Créez-la via /pms/personnel.`);
        setStaffList([]);
        return;
      }
      const staff = await pmsMaintenanceStaff.getAll({ categoryId: cat.id, activeOnly: true });
      setStaffList(staff);
      if (staff.length === 0) {
        setStaffError('Aucun personnel actif dans cette catégorie. Ajoutez-en via /pms/personnel.');
      }
    } catch (e: unknown) {
      setStaffError(e instanceof Error ? e.message : "Impossible de charger la liste du personnel.");
    } finally {
      setStaffLoading(false);
    }
  }, [staffList.length]);

  const toClean = units.filter(u => u.statutMenage === 'Sale' && !u.horsService).length;
  const hs      = units.filter(u => u.horsService).length;

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Gouvernante" />
      <div className="flex-1 p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI */}
            <div className="flex gap-3 flex-wrap">
              {[
                { label: 'Propres (Dispo)', value: units.filter(u => u.statutMenage === 'Propre' && !u.horsService && !u.currentFolioNumber).length, cls: 'bg-green/10 border-green/20 text-green-dark' },
                { label: 'À nettoyer (Dispo)', value: units.filter(u => u.statutMenage === 'Sale' && !u.horsService && !u.currentFolioNumber).length, cls: units.filter(u => u.statutMenage === 'Sale' && !u.horsService && !u.currentFolioNumber).length > 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-100' },
                { label: 'Occupés (Recouche)', value: units.filter(u => u.currentFolioNumber && u.statutMenage === 'Sale').length, cls: units.filter(u => u.currentFolioNumber && u.statutMenage === 'Sale').length > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-gray-100' },
                { label: 'Occupés (Propre)', value: units.filter(u => u.currentFolioNumber && u.statutMenage === 'Propre').length, cls: units.filter(u => u.currentFolioNumber && u.statutMenage === 'Propre').length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-100' },
                { label: 'Hors service', value: hs, cls: hs > 0 ? 'bg-charcoal/8 border-charcoal/20 text-charcoal/60' : 'bg-white border-gray-100' },
              ].map(({ label, value, cls }) => (
                <div key={label} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${cls}`}>
                  <span className="opacity-60">{label}</span>
                  <span className="font-bold text-base">{value}</span>
                </div>
              ))}
            </div>

            {/* Floor plans */}
            {FLOORS.map(floor => {
              const floorUnits = units.filter(u => u.floor === floor);
              const leftCol  = floorUnits.filter(u => u.planCol === 0).sort((a, b) => a.planRow - b.planRow);
              const rightCol = floorUnits.filter(u => u.planCol === 1).sort((a, b) => a.planRow - b.planRow);
              const maxRows  = Math.max(leftCol.length, rightCol.length);
              if (floorUnits.length === 0) return null;

              return (
                <div key={floor}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-0.5 h-5 bg-green rounded-full" />
                    <h2 className="text-sm font-semibold text-charcoal">Étage {floor}</h2>
                    <span className="text-xs text-gray-400">({floorUnits.length} appt)</span>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
                      {/* Left column */}
                      <div className="space-y-2">
                        {leftCol.map(u => (
                          <UnitCard key={u.id} unit={u} onUpdate={load} onOpenPropreModal={openPropreModal} />
                        ))}
                        {Array.from({ length: maxRows - leftCol.length }).map((_, i) => (
                          <div key={i} className="rounded-xl border border-dashed border-gray-100 p-3.5 min-h-[4rem]" />
                        ))}
                      </div>
                      {/* Couloir */}
                      <div className="flex flex-col items-center justify-center self-stretch px-2">
                        <div className="w-px flex-1 bg-gray-100" />
                        <span className="text-[9px] text-gray-300 writing-mode-vertical rotate-90 my-3 tracking-widest uppercase">couloir</span>
                        <div className="w-px flex-1 bg-gray-100" />
                      </div>
                      {/* Right column */}
                      <div className="space-y-2">
                        {rightCol.map(u => (
                          <UnitCard key={u.id} unit={u} onUpdate={load} onOpenPropreModal={openPropreModal} />
                        ))}
                        {Array.from({ length: maxRows - rightCol.length }).map((_, i) => (
                          <div key={i} className="rounded-xl border border-dashed border-gray-100 p-3.5 min-h-[4rem]" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {modalUnit && (
        <PropreConfirmModal
          unit={modalUnit}
          staffList={staffList}
          staffLoading={staffLoading}
          staffError={staffError}
          onClose={() => setModalUnit(null)}
          onDone={async () => { setModalUnit(null); load(); }}
        />
      )}
    </div>
  );
}

function PropreConfirmModal({
  unit, staffList, staffLoading, staffError, onClose, onDone,
}: {
  unit: UnitDto;
  staffList: MaintenanceStaffDto[];
  staffLoading: boolean;
  staffError: string;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [staffId, setStaffId] = useState<number>(0);
  const [notes,   setNotes]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onEsc); document.body.style.overflow = ''; };
  }, [onClose]);

  async function submit() {
    if (!staffId) { setError('Sélectionnez la personne qui a nettoyé.'); return; }
    setSaving(true); setError('');
    try {
      await pmsUnits.patchMenage(unit.id, 'Propre', staffId, notes.trim() || undefined);
      await onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-charcoal">Chambre remise propre</h2>
            <p className="text-xs text-gray-400 mt-0.5">Apt {unit.pmsRoomNo} · {unit.pmsType} {unit.pmsGamme}</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-charcoal flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {(error || staffError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
              {error || staffError}
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Personne qui a nettoyé <span className="text-red-500">*</span>
            </label>
            <select value={staffId} onChange={e => setStaffId(Number(e.target.value))}
              disabled={staffLoading || staffList.length === 0}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40 disabled:opacity-50">
              <option value={0}>{staffLoading ? 'Chargement…' : '— Sélectionner —'}</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.fullName}{s.phone ? ` · ${s.phone}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Observations (optionnel)
            </label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Ex : linge changé, dégât signalé…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40 resize-none" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-charcoal">Annuler</button>
          <button type="button" onClick={submit} disabled={saving || !staffId}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-dark text-white text-sm font-medium rounded-lg hover:bg-green disabled:opacity-60">
            {saving ? 'Enregistrement…' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}
