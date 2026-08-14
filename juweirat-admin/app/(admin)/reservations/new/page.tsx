'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { categories, clients, rooms, reservations } from '@/lib/api';
import type { ClientDto, RoomCategoryDto, RoomDto } from '@/lib/types';
import { ArrowLeft, Save, Search, Zap } from 'lucide-react';
import Link from 'next/link';

const SOURCES    = ['Direct', 'Téléphone', 'Walk-in', 'Booking.com', 'Expedia', 'Airbnb'];
const CURRENCIES = ['XOF', 'EUR', 'USD'];
const KWH_PRICE  = 230;

function nightsBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  const diff = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
  return diff > 0 ? Math.round(diff) : 0;
}

function tierFor(n: number, cat: RoomCategoryDto): { label: string; ratePerNight: number; elecIncluded: boolean } {
  if (n >= 30) return { label: 'Forfait mensuel',  ratePerNight: cat.tarifN30,   elecIncluded: false };
  if (n >= 15) return { label: 'Forfait 15 jours', ratePerNight: cat.tarifN15,   elecIncluded: false };
  return              { label: 'Nuitée',            ratePerNight: cat.tarifNuit,  elecIncluded: true  };
}

const GAMME_LABELS: Record<string, string> = {
  standard:   'Standard',
  supérieure: 'Supérieure',
  privilège:  'Privilège',
  suite:      'Suite',
};

export default function NewReservationPage() {
  const router = useRouter();

  const [categoryList, setCategoryList] = useState<RoomCategoryDto[]>([]);
  const [roomList, setRoomList]         = useState<RoomDto[]>([]);
  const [clientList, setClientList]     = useState<ClientDto[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showDrop, setShowDrop]         = useState(false);
  const [kwh, setKwh]                   = useState('');
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    clientId:        0,
    clientLabel:     '',
    categoryId:      0,
    roomId:          0,  // 0 = auto-assign
    checkInDate:     '',
    checkOutDate:    '',
    adults:          1,
    children:        0,
    currency:        'XOF',
    source:          '',
    specialRequests: '',
    internalNotes:   '',
  });

  useEffect(() => { categories.getAll().then(setCategoryList); }, []);
  useEffect(() => { rooms.getAll().then(setRoomList); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      clients.getAll(clientSearch || undefined).then(setClientList);
    }, 250);
    return () => clearTimeout(t);
  }, [clientSearch]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setShowDrop(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function set(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function selectClient(c: ClientDto) {
    setForm(prev => ({ ...prev, clientId: c.id, clientLabel: c.fullName }));
    setClientSearch(c.fullName);
    setShowDrop(false);
  }

  // Rooms in the selected category (for optional specific assignment)
  const categoryRooms = roomList.filter(r => r.categoryId === form.categoryId && r.status === 'Available');

  const nights          = nightsBetween(form.checkInDate, form.checkOutDate);
  const selectedCat     = categoryList.find(c => c.id === form.categoryId) ?? null;
  const tier            = selectedCat && nights > 0 ? tierFor(nights, selectedCat) : null;
  const hebergement     = tier ? tier.ratePerNight * nights : 0;
  const elecCost        = tier && !tier.elecIncluded ? (Number(kwh) || 0) * KWH_PRICE : 0;
  const totalEstime     = hebergement + elecCost;

  const filteredClients = clientList
    .filter(c =>
      !clientSearch ||
      c.fullName.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.phone ?? '').includes(clientSearch) ||
      (c.email ?? '').toLowerCase().includes(clientSearch.toLowerCase())
    )
    .slice(0, 8);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId)   { setError('Veuillez sélectionner un client.'); return; }
    if (!form.categoryId) { setError('Veuillez sélectionner une catégorie.'); return; }
    if (nights <= 0)      { setError("La date de départ doit être postérieure à la date d'arrivée."); return; }
    setError('');
    setSaving(true);
    try {
      const body = {
        categoryId:      form.categoryId,
        clientId:        form.clientId,
        roomId:          form.roomId > 0 ? form.roomId : null,
        checkInDate:     form.checkInDate,
        checkOutDate:    form.checkOutDate,
        adults:          Number(form.adults),
        children:        Number(form.children),
        currency:        form.currency,
        source:          form.source || null,
        specialRequests: form.specialRequests || null,
        internalNotes:   form.internalNotes || null,
      };
      const created = await reservations.create(body);
      router.push(`/reservations/${created.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Nouvelle réservation" />
      <div className="flex-1 p-6 max-w-2xl">
        <Link href="/reservations" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal mb-5">
          <ArrowLeft size={16} /> Retour aux réservations
        </Link>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Client ──────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Client</h2>
            <div className="space-y-1" ref={dropRef}>
              <label className="text-xs font-medium text-gray-500">Rechercher un client *</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={clientSearch}
                  onChange={e => {
                    setClientSearch(e.target.value);
                    setShowDrop(true);
                    if (form.clientId) setForm(prev => ({ ...prev, clientId: 0, clientLabel: '' }));
                  }}
                  onFocus={() => setShowDrop(true)}
                  placeholder="Nom, email, téléphone…"
                  className="input pl-9"
                  autoComplete="off"
                />
                {showDrop && filteredClients.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {filteredClients.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => selectClient(c)}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 flex items-center justify-between"
                      >
                        <span className="font-medium text-charcoal">{c.fullName}</span>
                        {c.phone && <span className="text-gray-400 text-xs">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {form.clientId > 0 && (
                <p className="text-xs text-green-dark font-medium">✓ {form.clientLabel}</p>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Client introuvable ?{' '}
              <Link href="/clients/new" className="text-green-dark hover:underline font-medium">
                Créer un nouveau client
              </Link>
            </p>
          </div>

          {/* ── Séjour ──────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Séjour</h2>

            {/* Catégorie */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Catégorie *</label>
              <select
                required
                value={form.categoryId}
                onChange={e => { set('categoryId', Number(e.target.value)); set('roomId', 0); setKwh(''); }}
                className="input"
              >
                <option value={0}>— Sélectionner une catégorie —</option>
                {categoryList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.pmsType} {GAMME_LABELS[c.pmsGamme] ?? c.pmsGamme} — {c.nameFr} ({c.tarifNuit.toLocaleString('fr')} XOF/nuit)
                  </option>
                ))}
              </select>
            </div>

            {/* Unité spécifique (optionnel) */}
            {form.categoryId > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Unité spécifique <span className="text-gray-400">(optionnel — auto-assignée si non précisée)</span></label>
                <select
                  value={form.roomId}
                  onChange={e => set('roomId', Number(e.target.value))}
                  className="input"
                >
                  <option value={0}>— Auto-assignée par le système —</option>
                  {categoryRooms.map(r => (
                    <option key={r.id} value={r.id}>
                      Apt. {r.roomNumber} — {r.nameFr} (ét. {r.floor})
                    </option>
                  ))}
                </select>
                {categoryRooms.length === 0 && (
                  <p className="text-xs text-amber-600">Aucune unité disponible dans cette catégorie.</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Arrivée *</label>
                <input required type="date" value={form.checkInDate}
                  onChange={e => { set('checkInDate', e.target.value); setKwh(''); }}
                  className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Départ *</label>
                <input required type="date" value={form.checkOutDate}
                  min={form.checkInDate || undefined}
                  onChange={e => { set('checkOutDate', e.target.value); setKwh(''); }}
                  className="input" />
              </div>
            </div>

            {/* Récapitulatif tarifaire */}
            {tier && nights > 0 && (
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1.5 border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">Durée</span>
                  <span className="font-medium text-charcoal">{nights} nuit{nights > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Palier tarifaire</span>
                  <span className="font-medium text-charcoal">{tier.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tarif / nuit</span>
                  <span className="font-semibold text-green-dark">{tier.ratePerNight.toLocaleString('fr')} XOF</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Électricité</span>
                  <span className={tier.elecIncluded ? 'text-green-dark font-medium' : 'text-amber-600 font-medium'}>
                    {tier.elecIncluded ? 'Incluse' : `Hors forfait — ${KWH_PRICE} FCFA/kWh`}
                  </span>
                </div>

                {!tier.elecIncluded && (
                  <div className="border-t border-gray-200 pt-2 mt-1 space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                      <Zap size={12} className="text-amber-500" />
                      kWh consommés par l'occupant
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="0" step="0.1" value={kwh}
                        onChange={e => setKwh(e.target.value)}
                        placeholder="0" className="input w-32"
                      />
                      <span className="text-xs text-gray-400">kWh</span>
                      {Number(kwh) > 0 && (
                        <span className="text-xs font-semibold text-amber-600 ml-auto">
                          + {elecCost.toLocaleString('fr')} XOF
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1">
                  <span className="text-gray-500">Total hébergement estimé</span>
                  <span className="font-bold text-charcoal">{totalEstime.toLocaleString('fr')} XOF</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Adultes</label>
                <input type="number" min="1" max="20" value={form.adults}
                  onChange={e => set('adults', e.target.value)} className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Enfants</label>
                <input type="number" min="0" max="10" value={form.children}
                  onChange={e => set('children', e.target.value)} className="input" />
              </div>
            </div>
          </div>

          {/* ── Détails ─────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Détails</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Source</label>
                <select value={form.source} onChange={e => set('source', e.target.value)} className="input">
                  <option value="">— Sélectionner —</option>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Devise</label>
                <select value={form.currency} onChange={e => set('currency', e.target.value)} className="input">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Demandes spéciales</label>
              <textarea rows={2} value={form.specialRequests}
                onChange={e => set('specialRequests', e.target.value)}
                placeholder="Chambre non-fumeur, lit bébé, étage élevé…" className="input resize-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Notes internes</label>
              <textarea rows={2} value={form.internalNotes}
                onChange={e => set('internalNotes', e.target.value)}
                placeholder="Notes pour le personnel…" className="input resize-none" />
            </div>
          </div>

          {/* ── Actions ─────────────────────────────────────────────────────── */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-charcoal text-white font-medium px-6 py-2.5 rounded-lg hover:bg-charcoal-800 disabled:opacity-60 transition-colors"
            >
              <Save size={15} />
              {saving ? 'Enregistrement…' : 'Créer la réservation'}
            </button>
            <Link href="/reservations" className="px-5 py-2.5 text-sm text-gray-500 rounded-lg hover:bg-gray-100 transition-colors">
              Annuler
            </Link>
          </div>
        </form>
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
