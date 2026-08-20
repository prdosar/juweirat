'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { pmsFolios } from '@/lib/pms';
import type { FolioDto } from '@/lib/pmsTypes';
import { ArrowLeft, LogIn, LogOut, Banknote, MoveRight, FileText, ScrollText } from 'lucide-react';

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

interface PaymentLine {
  id: string;
  mode: string;
  amount: string;
  ref: string;
}

const PAYMENT_MODES = [
  'Espèces',
  'Mobile Money (TMoney)',
  'Mobile Money (Flooz)',
  'Carte bancaire',
  'Virement bancaire',
  'Chèque',
  // Mode spécial : la ligne est portée en débiteurs divers au lieu d'être
  // encaissée en caisse. Le folio est soldé du montant, la créance vit côté
  // Débiteur (relance/recouvrement séparé).
  'Transfert en débiteurs divers',
];

// Détection du mode "transfert débiteur" (peut évoluer si on renomme le label).
const DEBTOR_MODE = 'Transfert en débiteurs divers';

export default function FolioDetailPage() {
  const { id }                    = useParams<{ id: string }>();
  const [folio, setFolio]         = useState<FolioDto | null>(null);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState('');
  const [showEncaisser, setShowEncaisser] = useState(false);
  const [paymentLines, setPaymentLines]   = useState<PaymentLine[]>([
    { id: '1', mode: 'Espèces', amount: '', ref: '' }
  ]);

  const load = useCallback(() => {
    pmsFolios.getById(Number(id)).then(f => { 
      setFolio(f); 
      setLoading(false); 
      if (f && f.solde > 0) {
        setPaymentLines([{ id: '1', mode: 'Espèces', amount: String(f.solde), ref: '' }]);
      }
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleOpenEncaisser = () => {
    if (!showEncaisser && folio) {
      setPaymentLines([{ id: '1', mode: 'Espèces', amount: String(folio.solde > 0 ? folio.solde : ''), ref: '' }]);
    }
    setShowEncaisser(v => !v);
  };

  const addPaymentLine = () => {
    if (!folio) return;
    const currentSum = paymentLines.reduce((sum, l) => sum + (parseInt(l.amount) || 0), 0);
    const remainder = Math.max(0, folio.solde - currentSum);
    setPaymentLines(prev => [
      ...prev,
      { id: String(Date.now()), mode: 'Mobile Money (TMoney)', amount: remainder > 0 ? String(remainder) : '', ref: '' }
    ]);
  };

  const removePaymentLine = (lineId: string) => {
    if (paymentLines.length <= 1) return;
    setPaymentLines(prev => prev.filter(l => l.id !== lineId));
  };

  const updatePaymentLine = (lineId: string, field: keyof PaymentLine, value: string) => {
    setPaymentLines(prev => prev.map(l => l.id === lineId ? { ...l, [field]: value } : l));
  };

  async function act(fn: () => Promise<FolioDto>) {
    setBusy(true); setError('');
    try { const f = await fn(); setFolio(f); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  }

  async function doEncaisser() {
    const validLines = paymentLines.filter(l => (parseInt(l.amount) || 0) > 0);
    if (validLines.length === 0) {
      setError('Veuillez renseigner au moins un montant valide.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      // Chaque ligne : soit encaissement (caisse), soit transfert débiteur.
      for (const line of validLines) {
        const m = parseInt(line.amount);
        const modeLabel = line.ref.trim() ? `${line.mode} [${line.ref.trim()}]` : line.mode;
        if (line.mode === DEBTOR_MODE) {
          const label = line.ref.trim()
            ? `Débiteur — ${line.ref.trim()}`
            : undefined;
          await pmsFolios.transferDebiteur(Number(id), label, m);
        } else {
          await pmsFolios.encaisser(Number(id), m, modeLabel);
        }
      }
      setShowEncaisser(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'encaissement');
    } finally {
      setBusy(false);
    }
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
  async function doAnnulerFacture() {
    if (!f?.factureId) return;
    if (!confirm('Annuler cette facture ? Le folio sera libéré pour ré-émission.')) return;
    setBusy(true); setError('');
    try {
      const { pmsFactures } = await import('@/lib/pms');
      await pmsFactures.annuler(f.factureId);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
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
  // Avoir en TTC : client paie TTC, la dette est en TTC.
  const avoir = Math.max(0, f.paid + f.arrhes - f.totalTtc);

  return (
    <div className="flex flex-col min-h-full">
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
              {f.reservationReference && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Réservation liée : <span className="font-mono font-semibold text-charcoal">{f.reservationReference}</span>
                </p>
              )}
              <p className="text-base font-semibold text-charcoal mt-0.5">
                {f.guest ?? (`${f.prenom ?? ''} ${f.nom ?? ''}`.trim() || '—')}
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
                <button onClick={handleOpenEncaisser} disabled={busy}
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
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/pms/folios/${f.id}/facture`}
                      target="_blank"
                      className="flex-1 flex justify-center items-center gap-2 bg-green text-charcoal text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90"
                    >
                      <FileText size={15} /> Imprimer facture
                    </Link>
                    <button onClick={doAnnulerFacture} disabled={busy} title="Annuler la facture"
                      className="p-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">
                      ✕
                    </button>
                  </div>
                )}
                <Link
                  href={`/pms/folios/${f.id}/contrat`}
                  target="_blank"
                  className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                    f.nights >= 30
                      ? 'bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ScrollText size={15} />
                  Contrat de bail
                  {f.nights >= 30 && <span className="ml-auto text-[10px] font-bold text-amber-700">OBLIGATOIRE</span>}
                </Link>
              </div>
            )}
          </div>

          {/* Formulaire d'encaissement multi-moyens */}
          {showEncaisser && (
            <div className="mt-5 pt-5 border-t border-gray-100 space-y-4 bg-surface/50 p-4 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-charcoal">Encaissement du Folio</p>
                  <p className="text-xs text-gray-400">Solde restant dû : <span className="font-bold text-green-dark">{f.solde.toLocaleString('fr')} FCFA</span></p>
                </div>
                <button
                  type="button"
                  onClick={addPaymentLine}
                  className="text-xs font-semibold text-green border border-green/30 px-3 py-1.5 rounded-lg hover:bg-green/10 transition-colors"
                >
                  + Ajouter un mode de paiement
                </button>
              </div>

              {/* Lignes de règlement */}
              <div className="space-y-3">
                {paymentLines.map((line, idx) => (
                  <div key={line.id} className="flex flex-wrap items-center gap-2.5 bg-white p-3 rounded-lg border border-gray-200/80 shadow-2xs">
                    <div className="w-48">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mode {idx + 1}</label>
                      <select
                        value={line.mode}
                        onChange={e => updatePaymentLine(line.id, 'mode', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green/30"
                      >
                        {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    <div className="flex-1 min-w-[130px]">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Montant (FCFA)</label>
                      <input
                        type="number"
                        min={1}
                        value={line.amount}
                        onChange={e => updatePaymentLine(line.id, 'amount', e.target.value)}
                        placeholder="Montant..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green/30"
                      />
                    </div>

                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Réf / N° Reçu (opt.)</label>
                      <input
                        type="text"
                        value={line.ref}
                        onChange={e => updatePaymentLine(line.id, 'ref', e.target.value)}
                        placeholder="ex: TX-9021 / Reçu 04"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green/30"
                      />
                    </div>

                    {paymentLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePaymentLine(line.id)}
                        className="self-end mb-1 p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Supprimer cette ligne"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Récapitulatif dynamique de l'encaissement */}
              {(() => {
                const sumTotal = paymentLines.reduce((s, l) => s + (parseInt(l.amount) || 0), 0);
                const soldeApres = Math.max(0, f.solde - sumTotal);
                return (
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 text-xs">
                    <div className="flex items-center gap-4">
                      <span>Total à encaisser : <strong className="text-green-dark font-extrabold">{sumTotal.toLocaleString('fr')} FCFA</strong></span>
                      <span className="text-gray-400">|</span>
                      <span>Solde après : <strong className={soldeApres === 0 ? "text-green font-bold" : "text-amber-600 font-bold"}>{soldeApres === 0 ? "Soldé ✓" : `${soldeApres.toLocaleString('fr')} FCFA`}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={doEncaisser}
                        disabled={busy || sumTotal <= 0}
                        className="bg-green text-charcoal text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 shadow-sm"
                      >
                        {busy ? "Validation..." : "Valider l'encaissement"}
                      </button>
                      <button
                        onClick={() => setShowEncaisser(false)}
                        className="text-xs text-gray-500 px-3 py-2 rounded-lg hover:bg-gray-100"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                );
              })()}
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
          <Row label={`Hébergement (${TIER_LABELS[f.tarifTier] ?? f.tarifTier})`} value={`${f.totalHeb.toLocaleString('fr')} FCFA HT`} />
          {f.totalPdj > 0    && <Row label="Petit-déjeuner"  value={`${f.totalPdj.toLocaleString('fr')} FCFA HT`} />}
          {f.totalDependances > 0 && <Row label="Dépendances" value={`${f.totalDependances.toLocaleString('fr')} FCFA HT`} />}
          {f.totalDebiteur > 0   && <Row label="Débiteur divers" value={`${f.totalDebiteur.toLocaleString('fr')} FCFA HT`} />}
          <div className="border-t border-gray-100 pt-2 space-y-1.5">
            <Row label="Total HT"       value={`${f.totalGeneral.toLocaleString('fr')} FCFA`} />
            {!f.tvaExonere && f.tva > 0 && (
              <Row label="TVA (18%)"    value={`${f.tva.toLocaleString('fr')} FCFA`} />
            )}
            <Row label={f.tvaExonere ? 'Total (exonéré TVA)' : 'Total TTC'}
              value={`${f.totalTtc.toLocaleString('fr')} FCFA`}
              cls="font-bold" />
            <Row label="Arrhes"         value={`${f.arrhes.toLocaleString('fr')} FCFA`} />
            <Row label="Encaissé"       value={`${f.paid.toLocaleString('fr')} FCFA`} />
            <Row label={f.solde > 0 ? 'Solde restant (TTC)' : avoir > 0 ? 'Avoir' : 'Soldé'}
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
                → Réservation liée <span className="font-mono">{f.reservationReference ?? `#${f.reservationId}`}</span>
              </Link>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}
