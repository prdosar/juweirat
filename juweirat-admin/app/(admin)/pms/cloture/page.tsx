'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { pmsCloture, pmsConfig } from '@/lib/pms';
import { reservations } from '@/lib/api';
import type { CloturePreviewDto, ClotureDto, HotelConfigDto } from '@/lib/pmsTypes';
import type { NoShowPreviewDto } from '@/lib/types';
import { CheckCircle, XCircle, AlertTriangle, Lock, UserX, Banknote, CreditCard, Smartphone, Building } from 'lucide-react';

// Modes acceptés côté back — l'enum PaymentMethod côté C# se parse insensible à la casse.
const NOSHOW_METHODS: Array<{ value: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { value: 'Cash',         label: 'Espèces',                       icon: Banknote },
  { value: 'MobileMoney',  label: 'Mobile Money (T-Money / Flooz)', icon: Smartphone },
  { value: 'CreditCard',   label: 'Carte bancaire',                 icon: CreditCard },
  { value: 'BankTransfer', label: 'Virement bancaire',              icon: Building },
];

export default function CloturePage() {
  const [config, setConfig]   = useState<HotelConfigDto | null>(null);
  const [preview, setPreview] = useState<CloturePreviewDto | null>(null);
  const [history, setHistory] = useState<ClotureDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState<ClotureDto | null>(null);
  // Id de la ligne No Show en cours de traitement (pour désactiver son bouton).
  const [noShowBusyId, setNoShowBusyId] = useState<number | null>(null);
  // Popup No Show : preview chargée + méthode choisie.
  const [noShowModal, setNoShowModal] = useState<{ preview: NoShowPreviewDto; folioId: number } | null>(null);
  const [noShowMethod, setNoShowMethod] = useState<string>('Cash');
  const [noShowError, setNoShowError]   = useState('');
  const [noShowSubmitting, setNoShowSubmitting] = useState(false);
  // Confirmation de clôture — remplace le confirm() natif par une vraie modale.
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    const [cfg, pv, hist] = await Promise.all([
      pmsConfig.get(), pmsCloture.preview(), pmsCloture.history(30),
    ]);
    setConfig(cfg); setPreview(pv); setHistory(hist); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // 1re étape No Show : charge la preview (montant + nuits calculés côté back)
  // et ouvre le popup pour laisser l'opérateur choisir le mode de paiement.
  async function openNoShow(folioId: number, reservationId: number | null) {
    if (!reservationId) {
      setError("Ce folio n'a pas de réservation associée — no-show impossible.");
      return;
    }
    setNoShowBusyId(folioId); setError('');
    try {
      const preview = await reservations.noShowPreview(reservationId);
      setNoShowMethod('Cash');
      setNoShowError('');
      setNoShowModal({ preview, folioId });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur pendant la préparation du No Show');
    } finally { setNoShowBusyId(null); }
  }

  // 2e étape : confirmation dans le popup — applique la retenue avec le mode choisi.
  async function confirmNoShow() {
    if (!noShowModal) return;
    setNoShowSubmitting(true); setNoShowError('');
    try {
      await reservations.processNoShow(noShowModal.preview.reservationId, noShowMethod);
      setNoShowModal(null);
      await load();
    } catch (e: unknown) {
      setNoShowError(e instanceof Error ? e.message : 'Erreur pendant le traitement No Show');
    } finally { setNoShowSubmitting(false); }
  }

  async function executeConfirmed() {
    setBusy(true); setError('');
    try {
      const result = await pmsCloture.execute();
      setDone(result);
      setConfirmOpen(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Clôture journalière" />
      <div className="flex-1 p-6 space-y-5 max-w-3xl">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {done && (
              <div className="bg-green/10 border border-green/25 rounded-xl p-5 flex items-start gap-3">
                <CheckCircle size={20} className="text-green-dark shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-charcoal">Clôture effectuée</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {done.nbLignes} ligne(s) générée(s) · CA: {done.caTotal.toLocaleString('fr')} FCFA · Occupation: {done.occupation}%
                  </p>
                  <p className="text-sm text-gray-500">Nouvelle date hôtel : {config?.dateHotel}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
            )}

            {/* Preview */}
            {preview && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-charcoal">Clôture du {config?.dateHotel}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {preview.estimatedActiveCount} folio(s) actif(s) · {preview.canClose ? 'Prêt à clôturer' : 'Actions en attente'}
                    </p>
                  </div>
                  {preview.canClose
                    ? <CheckCircle size={20} className="text-green-dark" />
                    : <AlertTriangle size={20} className="text-amber-500" />}
                </div>

                {preview.pendingArrivals.length > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                    <p className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                      <XCircle size={14} /> {preview.pendingArrivals.length} arrivée(s) non traitée(s)
                    </p>
                    <p className="text-[11px] text-amber-700/80 mb-2">
                      Le client n'est jamais arrivé — appliquer le No Show pour libérer la clôture.
                    </p>
                    {preview.pendingArrivals.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm py-1.5">
                        <span className="text-gray-700">
                          {p.guest ?? '—'} · <span className="font-mono text-xs">{p.number}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => openNoShow(p.id, p.reservationId)}
                          disabled={noShowBusyId === p.id || !p.reservationId}
                          title={!p.reservationId ? "Folio sans réservation associée" : "Marquer en No Show et appliquer la retenue"}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <UserX size={12} />
                          {noShowBusyId === p.id ? 'Chargement…' : 'Marquer No Show'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {preview.pendingDepartures.length > 0 && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <p className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                      <XCircle size={14} /> {preview.pendingDepartures.length} départ(s) non traité(s)
                    </p>
                    {preview.pendingDepartures.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm py-1">
                        <span className="text-gray-700">{p.guest ?? '—'} · <span className="font-mono text-xs">{p.number}</span></span>
                        <Link href={`/pms/folios/${p.id}`} className="text-blue-700 hover:underline text-xs">Check-out / prolonger →</Link>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => { setError(''); setConfirmOpen(true); }}
                  disabled={busy || !preview.canClose}
                  className="flex items-center gap-2 bg-charcoal text-white font-semibold text-sm px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  <Lock size={15} />
                  {busy ? 'Clôture en cours…' : `Clôturer la journée du ${config?.dateHotel}`}
                </button>
              </div>
            )}

            {/* History */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3.5 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-charcoal">Historique des clôtures</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-50">
                    <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                      <th className="px-5 py-3 text-left font-medium">Date hôtel</th>
                      <th className="px-5 py-3 text-right font-medium">Occ.</th>
                      <th className="px-5 py-3 text-right font-medium">CA total</th>
                      <th className="px-5 py-3 text-right font-medium">PM</th>
                      <th className="px-5 py-3 text-right font-medium">RevPAR</th>
                      <th className="px-5 py-3 text-right font-medium">Arrivées</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {history.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs font-semibold text-charcoal">{c.dateHotel}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{c.occ}/{c.dispo} ({c.occupation}%)</td>
                        <td className="px-5 py-3 text-right font-semibold text-charcoal">{c.caTotal.toLocaleString('fr')}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{c.pm.toLocaleString('fr')}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{c.revPar.toLocaleString('fr')}</td>
                        <td className="px-5 py-3 text-right text-gray-500">{c.nbArrivals}</td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-gray-400">Aucune clôture effectuée</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirmation de clôture — modale centrée, remplace le confirm() natif */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !busy && setConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-charcoal/10 flex items-center justify-center shrink-0">
                  <Lock size={20} className="text-charcoal" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-charcoal">Clôturer la journée</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Date hôtel : <span className="font-mono font-semibold text-charcoal">{config?.dateHotel}</span>
                  </p>
                </div>
              </div>

              <div className="bg-surface border border-gray-100 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-500">Folios actifs à valoriser</span>
                  <span className="text-sm font-semibold text-charcoal">
                    {preview?.estimatedActiveCount ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Nouvelle date hôtel</span>
                  <span className="text-sm font-semibold text-green-dark font-mono">
                    {config?.dateHotel
                      ? new Date(new Date(config.dateHotel).getTime() + 86400000).toISOString().slice(0, 10)
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5">
                <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Cette opération est <b>irréversible</b>. Elle génère les postings d'hébergement,
                  fige les indicateurs du jour et avance la date hôtel de 24h.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-2 px-6 pb-6 pt-1">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={busy}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executeConfirmed}
                disabled={busy}
                className="flex-1 py-2.5 rounded-lg bg-charcoal text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
              >
                <Lock size={14} />
                {busy ? 'Clôture…' : 'Clôturer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup No Show — montant calculé côté back + choix du mode de paiement */}
      {noShowModal && (
        <div
          className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !noShowSubmitting && setNoShowModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <UserX size={20} className="text-amber-700" />
              </div>
              <div>
                <h2 className="text-base font-bold text-charcoal">Retenue No Show</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {noShowModal.preview.guestName} · <span className="font-mono">{noShowModal.preview.reference}</span>
                </p>
              </div>
            </div>

            {noShowModal.preview.alreadyBilled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-blue-800 space-y-1">
                <p className="font-semibold">Retenue déjà appliquée sur cette réservation.</p>
                <p className="text-blue-700 font-light">
                  Aucun nouvel encaissement ne sera créé. Cliquez sur « Retirer de la liste » pour finaliser le statut No Show et libérer la clôture.
                </p>
              </div>
            )}

            <div className="bg-surface border border-gray-100 rounded-xl px-4 py-3.5 space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-500">Nuits retenues</span>
                <span className="text-sm font-semibold text-charcoal">
                  {noShowModal.preview.penaltyNights} nuit{noShowModal.preview.penaltyNights > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  {noShowModal.preview.alreadyBilled ? 'Montant déjà encaissé' : 'Montant à retenir'}
                </span>
                <span className="text-2xl font-black text-amber-700">
                  {noShowModal.preview.penaltyAmount.toLocaleString('fr')} <span className="text-xs font-bold">{noShowModal.preview.currency}</span>
                </span>
              </div>
            </div>

            {/* Sélecteur de mode masqué quand la retenue est déjà encaissée
                — le popup sert alors juste à libérer la ligne bloquée. */}
            {!noShowModal.preview.alreadyBilled && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mode d'encaissement</p>
                <div className="grid grid-cols-2 gap-2">
                  {NOSHOW_METHODS.map(({ value, label, icon: Icon }) => {
                    const on = noShowMethod === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setNoShowMethod(value)}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 text-xs font-semibold text-left transition-all ${
                          on ? 'border-green bg-green/5 text-green-dark' : 'border-gray-100 text-gray-600 hover:border-gray-200'
                        }`}
                      >
                        <Icon size={15} />
                        <span className="truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {noShowError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">{noShowError}</div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNoShowModal(null)}
                disabled={noShowSubmitting}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmNoShow}
                disabled={noShowSubmitting}
                className="flex-1 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 disabled:opacity-50"
              >
                {noShowSubmitting
                  ? 'Traitement…'
                  : noShowModal.preview.alreadyBilled
                    ? 'Retirer de la liste'
                    : 'Appliquer la retenue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
