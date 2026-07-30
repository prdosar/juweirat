'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { reservations } from '@/lib/api';
import type { ReservationDto } from '@/lib/types';
import { Plus, Filter } from 'lucide-react';

const STATUSES = ['', 'Pending', 'Confirmed', 'CheckedIn', 'CheckedOut', 'Cancelled', 'NoShow'];

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  Pending:    { label: 'En attente', cls: 'bg-amber-100 text-amber-800'      },
  Confirmed:  { label: 'Confirmée',  cls: 'bg-green/20 text-green-dark'      },
  CheckedIn:  { label: 'Arrivé',     cls: 'bg-green text-charcoal'           },
  CheckedOut: { label: 'Parti',      cls: 'bg-charcoal/10 text-charcoal/60'  },
  Cancelled:  { label: 'Annulée',    cls: 'bg-red-100 text-red-700'          },
  NoShow:     { label: 'No Show',    cls: 'bg-charcoal/15 text-charcoal/50'  },
};

export default function ReservationsPage() {
  const [list, setList]       = useState<ReservationDto[]>([]);
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reservations.getAll(status || undefined).then(setList).finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Réservations" />
      <div className="flex-1 p-6 space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40 bg-white"
            >
              <option value="">Tous les statuts</option>
              {STATUSES.slice(1).map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>
              ))}
            </select>
          </div>
          <Link
            href="/reservations/new"
            className="flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-800 transition-colors ml-auto"
          >
            <Plus size={15} /> Nouvelle réservation
          </Link>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5 text-left font-medium">Référence</th>
                    <th className="px-5 py-3.5 text-left font-medium">Client</th>
                    <th className="px-5 py-3.5 text-left font-medium">Chambre</th>
                    <th className="px-5 py-3.5 text-left font-medium">Arrivée</th>
                    <th className="px-5 py-3.5 text-left font-medium">Départ</th>
                    <th className="px-5 py-3.5 text-left font-medium">Statut</th>
                    <th className="px-5 py-3.5 text-right font-medium">Total</th>
                    <th className="px-5 py-3.5 text-right font-medium">Restant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {list.map(r => {
                    const s = STATUS_CONFIG[r.status] ?? { label: r.status, cls: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/reservations/${r.id}`}
                      >
                        <td className="px-5 py-3.5 font-mono text-xs text-green-dark font-bold">{r.reference}</td>
                        <td className="px-5 py-3.5 font-medium text-charcoal">{r.clientFullName}</td>
                        <td className="px-5 py-3.5 text-gray-500">{r.roomNumber}</td>
                        <td className="px-5 py-3.5 text-gray-500">{r.checkInDate}</td>
                        <td className="px-5 py-3.5 text-gray-500">{r.checkOutDate}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-charcoal">
                          {r.totalPrice.toLocaleString('fr')}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={r.amountDue > 0 ? 'text-red-600 font-semibold' : 'text-green-dark font-semibold'}>
                            {r.amountDue > 0 ? `−${r.amountDue.toLocaleString('fr')}` : '✓ Soldé'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-gray-400 text-sm">
                        Aucune réservation
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
