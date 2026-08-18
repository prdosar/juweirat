'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { prestations } from '@/lib/api';
import type { PrestationAnnexeDto, PrestationConsumptionDto } from '@/lib/types';
import {
  ArrowLeft, Sparkles, Users, Home as HomeIcon, RotateCcw, DollarSign,
} from 'lucide-react';

const MODES: Record<string, string> = {
  ParPersonneParNuit: 'Par personne / nuit',
  ParPersonne:        'Par personne (forfait)',
  Forfait:            'Forfait fixe',
};

function iso(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function fmtDate(d: string) {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PrestationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const prestationId = Number(id);

  const [prestation, setPrestation] = useState<PrestationAnnexeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadPrestation = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setPrestation(await prestations.getById(prestationId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg === 'Failed to fetch' ? "Impossible de joindre l'API. Vérifiez que le backend est démarré." : msg);
    } finally {
      setLoading(false);
    }
  }, [prestationId]);

  useEffect(() => { loadPrestation(); }, [loadPrestation]);

  if (loading) return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Prestation" />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
      </div>
    </div>
  );

  if (loadError || !prestation) return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Prestation" />
      <div className="flex-1 p-6">
        <button onClick={() => router.push('/prestations')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal mb-4">
          <ArrowLeft size={14} /> Retour
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {loadError || 'Prestation introuvable.'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Prestation" />
      <div className="flex-1 p-6 space-y-4">
        <button onClick={() => router.push('/prestations')} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-charcoal">
          <ArrowLeft size={13} /> Retour aux prestations
        </button>

        {/* Prestation summary */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green/15 flex items-center justify-center shrink-0">
            <Sparkles size={22} className="text-green-dark" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-charcoal truncate">{prestation.nameFr}</h1>
              {prestation.isActive ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green/20 text-green-dark">Active</span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-charcoal/10 text-charcoal/60">Inactive</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {MODES[prestation.mode] ?? prestation.mode}
              {prestation.nameEn && prestation.nameEn !== prestation.nameFr && ` · ${prestation.nameEn}`}
            </p>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Prix inclus</p>
              <p className="text-sm font-bold text-charcoal">{prestation.prixInclus.toLocaleString('fr')} <span className="text-xs text-gray-400 font-normal">FCFA</span></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Prix seule</p>
              <p className="text-sm font-bold text-charcoal">{prestation.prixSeule.toLocaleString('fr')} <span className="text-xs text-gray-400 font-normal">FCFA</span></p>
            </div>
          </div>
        </div>

        <ConsumptionsPanel prestationId={prestationId} />
      </div>
    </div>
  );
}

/* ──────────────────── Consumptions panel ──────────────────── */
function ConsumptionsPanel({ prestationId }: { prestationId: number }) {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [from, setFrom] = useState(iso(firstOfMonth));
  const [to, setTo]     = useState(iso(now));
  const [list, setList] = useState<PrestationConsumptionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setList(await prestations.getConsumptions(prestationId, from, to));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg === 'Failed to fetch' ? "Impossible de joindre l'API." : msg);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [prestationId, from, to]);

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
    const totalQty    = list.reduce((s, c) => s + c.quantite, 0);
    const totalAmount = list.reduce((s, c) => s + c.total,    0);
    const uniqueClients = new Set(list.map(c => c.clientId ?? `guest:${c.clientName ?? c.sourceId}`)).size;
    const uniqueRooms   = new Set(list.filter(c => c.roomNumber).map(c => c.roomNumber!)).size;
    return { totalQty, totalAmount, uniqueClients, uniqueRooms };
  }, [list]);

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">Consommations sur la période</h2>

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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Quantité totale"   value={totals.totalQty.toString()}                             Icon={Sparkles} />
        <StatCard label="Chiffre d'affaires" value={`${totals.totalAmount.toLocaleString('fr')} FCFA`}       Icon={DollarSign} />
        <StatCard label="Clients distincts"  value={totals.uniqueClients.toString()}                        Icon={Users} />
        <StatCard label="Chambres distinctes" value={totals.uniqueRooms.toString()}                         Icon={HomeIcon} />
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Aucune consommation sur cette période.</div>
      ) : (
        <div className="border border-gray-100 rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60">
              <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left font-medium">Date</th>
                <th className="px-4 py-2.5 text-left font-medium">Source</th>
                <th className="px-4 py-2.5 text-left font-medium">Client</th>
                <th className="px-4 py-2.5 text-left font-medium">Chambre</th>
                <th className="px-4 py-2.5 text-right font-medium">Quantité</th>
                <th className="px-4 py-2.5 text-right font-medium">P.U.</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map(c => (
                <tr key={`${c.source}-${c.sourceId}`} className="hover:bg-gray-50/70">
                  <td className="px-4 py-2.5 text-gray-500">{fmtDate(c.date)}</td>
                  <td className="px-4 py-2.5">
                    {c.source === 'Reservation' ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green/20 text-green-dark">Résa</span>
                        {c.reference && <span className="font-mono text-xs text-gray-500">{c.reference}</span>}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-charcoal/10 text-charcoal/70">Vente directe</span>
                        {c.reference && <span className="font-mono text-xs text-gray-500">{c.reference}</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-charcoal">
                    {c.clientName ?? <span className="text-gray-300">Anonyme</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {c.roomNumber ? (
                      <span>
                        <span className="font-medium text-charcoal">Apt {c.roomNumber}</span>
                        {c.roomNameFr && <span className="text-xs text-gray-400 ml-1">· {c.roomNameFr}</span>}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-charcoal">{c.quantite}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{c.prixUnitaireSnapshot.toLocaleString('fr')}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-charcoal">
                    {c.total.toLocaleString('fr')} <span className="text-xs text-gray-400 font-normal">FCFA</span>
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

function StatCard({ label, value, Icon }: { label: string; value: string; Icon: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="bg-gray-50/60 rounded-lg p-3 border border-gray-100">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
        <Icon size={11} /> {label}
      </p>
      <p className="text-lg font-bold text-charcoal mt-0.5">{value}</p>
    </div>
  );
}
