'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import { pmsUnits } from '@/lib/pms';
import type { UnitDto } from '@/lib/pmsTypes';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const FLOORS = [2, 4, 5, 6];

type MenageAction = 'Propre' | 'Sale';

function UnitCard({ unit, onUpdate }: { unit: UnitDto; onUpdate: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  async function patch(statut: MenageAction) {
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
  const bg = unit.horsService
    ? 'bg-charcoal/8 border-charcoal/20'
    : propre
      ? 'bg-green/6 border-green/20'
      : 'bg-red-50 border-red-200';

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
        <p className="text-[11px] text-green-dark font-mono bg-green/10 px-2 py-0.5 rounded">
          Occupé · {unit.currentFolioNumber}
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

  const load = useCallback(() => {
    pmsUnits.getAll().then(u => { setUnits(u); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const toClean = units.filter(u => u.statutMenage === 'Sale' && !u.horsService).length;
  const hs      = units.filter(u => u.horsService).length;

  return (
    <div className="flex flex-col h-full overflow-auto">
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
                { label: 'Propres', value: units.filter(u => u.statutMenage === 'Propre' && !u.horsService).length, cls: 'bg-green/10 border-green/20 text-green-dark' },
                { label: 'À nettoyer', value: toClean, cls: toClean > 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-100' },
                { label: 'Hors service', value: hs, cls: hs > 0 ? 'bg-charcoal/8 border-charcoal/20 text-charcoal/60' : 'bg-white border-gray-100' },
                { label: 'Occupés', value: units.filter(u => u.currentFolioNumber).length, cls: 'bg-white border-gray-100' },
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
                          <UnitCard key={u.id} unit={u} onUpdate={load} />
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
                          <UnitCard key={u.id} unit={u} onUpdate={load} />
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
    </div>
  );
}
