'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { rooms, amenities } from '@/lib/api';
import type { RoomDto, AmenityDto } from '@/lib/types';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

const STATUSES = ['Available', 'Occupied', 'Maintenance', 'Inactive'];
const STATUS_FR: Record<string, string> = {
  Available: 'Disponible', Occupied: 'Occupée',
  Maintenance: 'Maintenance', Inactive: 'Inactive',
};

export default function RoomFormPage() {
  const { id }   = useParams<{ id: string }>();
  const isNew    = id === 'new';
  const router   = useRouter();

  const [amenityList, setAmenityList] = useState<AmenityDto[]>([]);
  const [loading, setLoading]         = useState(!isNew);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  // Form state
  const [form, setForm] = useState({
    roomNumber: '', floor: 2, nameFr: '', nameEn: '',
    descriptionFr: '', descriptionEn: '',
    capacityAdults: 2, capacityChildren: 1,
    sizeSqm: '', pricePerNight: '', pricePerWeek: '', pricePerMonth: '',
    status: 'Available', isFeatured: false,
    amenityIds: [] as number[],
  });

  useEffect(() => {
    amenities.getAll().then(setAmenityList);
    if (!isNew) {
      rooms.getById(Number(id)).then((r: RoomDto) => {
        setForm({
          roomNumber: r.roomNumber, floor: r.floor,
          nameFr: r.nameFr, nameEn: r.nameEn,
          descriptionFr: r.descriptionFr ?? '', descriptionEn: r.descriptionEn ?? '',
          capacityAdults: r.capacityAdults, capacityChildren: r.capacityChildren,
          sizeSqm: r.sizeSqm ? String(r.sizeSqm) : '',
          pricePerNight: String(r.pricePerNight),
          pricePerWeek: r.pricePerWeek ? String(r.pricePerWeek) : '',
          pricePerMonth: r.pricePerMonth ? String(r.pricePerMonth) : '',
          status: r.status, isFeatured: r.isFeatured,
          amenityIds: r.amenities.map(a => a.id),
        });
      }).finally(() => setLoading(false));
    }
  }, [id, isNew]);

  function set(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleAmenity(aid: number) {
    setForm(prev => ({
      ...prev,
      amenityIds: prev.amenityIds.includes(aid)
        ? prev.amenityIds.filter(x => x !== aid)
        : [...prev.amenityIds, aid],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        roomNumber: form.roomNumber, floor: Number(form.floor),
        nameFr: form.nameFr, nameEn: form.nameEn,
        descriptionFr: form.descriptionFr || null, descriptionEn: form.descriptionEn || null,
        capacityAdults: Number(form.capacityAdults), capacityChildren: Number(form.capacityChildren),
        sizeSqm: form.sizeSqm ? Number(form.sizeSqm) : null,
        pricePerNight: Number(form.pricePerNight),
        pricePerWeek: form.pricePerWeek ? Number(form.pricePerWeek) : null,
        pricePerMonth: form.pricePerMonth ? Number(form.pricePerMonth) : null,
        status: form.status, isFeatured: form.isFeatured,
        amenityIds: form.amenityIds,
      };
      if (isNew) {
        await rooms.create(body);
      } else {
        await rooms.update(Number(id), body);
      }
      router.push('/rooms');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Chambre" />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={isNew ? 'Nouvelle chambre' : 'Modifier la chambre'} />
      <div className="flex-1 p-6 max-w-3xl">
        <Link href="/rooms" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal mb-5">
          <ArrowLeft size={16} /> Retour aux chambres
        </Link>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identification */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-charcoal">Identification</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Numéro de chambre *</label>
                <input required value={form.roomNumber} onChange={e => set('roomNumber', e.target.value)}
                  placeholder="201" className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Étage *</label>
                <select value={form.floor} onChange={e => set('floor', Number(e.target.value))} className="input">
                  {[2, 4, 5, 6].map(f => <option key={f} value={f}>{f}ème étage</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Nom (FR) *</label>
                <input required value={form.nameFr} onChange={e => set('nameFr', e.target.value)}
                  placeholder="Suite Panorama" className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Nom (EN) *</label>
                <input required value={form.nameEn} onChange={e => set('nameEn', e.target.value)}
                  placeholder="Panorama Suite" className="input" />
              </div>
            </div>
          </div>

          {/* Descriptions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-charcoal">Descriptions</h2>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Description (FR)</label>
              <textarea rows={3} value={form.descriptionFr} onChange={e => set('descriptionFr', e.target.value)}
                className="input resize-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Description (EN)</label>
              <textarea rows={3} value={form.descriptionEn} onChange={e => set('descriptionEn', e.target.value)}
                className="input resize-none" />
            </div>
          </div>

          {/* Capacité & prix */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-charcoal">Capacité & Prix</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Adultes max</label>
                <input type="number" min="1" max="20" value={form.capacityAdults}
                  onChange={e => set('capacityAdults', e.target.value)} className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Enfants max</label>
                <input type="number" min="0" max="10" value={form.capacityChildren}
                  onChange={e => set('capacityChildren', e.target.value)} className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Surface (m²)</label>
                <input type="number" min="0" value={form.sizeSqm}
                  onChange={e => set('sizeSqm', e.target.value)} placeholder="65" className="input" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Prix/nuit (XOF) *</label>
                <input type="number" required min="0" value={form.pricePerNight}
                  onChange={e => set('pricePerNight', e.target.value)} className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Prix/semaine</label>
                <input type="number" min="0" value={form.pricePerWeek}
                  onChange={e => set('pricePerWeek', e.target.value)} className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Prix/mois</label>
                <input type="number" min="0" value={form.pricePerMonth}
                  onChange={e => set('pricePerMonth', e.target.value)} className="input" />
              </div>
            </div>
          </div>

          {/* Statut */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-charcoal">Statut</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Statut</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} className="input">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_FR[s]}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isFeatured}
                    onChange={e => set('isFeatured', e.target.checked)}
                    className="w-4 h-4 accent-gold" />
                  <span className="text-sm text-gray-700">Chambre mise en avant</span>
                </label>
              </div>
            </div>
          </div>

          {/* Équipements */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-charcoal">Équipements</h2>
            <div className="flex flex-wrap gap-2">
              {amenityList.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAmenity(a.id)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    form.amenityIds.includes(a.id)
                      ? 'bg-charcoal text-white border-charcoal'
                      : 'border-gray-200 text-gray-600 hover:border-green/40 hover:text-charcoal'
                  }`}
                >
                  {a.nameFr}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-charcoal text-white font-medium px-6 py-2.5 rounded-lg hover:bg-charcoal-800 disabled:opacity-60 transition-colors"
            >
              <Save size={16} />
              {saving ? 'Enregistrement…' : (isNew ? 'Créer la chambre' : 'Sauvegarder')}
            </button>
            <Link href="/rooms" className="px-5 py-2.5 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              Annuler
            </Link>
          </div>
        </form>
      </div>

      <style>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          box-shadow: 0 0 0 2px rgba(61,199,32,0.25);
          border-color: rgba(61,199,32,0.4);
        }
      `}</style>
    </div>
  );
}
