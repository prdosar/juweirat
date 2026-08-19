'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { reservations } from '@/lib/api';
import type { ReservationDto } from '@/lib/types';
import type { NoShowBillingResultDto } from '@/lib/types';
import { ArrowLeft, AlertTriangle, Banknote, CreditCard, Shield, Receipt } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  Pending:    { label: 'En attente', cls: 'bg-amber-100 text-amber-800'      },
  Confirmed:  { label: 'Confirmée',  cls: 'bg-green/20 text-green-dark'      },
  CheckedIn:  { label: 'Arrivé',     cls: 'bg-green text-charcoal'           },
  CheckedOut: { label: 'Parti',      cls: 'bg-charcoal/10 text-charcoal/60'  },
  Cancelled:  { label: 'Annulée',    cls: 'bg-red-100 text-red-700'          },
  NoShow:     { label: 'No Show',    cls: 'bg-charcoal/15 text-charcoal/50'  },
};

const TRANSITIONS: Record<string, string[]> = {
  Pending:   ['Confirmed', 'Cancelled'],
  Confirmed: ['CheckedIn', 'Cancelled', 'NoShow'],
  CheckedIn: ['CheckedOut'],
  CheckedOut: [],
  Cancelled:  [],
  NoShow:     [],
};

const STATUS_FR: Record<string, string> = {
  Confirmed: 'Confirmer', CheckedIn: 'Enregistrer l\'arrivée',
  CheckedOut: 'Enregistrer le départ', Cancelled: 'Annuler', NoShow: 'No Show',
};

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [r, setR]           = useState<ReservationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError]   = useState('');
  const [noShowBusy, setNoShowBusy] = useState(false);
  const [noShowConfirm, setNoShowConfirm] = useState(false);
  const [noShowResult, setNoShowResult] = useState<NoShowBillingResultDto | null>(null);

  useEffect(() => {
    reservations.getById(Number(id)).then(setR).finally(() => setLoading(false));
  }, [id]);

  async function changeStatus(newStatus: string) {
    if (!r) return;
    if (newStatus === 'Cancelled') { setShowCancel(true); return; }
    setError('');
    setUpdating(true);
    try {
      const updated = await reservations.updateStatus(r.id, { status: newStatus });
      setR(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setUpdating(false);
    }
  }

  async function applyNoShow() {
    if (!r) return;
    setNoShowBusy(true); setError('');
    try {
      const result = await reservations.processNoShow(r.id);
      setNoShowResult(result);
      setR(result.reservation);
      setNoShowConfirm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setNoShowBusy(false);
    }
  }

  async function confirmCancel() {
    if (!r) return;
    setError('');
    setUpdating(true);
    try {
      const updated = await reservations.updateStatus(r.id, {
        status: 'Cancelled',
        cancellationReason: cancelReason || undefined,
      });
      setR(updated);
      setShowCancel(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return (
    <div className="flex flex-col h-full">
      <Header title="Réservation" />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!r) return (
    <div className="flex flex-col h-full"><Header title="Réservation" />
      <div className="flex-1 flex items-center justify-center text-gray-400">Réservation introuvable</div>
    </div>
  );

  const s = STATUS_CONFIG[r.status] ?? { label: r.status, cls: 'bg-gray-100 text-gray-600' };
  const todayIso = new Date().toISOString().slice(0, 10);
  const noShowEligible = r.checkInDate < todayIso;
  const nextStatuses = (TRANSITIONS[r.status] ?? []).filter(ns => ns !== 'NoShow' || noShowEligible);

  return (
    <div className="flex flex-col min-h-full">
      <Header title={`Réservation ${r.reference}`} />
      <div className="flex-1 p-6 max-w-3xl space-y-5">

        <Link href="/reservations" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal">
          <ArrowLeft size={16} /> Retour aux réservations
        </Link>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        {/* Reference + status */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono font-bold text-lg text-green-dark">{r.reference}</p>
              <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>
            </div>
            {nextStatuses.length > 0 && (
              <div className="flex gap-2 flex-wrap justify-end">
                {nextStatuses.map(ns => (
                  <button
                    key={ns}
                    onClick={() => changeStatus(ns)}
                    disabled={updating}
                    className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60 ${
                      ns === 'Cancelled'
                        ? 'border border-red-300 text-red-600 hover:bg-red-50'
                        : 'bg-charcoal text-white hover:bg-charcoal-800'
                    }`}
                  >
                    {STATUS_FR[ns] ?? ns}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cancel modal */}
        {showCancel && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-red-700 font-medium">
              <AlertTriangle size={18} /> Confirmer l'annulation
            </div>
            <input
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Raison de l'annulation (optionnel)"
              className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
            />
            <div className="flex gap-2">
              <button onClick={confirmCancel} disabled={updating}
                className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60">
                Confirmer l'annulation
              </button>
              <button onClick={() => setShowCancel(false)}
                className="text-sm text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">
                Retour
              </button>
            </div>
          </div>
        )}

        {/* No Show treatment */}
        {r.status === 'NoShow' && (() => {
          const penaltyNights = r.nights < 15 ? 1 : r.nights < 30 ? 2 : 4;
          const penaltyAmount = penaltyNights * r.pricePerNightSnapshot;
          const tierLabel = r.nights < 15 ? 'court séjour' : r.nights < 30 ? 'forfait 15 jours' : 'forfait au mois';

          if (noShowResult) {
            return (
              <div className="bg-green/10 border border-green/30 rounded-xl p-5">
                <div className="flex items-center gap-2 text-green-dark font-semibold mb-1">
                  <Receipt size={16} /> Retenue No Show appliquée
                </div>
                <p className="text-sm text-gray-700">
                  {noShowResult.penaltyNights} nuit{noShowResult.penaltyNights > 1 ? 's' : ''} retenues ·{' '}
                  <span className="font-bold">{noShowResult.penaltyAmount.toLocaleString('fr')} {noShowResult.currency}</span>
                </p>
              </div>
            );
          }

          return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-semibold">
                <Receipt size={16} /> Traitement No Show
              </div>
              <p className="text-sm text-gray-700">
                Réservation <span className="font-medium">{tierLabel}</span> ({r.nights} nuit{r.nights > 1 ? 's' : ''}) ·{' '}
                Retenue : <span className="font-bold">{penaltyNights} nuit{penaltyNights > 1 ? 's' : ''} × {r.pricePerNightSnapshot.toLocaleString('fr')} {r.currency}</span>{' '}
                = <span className="font-bold text-amber-900">{penaltyAmount.toLocaleString('fr')} {r.currency}</span>
              </p>
              {noShowConfirm ? (
                <div className="flex gap-2 items-center">
                  <button onClick={applyNoShow} disabled={noShowBusy}
                    className="bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-800 disabled:opacity-60">
                    {noShowBusy ? 'Traitement…' : 'Confirmer la retenue'}
                  </button>
                  <button onClick={() => setNoShowConfirm(false)}
                    className="text-sm text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">
                    Annuler
                  </button>
                </div>
              ) : (
                <button onClick={() => setNoShowConfirm(true)}
                  className="bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-800">
                  Appliquer la retenue
                </button>
              )}
            </div>
          );
        })()}

        {/* Client + room */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Client</h3>
            <p className="font-semibold text-charcoal">{r.clientFullName}</p>
            {r.clientEmail && <p className="text-sm text-gray-500">{r.clientEmail}</p>}
            {r.clientPhone && <p className="text-sm text-gray-500">{r.clientPhone}</p>}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Logement</h3>
            <p className="font-semibold text-charcoal">
              {r.roomNameFr ? (
                <>
                  {r.roomNameFr} {r.roomNumber && <span className="text-gray-400 font-normal">· Appt {r.roomNumber}</span>}
                </>
              ) : (
                <>
                  {r.categoryNameFr} <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-normal ml-1">À assigner</span>
                </>
              )}
            </p>
            <p className="text-sm text-gray-500">{r.nights} nuit{r.nights > 1 ? 's' : ''} · {r.adults} adulte{r.adults > 1 ? 's' : ''}{r.children > 0 ? ` · ${r.children} enfant${r.children > 1 ? 's' : ''}` : ''}</p>
          </div>
        </div>

        {/* Dates + financial */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dates</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Arrivée</span>
                  <span className="font-medium text-charcoal">{r.checkInDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Départ</span>
                  <span className="font-medium text-charcoal">{r.checkOutDate}</span>
                </div>
                {r.source && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Source</span>
                    <span className="text-gray-700">{r.source}</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Financier</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Prix/nuit</span>
                  <span>{r.pricePerNightSnapshot.toLocaleString('fr')} {r.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hébergement</span>
                  <span className="font-medium text-charcoal">{r.totalHebergement.toLocaleString('fr')} {r.currency}</span>
                </div>
                {r.prestations.map(p => {
                  const label = p.nameFr.length > 17 ? `${p.nameFr.slice(0, 17)}…` : p.nameFr;
                  return (
                    <div key={p.id} className="flex justify-between">
                      <span className="text-gray-500" title={p.nameFr}>{label}</span>
                      <span className="font-medium text-gold">+{p.totalLigne.toLocaleString('fr')} {r.currency}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between border-t border-gray-100 pt-1.5">
                  <span className="text-gray-500">Total</span>
                  <span className="font-bold text-charcoal">{r.totalPrice.toLocaleString('fr')} {r.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payé</span>
                  <span className="text-green-600 font-medium">{r.amountPaid.toLocaleString('fr')}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2">
                  <span className="font-medium">Restant dû</span>
                  <span className={`font-bold ${r.amountDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {r.amountDue.toLocaleString('fr')} {r.currency}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prestations Annexes */}
        {r.prestations.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Prestations Annexes</h3>
            <div className="divide-y divide-gray-50">
              {r.prestations.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span className="font-medium text-charcoal">{p.nameFr}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {p.quantite} unité{p.quantite > 1 ? 's' : ''} × {p.prixUnitaireSnapshot.toLocaleString('fr')} {r.currency}
                    </span>
                  </div>
                  <span className="font-semibold text-gold">{p.totalLigne.toLocaleString('fr')} {r.currency}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Garantie */}
        {r.garantieType && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <Shield size={13} /> Garantie de réservation
            </h3>
            {r.garantieType === 'Cash' ? (
              <div className="flex items-center gap-3">
                <Banknote size={20} className="text-green" />
                <div>
                  <p className="text-sm font-bold text-charcoal">Dépôt en espèces</p>
                  <p className="text-sm text-gray-600">{r.garantieMontantCash?.toLocaleString('fr')} {r.currency}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <CreditCard size={20} className="text-blue-600" />
                <div>
                  <p className="text-sm font-bold text-charcoal">Carte bancaire — {r.carteNom}</p>
                  <p className="text-sm text-gray-500 font-mono">•••• •••• •••• {r.carteSuffix} · Exp. {r.carteExpiration}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {(r.specialRequests || r.internalNotes) && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            {r.specialRequests && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Demandes spéciales</h3>
                <p className="text-sm text-gray-700">{r.specialRequests}</p>
              </div>
            )}
            {r.internalNotes && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes internes</h3>
                <p className="text-sm text-gray-700">{r.internalNotes}</p>
              </div>
            )}
          </div>
        )}

        <Link
          href={`/payments?reservation=${r.id}`}
          className="inline-flex items-center gap-2 text-sm text-charcoal border border-charcoal/20 px-4 py-2 rounded-lg hover:bg-charcoal hover:text-white transition-colors"
        >
          Voir les paiements de cette réservation →
        </Link>
      </div>
    </div>
  );
}
