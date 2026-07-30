'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { rooms } from '@/lib/api';
import type { RoomDto } from '@/lib/types';
import { Plus, Pencil, Trash2, Search, BedDouble } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  Available:   { label: 'Disponible',    cls: 'bg-green-100 text-green-700'  },
  Occupied:    { label: 'Occupée',       cls: 'bg-blue-100 text-blue-700'    },
  Maintenance: { label: 'Maintenance',   cls: 'bg-orange-100 text-orange-700'},
  Inactive:    { label: 'Inactive',      cls: 'bg-gray-100 text-gray-500'    },
};

export default function RoomsPage() {
  const [list, setList]       = useState<RoomDto[]>([]);
  const [filter, setFilter]   = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    rooms.getAll().then(setList).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Supprimer la chambre "${name}" ?`)) return;
    setDeleting(id);
    try {
      await rooms.delete(id);
      setList(prev => prev.filter(r => r.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setDeleting(null);
    }
  }

  const filtered = list.filter(r =>
    !filter ||
    r.roomNumber.toLowerCase().includes(filter.toLowerCase()) ||
    r.nameFr.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Chambres" />
      <div className="flex-1 p-6 space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Rechercher…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>
          <Link
            href="/rooms/new"
            className="flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-800 transition-colors ml-auto"
          >
            <Plus size={16} /> Nouvelle chambre
          </Link>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-400">Chargement…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">N°</th>
                    <th className="px-5 py-3 text-left">Étage</th>
                    <th className="px-5 py-3 text-left">Nom</th>
                    <th className="px-5 py-3 text-left">Capacité</th>
                    <th className="px-5 py-3 text-right">Prix/nuit</th>
                    <th className="px-5 py-3 text-left">Statut</th>
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(room => {
                    const s = STATUS_LABELS[room.status] ?? { label: room.status, cls: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-bold text-charcoal">{room.roomNumber}</td>
                        <td className="px-5 py-3 text-gray-600">{room.floor}ème</td>
                        <td className="px-5 py-3">
                          <p className="font-medium text-charcoal">{room.nameFr}</p>
                          <p className="text-xs text-gray-400">{room.nameEn}</p>
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          <div className="flex items-center gap-1">
                            <BedDouble size={14} />
                            {room.capacityAdults} adultes
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right font-medium">
                          {room.pricePerNight.toLocaleString('fr')} XOF
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${s.cls}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/rooms/${room.id}`}
                              className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-charcoal/10 rounded-lg transition-colors"
                            >
                              <Pencil size={15} />
                            </Link>
                            <button
                              onClick={() => handleDelete(room.id, room.nameFr)}
                              disabled={deleting === room.id}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                        Aucune chambre trouvée
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
