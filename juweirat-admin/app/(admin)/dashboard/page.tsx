'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { rooms, clients, reservations } from '@/lib/api';
import type { RoomDto, ReservationDto, ClientDto } from '@/lib/types';
import { BedDouble, Users, CalendarCheck, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';

function StatCard({ label, value, icon: Icon, iconBg }: {
  label: string; value: string | number; icon: React.ElementType; iconBg: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-charcoal leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    Pending:    { label: 'En attente', cls: 'bg-amber-100 text-amber-800'      },
    Confirmed:  { label: 'Confirmée',  cls: 'bg-green/20 text-green-dark'      },
    CheckedIn:  { label: 'Arrivé',     cls: 'bg-green text-charcoal'           },
    CheckedOut: { label: 'Parti',      cls: 'bg-charcoal/10 text-charcoal/60'  },
    Cancelled:  { label: 'Annulée',    cls: 'bg-red-100 text-red-700'          },
    NoShow:     { label: 'No Show',    cls: 'bg-charcoal/15 text-charcoal/50'  },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${cls}`}>{label}</span>
  );
}

export default function DashboardPage() {
  const [roomList, setRoomList]     = useState<RoomDto[]>([]);
  const [resList, setResList]       = useState<ReservationDto[]>([]);
  const [clientList, setClientList] = useState<ClientDto[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      rooms.getAll(),
      reservations.getAll(),
      clients.getAll(),
    ])
      .then(([r, res, c]) => {
        setRoomList(r);
        setResList(res);
        setClientList(c);
      })
      .finally(() => setLoading(false));
  }, []);

  // Source de vérité : Room.Status (mis à jour en cascade lors du check-in/check-out folio).
  const available    = roomList.filter(r => r.status === 'Available').length;
  // Clients physiquement en chambre = réservations au statut CheckedIn.
  const presentCount = resList.filter(r => r.status === 'CheckedIn').length;

  // Statuts réservations
  const pending    = resList.filter(r => r.status === 'Pending').length;
  const confirmed  = resList.filter(r => r.status === 'Confirmed').length;
  const cancelled  = resList.filter(r => r.status === 'Cancelled').length;

  // Revenu du mois : séjours qui chevauchent le mois courant, hors annulés/no-show.
  const now          = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const revenueMonth = resList
    .filter(r => {
      if (r.status === 'Cancelled' || r.status === 'NoShow') return false;
      const checkIn  = new Date(r.checkInDate  + 'T00:00:00');
      const checkOut = new Date(r.checkOutDate + 'T00:00:00');
      return checkIn <= endOfMonth && checkOut >= startOfMonth;
    })
    .reduce((sum, r) => sum + r.totalPrice, 0);

  const recent = [...resList]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Tableau de bord" />
      <div className="flex-1 p-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Chambres disponibles" value={`${available} / ${roomList.length}`} icon={BedDouble} iconBg="bg-charcoal" />
              <StatCard label="Clients enregistrés"  value={clientList.length}                   icon={Users}         iconBg="bg-charcoal-700" />
              <StatCard label="Clients présents"     value={presentCount}                         icon={CalendarCheck} iconBg="bg-green-dark"   />
              <StatCard label="Revenu ce mois (XOF)" value={revenueMonth.toLocaleString('fr')}   icon={TrendingUp}    iconBg="bg-green"        />
            </div>

            {/* Quick status */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'En attente',  value: pending,   icon: Clock,        bg: 'bg-amber-50  border-amber-200', iconCls: 'text-amber-600' },
                { label: 'Confirmées',  value: confirmed,  icon: CheckCircle,  bg: 'bg-green/5   border-green/25',  iconCls: 'text-green-dark' },
                { label: 'Annulées',    value: cancelled,  icon: XCircle,      bg: 'bg-red-50    border-red-200',   iconCls: 'text-red-500' },
              ].map(({ label, value, icon: Icon, bg, iconCls }) => (
                <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${bg}`}>
                  <Icon size={18} className={`shrink-0 ${iconCls}`} />
                  <div>
                    <p className="text-xl font-bold text-charcoal leading-none">{value}</p>
                    <p className="text-xs text-gray-500 mt-1">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent reservations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <div className="w-0.5 h-4 bg-green rounded-full" />
                <h2 className="text-sm font-semibold text-charcoal">Réservations récentes</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-gray-400 uppercase tracking-wider border-b border-gray-50">
                      <th className="px-6 py-3 text-left font-medium">Référence</th>
                      <th className="px-6 py-3 text-left font-medium">Client</th>
                      <th className="px-6 py-3 text-left font-medium">Chambre</th>
                      <th className="px-6 py-3 text-left font-medium">Arrivée</th>
                      <th className="px-6 py-3 text-left font-medium">Statut</th>
                      <th className="px-6 py-3 text-right font-medium">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recent.map(r => (
                      <tr
                        key={r.id}
                        className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/reservations/${r.id}`}
                      >
                        <td className="px-6 py-3.5 font-mono text-xs text-green-dark font-bold">{r.reference}</td>
                        <td className="px-6 py-3.5 font-medium text-charcoal">{r.clientFullName}</td>
                        <td className="px-6 py-3.5 text-gray-500">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-charcoal">{r.roomNameFr || r.categoryNameFr || 'Logement'}</span>
                            {r.roomNumber ? (
                              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Appt {r.roomNumber}</span>
                            ) : (
                              <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-normal">
                                À assigner
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-gray-500">{r.checkInDate}</td>
                        <td className="px-6 py-3.5"><StatusBadge status={r.status} /></td>
                        <td className="px-6 py-3.5 text-right font-semibold text-charcoal">
                          {r.totalPrice.toLocaleString('fr')} <span className="text-xs font-normal text-gray-400">{r.currency}</span>
                        </td>
                      </tr>
                    ))}
                    {recent.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">
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
