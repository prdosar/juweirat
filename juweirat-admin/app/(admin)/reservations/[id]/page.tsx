'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { reservations } from '@/lib/api';
import type { ReservationDto } from '@/lib/types';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

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
  const nextStatuses = TRANSITIONS[r.status] ?? [];

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
                  <span className="text-gray-500">Total</span>
                  <span className="font-medium text-charcoal">{r.totalPrice.toLocaleString('fr')} {r.currency}</span>
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
