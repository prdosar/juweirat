'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Users, Home, Camera } from 'lucide-react'
import type { RoomCategory } from '@/lib/api'
import type { Lang } from '@/lib/i18n'
import { getCategoryPhotos } from '@/lib/categoryPhotos'

interface Props {
  categories: RoomCategory[]
  lang: Lang
}

const GAMME_ORDER = ['standard', 'supérieure', 'privilège', 'suite']

const GAMME_LABELS: Record<string, Record<string, string>> = {
  fr: { standard: 'Standard', supérieure: 'Supérieure', privilège: 'Privilège', suite: 'Suite' },
  en: { standard: 'Standard', supérieure: 'Superior',   privilège: 'Privilege',  suite: 'Suite' },
}

const TYPE_LABELS: Record<string, Record<string, string>> = {
  fr: { T1: 'Studio', T2: 'Appartement 2 pièces', T3: 'Appartement 3 pièces', T4: 'Suite penthouse' },
  en: { T1: 'Studio',  T2: '2-Room Apartment',    T3: '3-Room Apartment',     T4: 'Penthouse Suite' },
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}

export default function CategoriesList({ categories, lang }: Props) {
  const fr = lang === 'fr'
  const [filterGamme, setFilterGamme] = useState('')
  const [filterType,  setFilterType]  = useState('')

  const gammes = useMemo(() =>
    [...new Set(categories.map(c => c.pmsGamme))].sort((a, b) =>
      GAMME_ORDER.indexOf(a) - GAMME_ORDER.indexOf(b)
    ), [categories])

  const types = useMemo(() =>
    [...new Set(categories.map(c => c.pmsType))].sort(), [categories])

  const filtered = useMemo(() => {
    let list = [...categories]
    if (filterGamme) list = list.filter(c => c.pmsGamme === filterGamme)
    if (filterType)  list = list.filter(c => c.pmsType  === filterType)
    return list.sort((a, b) => {
      const gA = GAMME_ORDER.indexOf(a.pmsGamme)
      const gB = GAMME_ORDER.indexOf(b.pmsGamme)
      if (gA !== gB) return gA - gB
      return a.pmsType.localeCompare(b.pmsType)
    })
  }, [categories, filterGamme, filterType])

  const gammeColors: Record<string, string> = {
    standard:   'bg-charcoal/80 text-white',
    supérieure: 'bg-green text-charcoal font-bold',
    privilège:  'bg-gold text-white font-bold',
    suite:      'bg-amber-500 text-white font-bold',
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setFilterGamme(''); setFilterType(''); }}
            className={`text-xs tracking-widest uppercase font-bold px-4 py-2 rounded-lg border transition-colors ${
              !filterGamme && !filterType
                ? 'border-green text-green bg-green/10'
                : 'border-gray-200 text-gray-400 hover:border-gray-400'
            }`}
          >
            {fr ? 'Tous' : 'All'}
          </button>
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilterType(prev => prev === t ? '' : t)}
              className={`text-xs tracking-widest uppercase font-bold px-4 py-2 rounded-lg border transition-colors ${
                filterType === t
                  ? 'border-green text-green bg-green/10'
                  : 'border-gray-200 text-gray-400 hover:border-gray-400'
              }`}
            >
              {t}
            </button>
          ))}
          <div className="w-px bg-gray-200 mx-1" />
          {gammes.map(g => (
            <button
              key={g}
              onClick={() => setFilterGamme(prev => prev === g ? '' : g)}
              className={`text-xs tracking-widest uppercase font-bold px-4 py-2 rounded-lg border transition-colors ${
                filterGamme === g
                  ? 'border-green text-green bg-green/10'
                  : 'border-gray-200 text-gray-400 hover:border-gray-400'
              }`}
            >
              {GAMME_LABELS[lang]?.[g] ?? g}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-gray-400 text-sm font-light text-center py-16">
          {fr ? 'Aucune catégorie trouvée.' : 'No categories found.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(cat => {
            const name = fr ? cat.nameFr : cat.nameEn
            const desc = fr ? cat.descriptionFr : cat.descriptionEn
            const gammeLabel = GAMME_LABELS[lang]?.[cat.pmsGamme] ?? cat.pmsGamme
            const typeLabel  = TYPE_LABELS[lang]?.[cat.pmsType] ?? cat.pmsType
            const photos = getCategoryPhotos(cat.slug)

            return (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col"
              >
                {/* Photo Thumbnail */}
                <div className="relative h-52 w-full bg-gray-100 overflow-hidden">
                  <Image
                    src={photos.hero}
                    alt={name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="font-mono text-[10px] font-bold text-white bg-charcoal/80 backdrop-blur-sm px-2.5 py-1 rounded-md">
                      {cat.pmsType}
                    </span>
                    <span className={`text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-md ${gammeColors[cat.pmsGamme] ?? 'bg-charcoal/80 text-white'}`}>
                      {gammeLabel}
                    </span>
                  </div>

                  <div className="absolute bottom-3 right-3 text-white text-[11px] font-medium bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-1">
                    <Camera size={11} /> {photos.gallery.length} photos
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-display text-xl font-bold text-charcoal group-hover:text-green transition-colors duration-300 leading-snug">
                        {name}
                      </h3>
                      <ArrowRight size={16} className="text-green/40 group-hover:text-green group-hover:translate-x-1 transition-all duration-300 mt-1 shrink-0 ml-2" />
                    </div>
                    <p className="text-gray-400 text-xs font-medium mb-2">{typeLabel}</p>

                    {desc && (
                      <p className="text-gray-500 text-xs font-light leading-relaxed line-clamp-2">{desc}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium mb-3">
                      <span className="flex items-center gap-1">
                        <Users size={13} className="text-green" />
                        {cat.capacityAdults} {fr ? 'adultes' : 'adults'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Home size={13} className="text-gold" />
                        {cat.roomCount} {fr ? 'logements' : 'units'}
                      </span>
                    </div>

                    {/* Tariff info */}
                    <div className="border-t border-gray-100 pt-3 flex items-baseline justify-between">
                      <span className="text-gray-400 text-xs">{fr ? 'À partir de' : 'From'}</span>
                      <div className="text-right">
                        <span className="text-green-dark font-black text-lg">{fmt(cat.tarifNuit)}</span>
                        <span className="text-gray-400 text-xs ml-1">FCFA/n</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
