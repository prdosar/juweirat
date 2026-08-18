'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { pmsFolios, pmsUnits } from '@/lib/pms';
import type { UnitDto } from '@/lib/pmsTypes';
import { ArrowLeft } from 'lucide-react';

const SEGMENTS  = ['Direct', 'Agence', 'Société', 'Gouvernement', 'ONG', 'Autre'];
const PAY_MODES = ['Espèces', 'Carte bancaire', 'Virement', 'Mobile Money'];
const KWH_PRICE = 230; // FCFA par kWh

function nights(arrival: string, departure: string): number {
  if (!arrival || !departure) return 0;
  const a = new Date(arrival), d = new Date(departure);
  return Math.max(0, Math.round((d.getTime() - a.getTime()) / 86_400_000));
}

// Grille tarifaire Juweirat :
// < 15 nuits  → tarifNuit  × n  (électricité incluse)
// 15–29 nuits → tarifN15   × n  (tarif/nuit 15 jours, hors élec)
// ≥ 30 nuits  → tarifN30   × n  (tarif/nuit mensuel, hors élec)
function tierFor(n: number): { label: string; elecIncluded: boolean } {
  if (n >= 30) return { label: 'Forfait mensuel',   elecIncluded: false };
  if (n >= 15) return { label: 'Forfait 15 jours',  elecIncluded: false };
  return            { label: 'Nuitée',              elecIncluded: true  };
}

function computeRate(unit: UnitDto | null, n: number): number {
  if (!unit || n === 0) return 0;
  if (n >= 30) return unit.tarifN30;
  if (n >= 15) return unit.tarifN15;
  return unit.tarifNuit;
}

export default function NewFolioPage() {
  const router = useRouter();
  const [units, setUnits]   = useState<UnitDto[]>([]);
  const [unitId, setUnitId] = useState('');
  const [nom,      setNom]         = useState('');
  const [prenom,   setPrenom]      = useState('');
  const [societe,  setSociete]     = useState('');
  const [reservataire, setReservataire] = useState('');
  const [segment,  setSegment]     = useState('Direct');
  const [pax,      setPax]         = useState('1');
  const [arrival,  setArrival]     = useState('');
  const [departure, setDeparture]  = useState('');
  const [pdjParJour, setPdjParJour] = useState('');
  const [pdjPrix,  setPdjPrix]     = useState('');
  const [arrhes,   setArrhes]      = useState('');
  const [payMode,  setPayMode]     = useState('');
  const [kwh,      setKwh]         = useState('');
  const [note,     setNote]        = useState('');
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    pmsUnits.getAll().then(u => setUnits(u.filter(x => !x.horsService)));
  }, []);

  const selectedUnit = units.find(u => String(u.id) === unitId) ?? null;
  const n            = nights(arrival, departure);
  const tier         = tierFor(n);
  const autoRate     = computeRate(selectedUnit, n);
  const elecCost     = !tier.elecIncluded ? (Number(kwh) || 0) * KWH_PRICE : 0;
  const totalEstime  = autoRate * n + elecCost;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId) { setError('Choisissez un appartement'); return; }
    if (!arrival || !departure) { setError('Dates de séjour obligatoires'); return; }
    if (n <= 0) { setError('La date de départ doit être après l\'arrivée'); return; }

    setBusy(true); setError('');
    try {
      const folio = await pmsFolios.create({
        unitId:      Number(unitId),
        nom:         nom         || null,
        prenom:      prenom      || null,
        societe:     societe     || null,
        reservataire: reservataire || null,
        segment,
        pax:         Number(pax) || 1,
        arrival,
        departure,
        pdjParJour:  Number(pdjParJour) || 0,
        pdjPrix:     Number(pdjPrix)    || 0,
        arrhes:      Number(arrhes)     || 0,
        payMode:     payMode || null,
        kwh:         Number(kwh) || 0,
        note:        note    || null,
        resaStatus:  'Confirmee',
      });
      router.push(`/pms/folios/${folio.id}`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  }

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div>
        <label className="block text-xs text-gray-500 mb-1">{label}</label>
        {children}
      </div>
    );
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/30 bg-white";

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Nouveau folio" />
      <div className="flex-1 p-6 max-w-2xl space-y-5">

        <Link href="/pms/folios" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal">
          <ArrowLeft size={16} /> Retour aux folios
        </Link>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Séjour */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Séjour</h2>
            <Field label="Appartement *">
              <select value={unitId} onChange={e => setUnitId(e.target.value)} required className={inputCls}>
                <option value="">— Choisir un appartement —</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.pmsRoomNo} — {u.pmsType} {u.pmsGamme} ({u.tarifNuit.toLocaleString('fr')} FCFA/nuit)
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Arrivée *">
                <input type="date" value={arrival} onChange={e => setArrival(e.target.value)} required className={inputCls} />
              </Field>
              <Field label="Départ *">
                <input type="date" value={departure} onChange={e => setDeparture(e.target.value)} required className={inputCls} />
              </Field>
            </div>
            {n > 0 && selectedUnit && (
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1.5 border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">Durée</span>
                  <span className="font-medium text-charcoal">{n} nuit{n > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Palier tarifaire</span>
                  <span className="font-medium text-charcoal">{tier.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tarif / nuit</span>
                  <span className="font-semibold text-green-dark">{autoRate.toLocaleString('fr')} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Électricité</span>
                  <span className={tier.elecIncluded ? 'text-green-dark font-medium' : 'text-amber-600 font-medium'}>
                    {tier.elecIncluded ? 'Incluse' : `Hors forfait — ${KWH_PRICE} FCFA/kWh`}
                  </span>
                </div>
                {!tier.elecIncluded && (
                  <div className="border-t border-gray-200 pt-2 mt-1 space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">kWh consommés par l'occupant</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={kwh}
                        onChange={e => setKwh(e.target.value)}
                        placeholder="0"
                        className={`${inputCls} w-32`}
                      />
                      <span className="text-xs text-gray-400">kWh</span>
                      {Number(kwh) > 0 && (
                        <span className="text-xs font-semibold text-amber-600 ml-auto">
                          + {elecCost.toLocaleString('fr')} FCFA
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1">
                  <span className="text-gray-500">Total hébergement estimé</span>
                  <span className="font-bold text-charcoal">{totalEstime.toLocaleString('fr')} FCFA</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pax">
                <input type="number" min={1} max={10} value={pax} onChange={e => setPax(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Segment">
                <select value={segment} onChange={e => setSegment(e.target.value)} className={inputCls}>
                  {SEGMENTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Client */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Client</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom">
                <input value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Prénom" className={inputCls} />
              </Field>
              <Field label="Nom">
                <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom" className={inputCls} />
              </Field>
            </div>
            <Field label="Société">
              <input value={societe} onChange={e => setSociete(e.target.value)} placeholder="Nom de la société (optionnel)" className={inputCls} />
            </Field>
            <Field label="Réservataire (si différent du client)">
              <input value={reservataire} onChange={e => setReservataire(e.target.value)} placeholder="Contact qui a réservé" className={inputCls} />
            </Field>
          </div>

          {/* Petit-déjeuner & paiement */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Options & paiement</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="PDJ pers/jour">
                <input type="number" min={0} value={pdjParJour} onChange={e => setPdjParJour(e.target.value)} placeholder="0" className={inputCls} />
              </Field>
              <Field label="PDJ prix/pers (FCFA)">
                <input type="number" min={0} value={pdjPrix} onChange={e => setPdjPrix(e.target.value)} placeholder="0" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Arrhes reçues (FCFA)">
                <input type="number" min={0} value={arrhes} onChange={e => setArrhes(e.target.value)} placeholder="0" className={inputCls} />
              </Field>
              <Field label="Mode de paiement">
                <select value={payMode} onChange={e => setPayMode(e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  {PAY_MODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Note interne">
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                placeholder="Observations, demandes particulières…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green/30" />
            </Field>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={busy}
              className="bg-charcoal text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50">
              {busy ? 'Création…' : 'Créer le folio'}
            </button>
            <Link href="/pms/folios"
              className="text-sm text-gray-500 px-4 py-2.5 rounded-lg hover:bg-gray-100">
              Annuler
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
}
