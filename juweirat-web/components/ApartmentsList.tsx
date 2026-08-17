'use client'
import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight, SlidersHorizontal, X, Search, ChevronLeft, ChevronRight,
  Wifi, Wind, Tv2, Car, Droplets, ShieldCheck, UtensilsCrossed, Coffee,
  Shirt, Bath, Waves, Dumbbell, BedDouble, Zap, Flame, Lock, AirVent,
  Refrigerator, WashingMachine, Microwave, Check,
} from 'lucide-react'
import type { Room, RoomAmenity } from '@/lib/api'
import type { Lang } from '@/lib/i18n'
import { getCategoryPhotos } from '@/lib/categoryPhotos'

const PER_PAGE = 4

/* Map icon field values (lowercased) to Lucide components */
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  wifi: Wifi, 'wi-fi': Wifi, 'wi_fi': Wifi,
  'air-conditioning': AirVent, 'air_conditioning': AirVent, climatisation: AirVent, aircon: AirVent, wind: Wind,
  tv: Tv2, television: Tv2, 'tv2': Tv2,
  kitchen: UtensilsCrossed, cuisine: UtensilsCrossed, utensils: UtensilsCrossed,
  parking: Car, car: Car,
  water: Droplets, 'hot-water': Droplets, 'eau-chaude': Droplets, droplets: Droplets,
  security: ShieldCheck, securite: ShieldCheck, shield: ShieldCheck,
  coffee: Coffee, cafe: Coffee,
  laundry: WashingMachine, laverie: WashingMachine, washing: WashingMachine,
  bath: Bath, salle_bain: Bath, bathroom: Bath,
  pool: Waves, piscine: Waves, waves: Waves,
  gym: Dumbbell, fitness: Dumbbell,
  bed: BedDouble, chambre: BedDouble,
  electricity: Zap, electricite: Zap, zap: Zap,
  heating: Flame, chauffage: Flame, flame: Flame,
  lock: Lock, safe: Lock,
  fridge: Refrigerator, refrigerator: Refrigerator, frigo: Refrigerator,
  microwave: Microwave, 'micro-onde': Microwave,
  iron: Shirt, fer: Shirt, shirt: Shirt,
}

function AmenityIcon({ amenity }: { amenity: RoomAmenity }) {
  const key    = amenity.icon?.toLowerCase().trim() ?? ''
  const Mapped = ICON_MAP[key]
  if (Mapped) return <Mapped size={14} className="text-green shrink-0" />
  /* emoji or short string → render as text */
  if (amenity.icon && amenity.icon.length <= 3) {
    return <span className="text-sm leading-none shrink-0">{amenity.icon}</span>
  }
  return <Check size={14} className="text-green shrink-0" />
}

interface Props {
  rooms: Room[]
  lang: Lang
}

type SortKey = 'featured' | 'price_asc' | 'price_desc' | 'size_desc'

export default function ApartmentsList({ rooms, lang }: Props) {
  const fr = lang === 'fr'

  const [search,    setSearch]    = useState('')
  const [sortBy,    setSortBy]    = useState<SortKey>('featured')
  const [priceMin,  setPriceMin]  = useState('')
  const [priceMax,  setPriceMax]  = useState('')
  const [minAdults, setMinAdults] = useState(1)
  const [availOnly, setAvailOnly] = useState(false)
  const [prestige,  setPrestige]  = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [page,      setPage]      = useState(1)

  /* All unique amenities across every room — for the info display */
  const allAmenities = useMemo(() => {
    const map = new Map<number, RoomAmenity>()
    rooms.forEach(r => r.amenities.forEach(a => map.set(a.id, a)))
    return [...map.values()].sort((a, b) => a.nameFr.localeCompare(b.nameFr))
  }, [rooms])

  const filtered = useMemo(() => {
    let list = [...rooms]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.nameFr.toLowerCase().includes(q) ||
        r.nameEn.toLowerCase().includes(q) ||
        r.roomNumber.toLowerCase().includes(q)
      )
    }

    if (priceMin) list = list.filter(r => r.pricePerNight >= parseInt(priceMin))
    if (priceMax) list = list.filter(r => r.pricePerNight <= parseInt(priceMax))
    list = list.filter(r => r.capacityAdults >= minAdults)
    if (availOnly) list = list.filter(r => r.status === 'Available')
    if (prestige)  list = list.filter(r => r.floor === 6)

    switch (sortBy) {
      case 'featured':   list.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)); break
      case 'price_asc':  list.sort((a, b) => a.pricePerNight - b.pricePerNight); break
      case 'price_desc': list.sort((a, b) => b.pricePerNight - a.pricePerNight); break
      case 'size_desc':  list.sort((a, b) => (b.sizeSqm ?? 0) - (a.sizeSqm ?? 0)); break
    }

    return list
  }, [rooms, search, priceMin, priceMax, minAdults, availOnly, prestige, sortBy])

  const hasFilters = !!(search || priceMin || priceMax || minAdults > 1 || availOnly || prestige)

  useEffect(() => { setPage(1) }, [search, priceMin, priceMax, minAdults, availOnly, prestige])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const clearFilters = () => {
    setSearch('')
    setPriceMin('')
    setPriceMax('')
    setMinAdults(1)
    setAvailOnly(false)
    setPrestige(false)
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)

  /* ── Filter + amenities panel (desktop sidebar & mobile drawer) ── */
  const filterPanel = (
    <div className="space-y-6">

      {/* Search */}
      <div>
        <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-2">
          {fr ? 'Recherche' : 'Search'}
        </label>
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={fr ? 'Nom, numéro…' : 'Name, number…'}
            className="w-full bg-white border border-charcoal/10 text-charcoal text-xs pl-8 pr-3 py-2.5
                       focus:outline-none focus:border-green transition-colors placeholder:text-charcoal/25"
          />
        </div>
      </div>

      {/* Sort */}
      <div>
        <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-2">
          {fr ? 'Trier par' : 'Sort by'}
        </label>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="w-full bg-white border border-charcoal/10 text-charcoal text-xs px-3 py-2.5
                     focus:outline-none focus:border-green transition-colors"
        >
          <option value="featured">{fr ? 'À la une' : 'Featured'}</option>
          <option value="price_asc">{fr ? 'Prix croissant' : 'Price: low to high'}</option>
          <option value="price_desc">{fr ? 'Prix décroissant' : 'Price: high to low'}</option>
          <option value="size_desc">{fr ? 'Surface décroissante' : 'Largest first'}</option>
        </select>
      </div>

      {/* Price range */}
      <div>
        <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-2">
          {fr ? 'Prix / nuit (FCFA)' : 'Price / night (FCFA)'}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={priceMin}
            onChange={e => setPriceMin(e.target.value)}
            placeholder="Min"
            min={0}
            className="w-full bg-white border border-charcoal/10 text-charcoal text-xs px-3 py-2.5
                       focus:outline-none focus:border-green transition-colors placeholder:text-charcoal/25"
          />
          <input
            type="number"
            value={priceMax}
            onChange={e => setPriceMax(e.target.value)}
            placeholder="Max"
            min={0}
            className="w-full bg-white border border-charcoal/10 text-charcoal text-xs px-3 py-2.5
                       focus:outline-none focus:border-green transition-colors placeholder:text-charcoal/25"
          />
        </div>
      </div>

      {/* Min adults */}
      <div>
        <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-2">
          {fr ? 'Adultes minimum' : 'Min. adults'}
        </label>
        <div className="flex items-center border border-charcoal/10 bg-white">
          <button
            onClick={() => setMinAdults(a => Math.max(1, a - 1))}
            className="px-3 py-2.5 text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors text-sm"
          >−</button>
          <span className="flex-1 text-center text-charcoal text-xs font-light">{minAdults}</span>
          <button
            onClick={() => setMinAdults(a => Math.min(6, a + 1))}
            className="px-3 py-2.5 text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors text-sm"
          >+</button>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setAvailOnly(v => !v)}>
          <div className={`w-10 h-5 rounded-full transition-colors duration-200 relative shrink-0 ${availOnly ? 'bg-green' : 'bg-charcoal/15'}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${availOnly ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
          <span className="text-charcoal/60 text-xs font-light group-hover:text-charcoal transition-colors">
            {fr ? 'Disponibles uniquement' : 'Available only'}
          </span>
        </div>

        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setPrestige(v => !v)}>
          <div className={`w-10 h-5 rounded-full transition-colors duration-200 relative shrink-0 ${prestige ? 'bg-green' : 'bg-charcoal/15'}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${prestige ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
          <span className="text-charcoal/60 text-xs font-light group-hover:text-charcoal transition-colors">
            {fr ? 'Prestige (6ème étage)' : 'Prestige (6th floor)'}
          </span>
        </div>
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="w-full text-xs tracking-widest uppercase font-light text-charcoal/40 border border-charcoal/10
                     py-2.5 hover:border-charcoal/30 hover:text-charcoal/70 transition-colors flex items-center justify-center gap-2"
        >
          <X size={12} />
          {fr ? 'Effacer les filtres' : 'Clear filters'}
        </button>
      )}

      {/* ── Amenities info display (not a filter) ── */}
      {allAmenities.length > 0 && (
        <div className="pt-2">
          <div className="h-px bg-charcoal/8 mb-5" />
          <p className="text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-4">
            {fr ? 'Inclus dans chaque appartement' : 'Included in every apartment'}
          </p>
          <div className="grid grid-cols-1 gap-2.5">
            {allAmenities.map(a => (
              <div key={a.id} className="flex items-center gap-2.5">
                <AmenityIcon amenity={a} />
                <span className="text-charcoal/60 text-xs font-light">
                  {lang === 'en' ? a.nameEn : a.nameFr}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div>
      {/* Mobile: result count + filter toggle */}
      <div className="lg:hidden mb-5 flex items-center justify-between">
        <p className="text-charcoal/50 text-sm font-light">
          {filtered.length} {fr
            ? (filtered.length > 1 ? 'appartements' : 'appartement')
            : (filtered.length > 1 ? 'apartments' : 'apartment')}
          {filtered.length > 0 && ` · p. ${page}/${totalPages}`}
        </p>
        <button
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-2 border border-charcoal/15 px-4 py-2 text-xs tracking-widest uppercase font-light text-charcoal/60
                     hover:border-green hover:text-green transition-colors"
        >
          <SlidersHorizontal size={13} />
          {fr ? 'Filtres' : 'Filters'}
          {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-green" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {panelOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-charcoal/20" onClick={() => setPanelOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-surface overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-charcoal/5">
              <p className="text-charcoal text-xs tracking-widest uppercase font-light flex items-center gap-2">
                <SlidersHorizontal size={13} className="text-green" />
                {fr ? 'Filtres' : 'Filters'}
              </p>
              <button onClick={() => setPanelOpen(false)} className="text-charcoal/40 hover:text-charcoal transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">{filterPanel}</div>
          </div>
        </div>
      )}

      {/* Desktop layout: rooms grid + sidebar */}
      <div className="flex gap-8 items-start">

        {/* Rooms grid */}
        <div className="flex-1 min-w-0">
          <p className="text-charcoal/40 text-xs font-light mb-6 hidden lg:flex items-center gap-3">
            {filtered.length === 0
              ? (fr ? '0 appartement trouvé' : '0 apartments found')
              : fr
                ? `${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, filtered.length)} sur ${filtered.length} appartement${filtered.length > 1 ? 's' : ''}`
                : `${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, filtered.length)} of ${filtered.length} apartment${filtered.length > 1 ? 's' : ''}`}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-green text-[10px] tracking-widest uppercase underline underline-offset-2 hover:text-green-dark transition-colors"
              >
                {fr ? 'Effacer' : 'Clear'}
              </button>
            )}
          </p>

          {filtered.length === 0 ? (
            <div className="text-center py-24 border border-charcoal/5 bg-surface">
              <p className="text-charcoal/40 text-sm font-light mb-4">
                {fr ? 'Aucun appartement ne correspond à vos critères.' : 'No apartments match your criteria.'}
              </p>
              <button
                onClick={clearFilters}
                className="text-green text-xs tracking-widest uppercase hover:text-green-dark transition-colors"
              >
                {fr ? 'Réinitialiser les filtres' : 'Reset filters'}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-charcoal/5">
                {paginated.map(room => {
                  const name       = lang === 'en' ? room.nameEn : room.nameFr
                  const cover      = room.images.find(i => i.isCover)?.filePath ?? room.images[0]?.filePath ?? (room.categorySlug ? getCategoryPhotos(room.categorySlug).hero : '/images/IMG_5101.jpg')
                  const available  = room.status === 'Available'
                  const isPrestige = room.floor === 6

                  return (
                    <Link
                      key={room.id}
                      href={`/appartements/${room.id}`}
                      className="group bg-white block hover:shadow-sm transition-shadow duration-300"
                    >
                      <div className="relative h-52 overflow-hidden">
                        <Image
                          src={cover}
                          alt={name}
                          fill
                          loading="lazy"
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
                        />
                        <div className="absolute inset-0 bg-charcoal/15 group-hover:bg-charcoal/5 transition-colors duration-500" />

                        <div className="absolute top-3 left-3 flex gap-2">
                          {isPrestige && (
                            <span className="text-[10px] tracking-widest uppercase bg-green text-charcoal px-2.5 py-1 font-semibold">
                              {fr ? 'Prestige' : 'Prestige'}
                            </span>
                          )}
                          {room.isFeatured && !isPrestige && (
                            <span className="text-[10px] tracking-widest uppercase bg-green/80 text-charcoal px-2.5 py-1 font-semibold">
                              {fr ? 'À la une' : 'Featured'}
                            </span>
                          )}
                        </div>

                        <div className="absolute top-3 right-3">
                          <span className={`text-[10px] tracking-widest uppercase px-2.5 py-1 font-medium ${
                            available ? 'bg-green/20 text-green' : 'bg-charcoal/40 text-white/80'
                          }`}>
                            {available
                              ? (fr ? 'Disponible' : 'Available')
                              : (fr ? 'Occupé' : 'Occupied')}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 border-t border-charcoal/5 hover:bg-surface transition-colors duration-300">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-display text-lg font-light text-charcoal group-hover:text-green transition-colors duration-300 leading-snug">
                            {name}
                          </h3>
                          <ArrowRight size={14} className="text-green/40 group-hover:text-green group-hover:translate-x-1 transition-all duration-300 mt-1 shrink-0 ml-2" />
                        </div>
                        <p className="text-charcoal/30 text-xs font-light mb-3">{room.roomNumber}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline gap-1">
                            <span className="text-charcoal/40 text-xs">{fr ? 'à partir de' : 'from'}</span>
                            <span className="text-green font-medium text-sm">{fmt(room.pricePerNight)} FCFA</span>
                            <span className="text-charcoal/30 text-xs">{fr ? '/ nuit' : '/ night'}</span>
                          </div>
                          <span className="text-charcoal/30 text-xs font-light">
                            {room.capacityAdults} {fr ? 'pers.' : 'pax'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between">
                  <p className="text-charcoal/40 text-xs font-light lg:hidden">
                    {fr
                      ? `${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, filtered.length)} sur ${filtered.length}`
                      : `${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, filtered.length)} of ${filtered.length}`}
                  </p>

                  <div className="flex items-center gap-1 mx-auto lg:mx-0">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-9 h-9 flex items-center justify-center border border-charcoal/10 text-charcoal/50
                                 hover:border-green hover:text-green transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={`w-9 h-9 flex items-center justify-center text-xs font-light border transition-colors ${
                          n === page
                            ? 'bg-green border-green text-charcoal font-medium'
                            : 'border-charcoal/10 text-charcoal/50 hover:border-green hover:text-green'
                        }`}
                      >
                        {n}
                      </button>
                    ))}

                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="w-9 h-9 flex items-center justify-center border border-charcoal/10 text-charcoal/50
                                 hover:border-green hover:text-green transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Desktop filter + amenities sidebar (right) */}
        <div className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24 bg-surface border border-charcoal/5 p-6 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <p className="text-charcoal text-xs tracking-widest uppercase font-light flex items-center gap-2">
                <SlidersHorizontal size={13} className="text-green" />
                {fr ? 'Filtres' : 'Filters'}
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] tracking-widest uppercase text-green/70 hover:text-green transition-colors"
                >
                  {fr ? 'Effacer' : 'Clear'}
                </button>
              )}
            </div>
            {filterPanel}
          </div>
        </div>
      </div>
    </div>
  )
}
