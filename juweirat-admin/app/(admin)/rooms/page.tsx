'use client';

import { useEffect, useState, Fragment } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { rooms, categories } from '@/lib/api';
import type { RoomDto, RoomCategoryDto } from '@/lib/types';
import { Plus, Pencil, Trash2, Search, BedDouble } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  Available:   { label: 'Disponible',  cls: 'bg-green/20 text-green-dark'        },
  Occupied:    { label: 'Occupée',     cls: 'bg-charcoal/15 text-charcoal/70'    },
  Maintenance: { label: 'Maintenance', cls: 'bg-amber-100 text-amber-800'         },
  Inactive:    { label: 'Inactive',    cls: 'bg-gray-100 text-gray-500'           },
};

export default function RoomsPage() {
  const [list, setList]         = useState<RoomDto[]>([]);
  const [categoryList, setCategoryList] = useState<RoomCategoryDto[]>([]);
  const [filter, setFilter]     = useState('');
  const [catFilter, setCatFilter] = useState<number | 'all'>('all');
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([rooms.getAll(), categories.getAll()])
      .then(([r, c]) => {
        setList(r);
        setCategoryList(c);
      })
      .finally(() => setLoading(false));
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
    (catFilter === 'all' || r.categoryId === catFilter) &&
    (!filter ||
    r.roomNumber.toLowerCase().includes(filter.toLowerCase()) ||
    r.nameFr.toLowerCase().includes(filter.toLowerCase()))
  );

  const grouped = categoryList.map(c => ({
    category: c,
    rooms: filtered.filter(r => r.categoryId === c.id).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
  })).filter(g => g.rooms.length > 0);

  const unassigned = filtered.filter(r => !r.categoryId).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
  if (unassigned.length > 0) {
    grouped.push({
      category: { id: 0, nameFr: 'Sans catégorie' } as RoomCategoryDto,
      rooms: unassigned
    });
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Chambres" />
      <div className="flex-1 p-6 space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40 bg-white"
          >
            <option value="all">Toutes les catégories</option>
            {categoryList.map(c => (
              <option key={c.id} value={c.id}>{c.nameFr}</option>
            ))}
          </select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Rechercher…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40 bg-white"
            />
          </div>
          <Link
            href="/rooms/new"
            className="flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-800 transition-colors ml-auto"
          >
            <Plus size={15} /> Nouvelle chambre
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
                    <th className="px-5 py-3.5 text-left font-medium">N°</th>
                    <th className="px-5 py-3.5 text-left font-medium">Étage</th>
                    <th className="px-5 py-3.5 text-left font-medium">Nom</th>
                    <th className="px-5 py-3.5 text-left font-medium">Capacité</th>
                    <th className="px-5 py-3.5 text-right font-medium">Prix / nuit</th>
                    <th className="px-5 py-3.5 text-left font-medium">Statut</th>
                    <th className="px-5 py-3.5 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {grouped.map(group => (
                    <Fragment key={group.category.id}>
                      <tr className="bg-gray-50/80 border-y border-gray-100">
                        <td colSpan={7} className="px-5 py-2.5 font-semibold text-charcoal text-xs uppercase tracking-wider">
                          {group.category.nameFr} <span className="text-gray-400 font-normal ml-1">({group.rooms.length})</span>
                        </td>
                      </tr>
                      {group.rooms.map(room => {
                        const s = STATUS_LABELS[room.status] ?? { label: room.status, cls: 'bg-gray-100 text-gray-600' };
                        return (
                          <tr key={room.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="px-5 py-3.5 font-bold text-charcoal">{room.roomNumber}</td>
                            <td className="px-5 py-3.5 text-gray-500">{room.floor}ème</td>
                            <td className="px-5 py-3.5">
                              <p className="font-medium text-charcoal">{room.nameFr}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{room.nameEn}</p>
                            </td>
                            <td className="px-5 py-3.5 text-gray-500">
                              <div className="flex items-center gap-1.5">
                                <BedDouble size={13} className="text-gray-400" />
                                {room.capacityAdults} adultes
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-right font-semibold text-charcoal">
                              {room.pricePerNight.toLocaleString('fr')}
                              <span className="text-xs font-normal text-gray-400 ml-1">XOF</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${s.cls}`}>
                                {s.label}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center justify-center gap-1.5">
                                <Link
                                  href={`/rooms/${room.id}`}
                                  className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-charcoal/8 rounded-lg transition-colors"
                                >
                                  <Pencil size={14} />
                                </Link>
                                <button
                                  onClick={() => handleDelete(room.id, room.nameFr)}
                                  disabled={deleting === room.id}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
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
