'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { rooms, amenities, roomImages } from '@/lib/api';
import type { RoomDto, AmenityDto, RoomImageDto } from '@/lib/types';
import { ArrowLeft, Save, ImagePlus, Trash2, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const STATUSES = ['Available', 'Occupied', 'Maintenance', 'Inactive'];
const STATUS_FR: Record<string, string> = {
  Available: 'Disponible', Occupied: 'Occupée',
  Maintenance: 'Maintenance', Inactive: 'Inactive',
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function RoomFormPage() {
  const { id }   = useParams<{ id: string }>();
  const isNew    = id === 'new';
  const router   = useRouter();

  const [amenityList, setAmenityList] = useState<AmenityDto[]>([]);
  const [loading, setLoading]         = useState(!isNew);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  // Images (only for existing rooms)
  const [images, setImages]       = useState<RoomImageDto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileInputRef              = useRef<HTMLInputElement>(null);

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
        setImages(r.images ?? []);
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
        const created = await rooms.create(body);
        router.push(`/rooms/${created.id}`);
      } else {
        await rooms.update(Number(id), body);
        router.push('/rooms');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const invalid = files.filter(f => !ALLOWED_TYPES.includes(f.type));
    if (invalid.length) { setUploadErr('Formats acceptés : JPG, PNG, WEBP'); return; }

    setUploadErr('');
    setUploading(true);
    try {
      for (const file of files) {
        const img = await roomImages.upload(Number(id), file);
        setImages(prev => [...prev, img]);
      }
    } catch (err: unknown) {
      setUploadErr(err instanceof Error ? err.message : 'Erreur upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteImage(imageId: number) {
    if (!confirm('Supprimer cette photo ?')) return;
    try {
      await roomImages.delete(Number(id), imageId);
      setImages(prev => prev.filter(i => i.id !== imageId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function handleSetCover(imageId: number) {
    try {
      await roomImages.setCover(Number(id), imageId);
      setImages(prev => prev.map(i => ({ ...i, isCover: i.id === imageId })));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur');
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Identification */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-charcoal">Identification</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Numéro de chambre *</label>
                <input required value={form.roomNumber} onChange={e => set('roomNumber', e.target.value)}
                  placeholder="201" className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Étage *</label>
                <select value={form.floor} onChange={e => set('floor', Number(e.target.value))} className="input">
                  {[2, 4, 5, 6].map(f => <option key={f} value={f}>{f}ème étage</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Nom (FR) *</label>
                <input required value={form.nameFr} onChange={e => set('nameFr', e.target.value)}
                  placeholder="Suite Panorama" className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Nom (EN) *</label>
                <input required value={form.nameEn} onChange={e => set('nameEn', e.target.value)}
                  placeholder="Panorama Suite" className="input" />
              </div>
            </div>
          </div>

          {/* Descriptions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-charcoal">Descriptions</h2>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Description (FR)</label>
              <textarea rows={3} value={form.descriptionFr} onChange={e => set('descriptionFr', e.target.value)}
                className="input resize-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Description (EN)</label>
              <textarea rows={3} value={form.descriptionEn} onChange={e => set('descriptionEn', e.target.value)}
                className="input resize-none" />
            </div>
          </div>

          {/* Capacité & Prix */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-charcoal">Capacité & Prix</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Adultes max</label>
                <input type="number" min="1" max="20" value={form.capacityAdults}
                  onChange={e => set('capacityAdults', e.target.value)} className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Enfants max</label>
                <input type="number" min="0" max="10" value={form.capacityChildren}
                  onChange={e => set('capacityChildren', e.target.value)} className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Surface (m²)</label>
                <input type="number" min="0" value={form.sizeSqm}
                  onChange={e => set('sizeSqm', e.target.value)} placeholder="65" className="input" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Prix / nuit (XOF) *</label>
                <input type="number" required min="0" value={form.pricePerNight}
                  onChange={e => set('pricePerNight', e.target.value)} className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Prix / semaine</label>
                <input type="number" min="0" value={form.pricePerWeek}
                  onChange={e => set('pricePerWeek', e.target.value)} className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Prix / mois</label>
                <input type="number" min="0" value={form.pricePerMonth}
                  onChange={e => set('pricePerMonth', e.target.value)} className="input" />
              </div>
            </div>
          </div>

          {/* Statut */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-charcoal">Statut</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Statut</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} className="input">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_FR[s]}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={form.isFeatured}
                    onChange={e => set('isFeatured', e.target.checked)}
                    className="w-4 h-4 accent-green" />
                  <span className="text-sm text-gray-700">Chambre mise en avant</span>
                </label>
              </div>
            </div>
          </div>

          {/* Équipements */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-charcoal">Équipements</h2>
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
              <Save size={15} />
              {saving ? 'Enregistrement…' : (isNew ? 'Créer la chambre' : 'Sauvegarder')}
            </button>
            <Link href="/rooms" className="px-5 py-2.5 text-sm text-gray-500 rounded-lg hover:bg-gray-100 transition-colors">
              Annuler
            </Link>
          </div>
        </form>

        {/* ── Photos (uniquement pour une chambre existante) ─────────────────── */}
        {!isNew && (
          <div className="mt-5 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-4 bg-green rounded-full" />
                <h2 className="text-sm font-semibold text-charcoal">Photos</h2>
                <span className="text-xs text-gray-400">({images.length})</span>
              </div>

              <label className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                uploading
                  ? 'bg-gray-100 text-gray-400 pointer-events-none'
                  : 'bg-charcoal text-white hover:bg-charcoal-800'
              }`}>
                <ImagePlus size={15} />
                {uploading ? 'Upload…' : 'Ajouter des photos'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>

            {uploadErr && (
              <div className="mx-5 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {uploadErr}
              </div>
            )}

            {images.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <ImagePlus size={20} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-400">Aucune photo pour cette chambre</p>
                <p className="text-xs text-gray-300 mt-1">Cliquez sur &ldquo;Ajouter des photos&rdquo; pour commencer</p>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map(img => (
                  <div
                    key={img.id}
                    className={`relative group rounded-lg overflow-hidden border-2 transition-colors ${
                      img.isCover ? 'border-green' : 'border-transparent'
                    }`}
                  >
                    <div className="aspect-video relative bg-gray-100">
                      <Image
                        src={img.filePath}
                        alt={img.altTextFr ?? ''}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    </div>

                    {/* Cover badge */}
                    {img.isCover && (
                      <div className="absolute top-2 left-2 bg-green text-charcoal text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star size={9} fill="currentColor" /> Couverture
                      </div>
                    )}

                    {/* Actions (visible on hover) */}
                    <div className="absolute inset-0 bg-charcoal/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {!img.isCover && (
                        <button
                          onClick={() => handleSetCover(img.id)}
                          title="Définir comme couverture"
                          className="flex items-center gap-1 bg-green text-charcoal text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-green-light transition-colors"
                        >
                          <Star size={12} /> Couverture
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        title="Supprimer"
                        className="bg-white/20 hover:bg-red-500 text-white p-1.5 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Upload in progress placeholder */}
                {uploading && (
                  <div className="aspect-video rounded-lg border-2 border-dashed border-green/40 bg-green/5 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          background: white;
        }
        .input:focus {
          box-shadow: 0 0 0 2px rgba(61,199,32,0.25);
          border-color: rgba(61,199,32,0.4);
        }
      `}</style>
    </div>
  );
}
