'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { rooms, clients, reservations } from '@/lib/api';
import type { RoomDto, ReservationDto, ClientDto } from '@/lib/types';
import { BedDouble, Users, CalendarCheck, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-charcoal">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Pending:    'bg-yellow-100 text-yellow-700',
    Confirmed:  'bg-blue-100 text-blue-700',
    CheckedIn:  'bg-green-100 text-green-700',
    CheckedOut: 'bg-gray-100 text-gray-600',
    Cancelled:  'bg-red-100 text-red-600',
    NoShow:     'bg-orange-100 text-orange-700',
  };
  const labels: Record<string, string> = {
    Pending: 'En attente', Confirmed: 'Confirmée', CheckedIn: 'Arrivé',
    CheckedOut: 'Parti', Cancelled: 'Annulée', NoShow: 'No Show',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function DashboardPage() {
  const [roomList, setRoomList]   = useState<RoomDto[]>([]);
  const [resList, setResList]     = useState<ReservationDto[]>([]);
  const [clientList, setClientList] = useState<ClientDto[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([rooms.getAll(), reservations.getAll(), clients.getAll()])
      .then(([r, res, c]) => { setRoomList(r); setResList(res); setClientList(c); })
      .finally(() => setLoading(false));
  }, []);

  const available   = roomList.filter(r => r.status === 'Available').length;
  const pending     = resList.filter(r => r.status === 'Pending').length;
  const checkedIn   = resList.filter(r => r.status === 'CheckedIn').length;
  const revenueMonth = resList
    .filter(r => {
      const d = new Date(r.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        && r.status !== 'Cancelled';
    })
    .reduce((sum, r) => sum + r.amountPaid, 0);

  const recent = [...resList].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 8);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Tableau de bord" />
      <div className="flex-1 p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">Chargement…</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Chambres disponibles" value={`${available}/${roomList.length}`} icon={BedDouble} color="bg-charcoal" />
              <StatCard label="Clients enregistrés"  value={clientList.length}                 icon={Users}     color="bg-charcoal-700" />
              <StatCard label="Arrivées en cours"    value={checkedIn}                          icon={CheckCircle} color="bg-green-500" />
              <StatCard label="Revenu ce mois (XOF)" value={revenueMonth.toLocaleString('fr')} icon={TrendingUp} color="bg-green" />
            </div>

            {/* Quick status row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'En attente', value: pending,   icon: Clock,     cls: 'border-yellow-300 bg-yellow-50' },
                { label: 'Confirmées', value: resList.filter(r => r.status === 'Confirmed').length, icon: CheckCircle, cls: 'border-blue-300 bg-blue-50' },
                { label: 'Annulées',   value: resList.filter(r => r.status === 'Cancelled').length, icon: XCircle, cls: 'border-red-300 bg-red-50' },
              ].map(({ label, value, icon: Icon, cls }) => (
                <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${cls}`}>
                  <Icon size={20} className="shrink-0 text-gray-600" />
                  <div>
                    <p className="text-xl font-bold text-charcoal">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent reservations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-charcoal">Réservations récentes</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-6 py-3 text-left">Référence</th>
                      <th className="px-6 py-3 text-left">Client</th>
                      <th className="px-6 py-3 text-left">Chambre</th>
                      <th className="px-6 py-3 text-left">Arrivée</th>
                      <th className="px-6 py-3 text-left">Statut</th>
                      <th className="px-6 py-3 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recent.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 font-mono text-xs text-gray-600">{r.reference}</td>
                        <td className="px-6 py-3 font-medium text-charcoal">{r.clientFullName}</td>
                        <td className="px-6 py-3 text-gray-600">{r.roomNumber} – {r.roomNameFr}</td>
                        <td className="px-6 py-3 text-gray-600">{r.checkInDate}</td>
                        <td className="px-6 py-3">{statusBadge(r.status)}</td>
                        <td className="px-6 py-3 text-right font-medium text-charcoal">
                          {r.totalPrice.toLocaleString('fr')} {r.currency}
                        </td>
                      </tr>
                    ))}
                    {recent.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                          Aucune réservation
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
