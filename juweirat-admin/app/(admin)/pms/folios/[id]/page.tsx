'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { pmsFolios } from '@/lib/pms';
import type { FolioDto } from '@/lib/pmsTypes';
import { ArrowLeft, LogIn, LogOut, Banknote, MoveRight, FileText } from 'lucide-react';

const TIER_LABELS: Record<string, string> = {
  Nuitee: 'Nuitée', N15Nuits: 'Forfait 15 nuits', N30Nuits: 'Forfait 30 nuits',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}
function Row({ label, value, cls }: { label: string; value: React.ReactNode; cls?: string }) {
  return (
    <div className="flex justify-between items-baseline text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-charcoal ${cls ?? ''}`}>{value}</span>
    </div>
  );
}

export default function FolioDetailPage() {
  const { id }                    = useParams<{ id: string }>();
  const [folio, setFolio]         = useState<FolioDto | null>(null);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState('');
  const [encaisserAmount, setEncaisserAmount] = useState('');
  const [payMode, setPayMode]     = useState('');
  const [showEncaisser, setShowEncaisser]     = useState(false);

  const load = useCallback(() => {
    pmsFolios.getById(Number(id)).then(f => { setFolio(f); setLoading(false); });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function act(fn: () => Promise<FolioDto>) {
    setBusy(true); setError('');
    try { const f = await fn(); setFolio(f); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  }

  async function doEncaisser() {
    const m = parseInt(encaisserAmount);
    if (!m || m <= 0) { setError('Montant invalide'); return; }
    await act(() => pmsFolios.encaisser(Number(id), m, payMode || undefined));
    setShowEncaisser(false); setEncaisserAmount(''); setPayMode('');
  }
  async function doTransfer() {
    if (!confirm('Transférer le solde en débiteur et clôturer le folio ?')) return;
    await act(() => pmsFolios.transferDebiteur(Number(id)));
  }
  async function doFacturer() {
    setBusy(true); setError('');
    try { await pmsFolios.facturer(Number(id)); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  }

  if (loading) return (
    <div className="flex flex-col h-full">
      <Header title="Folio" />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!folio) return (
    <div className="flex flex-col h-full"><Header title="Folio" />
      <div className="flex-1 flex items-center justify-center text-gray-400">Folio introuvable</div>
    </div>
  );

  const f = folio;
  const avoir = Math.max(0, f.paid + f.arrhes - f.totalGeneral);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={`Folio ${f.number}`} />
      <div className="flex-1 p-6 max-w-3xl space-y-5">

        <Link href="/pms/folios" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal">
          <ArrowLeft size={16} /> Retour aux folios
        </Link>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono font-bold text-lg text-green-dark">{f.number}</p>
              <p className="text-base font-semibold text-charcoal mt-0.5">
                {f.guest ?? `${f.prenom ?? ''} ${f.nom ?? ''}`.trim() || '—'}
              </p>
              {f.societe && <p className="text-sm text-gray-500">{f.societe}</p>}
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${f.resaStatus === 'Confirmee' ? 'bg-green/15 text-green-dark' : 'bg-gray-100 text-gray-600'}`}>
                  {f.resaStatus}
                </span>
                {f.checkedIn && !f.closed && <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green text-charcoal">En chambre</span>}
                {f.closed && <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-charcoal/10 text-charcoal/60">Clôturé</span>}
              </div>
            </div>

            {/* Actions */}
            {!f.closed && (
              <div className="flex flex-col gap-2 shrink-0">
                {!f.checkedIn && (
                  <button onClick={() => act(() => pmsFolios.checkIn(f.id))} disabled={busy}
                    className="flex items-center gap-2 bg-green text-charcoal text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
                    <LogIn size={15} /> Check-in
                  </button>
                )}
                {f.checkedIn && (
                  <button onClick={() => act(() => pmsFolios.checkOut(f.id))} disabled={busy}
                    className="flex items-center gap-2 bg-charcoal text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
                    <LogOut size={15} /> Check-out
                  </button>
                )}
                <button onClick={() => setShowEncaisser(v => !v)} disabled={busy}
                  className="flex items-center gap-2 border border-green/40 text-green-dark text-sm font-medium px-4 py-2 rounded-lg hover:bg-green/5 disabled:opacity-50">
                  <Banknote size={15} /> Encaisser
                </button>
                {f.solde > 0 && (
                  <button onClick={doTransfer} disabled={busy}
                    className="flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    <MoveRight size={15} /> → Débiteur
                  </button>
                )}
                {!f.factureId && (
                  <button onClick={doFacturer} disabled={busy}
                    className="flex items-center gap-2 border border-charcoal/20 text-charcoal text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    <FileText size={15} /> Émettre facture
                  </button>
                )}
                {f.factureId && (
                  <p className="text-xs text-center text-green-dark">Facture émise ✓</p>
                )}
              </div>
            )}
          </div>

          {/* Encaisser form */}
          {showEncaisser && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              <p className="text-sm font-medium text-charcoal">Encaissement</p>
              <div className="flex gap-3">
                <input
                  type="number" min={1} value={encaisserAmount}
                  onChange={e => setEncaisserAmount(e.target.value)}
                  placeholder="Montant (FCFA)"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/30"
                />
                <select value={payMode} onChange={e => setPayMode(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/30 bg-white">
                  <option value="">Mode…</option>
                  {['Espèces','Carte bancaire','Virement','Mobile Money'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={doEncaisser} disabled={busy}
                  className="bg-green text-charcoal text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
                  Valider
                </button>
                <button onClick={() => setShowEncaisser(false)}
                  className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Séjour */}
        <div className="grid grid-cols-2 gap-4">
          <Section title="Séjour">
            <Row label="Appartement"  value={f.unitLabel} />
            <Row label="Arrivée"      value={f.arrival} />
            <Row label="Départ"       value={f.departure} />
            <Row label="Nuits"        value={f.nights} />
            <Row label="Pax"          value={f.pax} />
            <Row label="Segment"      value={f.segment} />
          </Section>
          <Section title="Tarification">
            <Row label="Palier"       value={TIER_LABELS[f.tarifTier] ?? f.tarifTier} />
            <Row label="Tarif/nuit"   value={`${f.rate.toLocaleString('fr')} FCFA`} />
            <Row label="Électricité"  value={f.elecIncluded ? 'Incluse' : 'Non incluse (hors élec)'}
              cls={f.elecIncluded ? '' : 'text-amber-600'} />
            {f.pdjParJour > 0 && <Row label="PDJ/j" value={`${f.pdjParJour} pers × ${f.pdjPrix.toLocaleString('fr')} FCFA`} />}
            {f.payMode && <Row label="Mode paiement" value={f.payMode} />}
          </Section>
        </div>

        {/* Financier */}
        <Section title="Financier">
          <Row label={`Hébergement (${TIER_LABELS[f.tarifTier] ?? f.tarifTier})`} value={`${f.totalHeb.toLocaleString('fr')} FCFA`} />
          {f.totalPdj > 0    && <Row label="Petit-déjeuner"  value={`${f.totalPdj.toLocaleString('fr')} FCFA`} />}
          {f.totalDependances > 0 && <Row label="Dépendances" value={`${f.totalDependances.toLocaleString('fr')} FCFA`} />}
          {f.totalDebiteur > 0   && <Row label="Débiteur divers" value={`${f.totalDebiteur.toLocaleString('fr')} FCFA`} />}
          <div className="border-t border-gray-100 pt-2 space-y-1.5">
            <Row label="Total général"  value={`${f.totalGeneral.toLocaleString('fr')} FCFA`} />
            <Row label="Arrhes"         value={`${f.arrhes.toLocaleString('fr')} FCFA`} />
            <Row label="Encaissé"       value={`${f.paid.toLocaleString('fr')} FCFA`} />
            <Row label={f.solde > 0 ? 'Solde restant' : avoir > 0 ? 'Avoir' : 'Soldé'}
              value={f.solde > 0 ? `${f.solde.toLocaleString('fr')} FCFA` : avoir > 0 ? `+${avoir.toLocaleString('fr')} FCFA` : '✓'}
              cls={f.solde > 0 ? 'text-red-600 font-bold' : avoir > 0 ? 'text-green-dark font-bold' : 'text-green-dark font-bold'} />
          </div>
        </Section>

        {/* Notes */}
        {(f.note || f.reservationId) && (
          <Section title="Notes & liens">
            {f.note && <p className="text-sm text-gray-700">{f.note}</p>}
            {f.reservationId && (
              <Link href={`/reservations/${f.reservationId}`} className="text-sm text-green-dark hover:underline">
                → Réservation web liée #{f.reservationId}
              </Link>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}
