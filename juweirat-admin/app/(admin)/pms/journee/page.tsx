'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { pmsConfig, pmsFolios, pmsCloture } from '@/lib/pms';
import type { HotelConfigDto, FolioDto, CloturePreviewDto } from '@/lib/pmsTypes';
import { LogIn, LogOut, Users, Home, AlertTriangle } from 'lucide-react';

const RESA_FR: Record<string, string> = {
  Option: 'Option', Confirmee: 'Confirmée', Garantie: 'Garantie',
  NoShow: 'No Show', Annulee: 'Annulée',
};

function Chip({ label, value, cls }: { label: string; value: string | number; cls?: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${cls ?? 'bg-white border border-gray-100'}`}>
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="font-semibold text-charcoal">{value}</span>
    </div>
  );
}

function FolioRow({ f, onAction }: { f: FolioDto; onAction: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  async function doCheckin() {
    setBusy(true); setErr('');
    try { await pmsFolios.checkIn(f.id); onAction(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  }
  async function doCheckout() {
    setBusy(true); setErr('');
    try { await pmsFolios.checkOut(f.id); onAction(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-4 py-3 px-4 hover:bg-gray-50/60 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <Link href={`/pms/folios/${f.id}`} className="font-semibold text-charcoal hover:text-green-dark text-sm truncate block">
          {f.guest ?? (`${f.prenom ?? ''} ${f.nom ?? ''}`.trim() || '—')}
        </Link>
        <p className="text-xs text-gray-400 font-mono">{f.number} · {f.unitLabel}</p>
        {err && <p className="text-xs text-red-600 mt-0.5">{err}</p>}
      </div>
      <div className="text-xs text-gray-500 shrink-0 text-right">
        <p>{f.arrival} → {f.departure}</p>
        <p>{f.nights} nuit{f.nights > 1 ? 's' : ''} · {f.pax} pax</p>
      </div>
      <div className="flex gap-2 shrink-0">
        {!f.checkedIn && !f.closed && (
          <button onClick={doCheckin} disabled={busy}
            className="flex items-center gap-1.5 bg-green text-charcoal text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50">
            <LogIn size={13} /> Check-in
          </button>
        )}
        {f.checkedIn && !f.closed && (
          <button onClick={doCheckout} disabled={busy}
            className="flex items-center gap-1.5 bg-charcoal text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50">
            <LogOut size={13} /> Check-out
          </button>
        )}
        <Link href={`/pms/folios/${f.id}`}
          className="text-xs text-gray-400 hover:text-charcoal px-2 py-1.5 rounded-lg hover:bg-gray-100 border border-gray-200">
          →
        </Link>
      </div>
    </div>
  );
}

export default function JourneePage() {
  const [config, setConfig]   = useState<HotelConfigDto | null>(null);
  const [folios, setFolios]   = useState<FolioDto[]>([]);
  const [preview, setPreview] = useState<CloturePreviewDto | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [cfg, fl, pv] = await Promise.all([
      pmsConfig.get(),
      pmsFolios.getAll({ closed: false }),
      pmsCloture.preview(),
    ]);
    setConfig(cfg); setFolios(fl); setPreview(pv);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const today     = config?.dateHotel ?? '';
  const arrivals  = folios.filter(f => f.arrival === today && !f.checkedIn && f.resaStatus !== 'Annulee' && f.resaStatus !== 'NoShow');
  const departs   = folios.filter(f => f.departure === today && f.checkedIn && !f.closed);
  const presents  = folios.filter(f => f.checkedIn && !f.closed && f.arrival <= today && f.departure > today);
  const toClean   = folios.filter(f => f.checkedIn && !f.closed); // placeholder

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Écran journée" />
      <div className="flex-1 p-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Date hôtel + KPI */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="bg-charcoal text-white px-4 py-2.5 rounded-xl flex items-center gap-2">
                <span className="text-xs text-white/50 uppercase tracking-wider">Date hôtel</span>
                <span className="font-bold text-lg">{today}</span>
              </div>
              <Chip label="Présents" value={presents.length} />
              <Chip label="Arrivées" value={arrivals.length} cls={arrivals.length > 0 ? 'bg-amber-50 border border-amber-200' : undefined} />
              <Chip label="Départs"  value={departs.length}  cls={departs.length  > 0 ? 'bg-blue-50  border border-blue-200'  : undefined} />
              {preview && !preview.canClose && (
                <div className="flex items-center gap-2 text-amber-700 text-xs bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                  <AlertTriangle size={13} />
                  {preview.pendingArrivals.length + preview.pendingDepartures.length} action(s) avant clôture
                </div>
              )}
            </div>

            {/* Arrivées prévues */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
                <LogIn size={15} className="text-green-dark" />
                <h2 className="text-sm font-semibold text-charcoal">Arrivées prévues ({arrivals.length})</h2>
              </div>
              {arrivals.length === 0
                ? <p className="px-5 py-6 text-sm text-gray-400 text-center">Aucune arrivée prévue aujourd'hui</p>
                : arrivals.map(f => <FolioRow key={f.id} f={f} onAction={load} />)}
            </div>

            {/* Départs prévus */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
                <LogOut size={15} className="text-charcoal/60" />
                <h2 className="text-sm font-semibold text-charcoal">Départs prévus ({departs.length})</h2>
              </div>
              {departs.length === 0
                ? <p className="px-5 py-6 text-sm text-gray-400 text-center">Aucun départ prévu aujourd'hui</p>
                : departs.map(f => <FolioRow key={f.id} f={f} onAction={load} />)}
            </div>

            {/* Présents */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
                <Users size={15} className="text-charcoal/60" />
                <h2 className="text-sm font-semibold text-charcoal">Présents ({presents.length})</h2>
              </div>
              {presents.length === 0
                ? <p className="px-5 py-6 text-sm text-gray-400 text-center">Aucun client en chambre</p>
                : presents.map(f => (
                  <div key={f.id} className="flex items-center gap-4 py-3 px-4 hover:bg-gray-50/60 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <Link href={`/pms/folios/${f.id}`} className="font-semibold text-charcoal hover:text-green-dark text-sm">
                        {f.guest ?? '—'}
                      </Link>
                      <p className="text-xs text-gray-400 font-mono">{f.number} · {f.unitLabel}</p>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      <p>Départ : {f.departure}</p>
                      {f.solde > 0 && <p className="text-red-500 font-semibold">Solde : {f.solde.toLocaleString('fr')} FCFA</p>}
                    </div>
                    <Home size={14} className="text-gray-300 shrink-0" />
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
