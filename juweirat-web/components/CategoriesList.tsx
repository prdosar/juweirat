'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Users, Home } from 'lucide-react'
import type { RoomCategory } from '@/lib/api'
import type { Lang } from '@/lib/i18n'

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
    standard:   'bg-charcoal/5 text-charcoal/60',
    supérieure: 'bg-green/10 text-green-dark',
    privilège:  'bg-amber-50 text-amber-700',
    suite:      'bg-green/20 text-green',
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setFilterGamme(''); setFilterType(''); }}
            className={`text-xs tracking-widest uppercase font-light px-4 py-2 border transition-colors ${
              !filterGamme && !filterType
                ? 'border-green text-green bg-green/5'
                : 'border-charcoal/10 text-charcoal/40 hover:border-charcoal/30'
            }`}
          >
            {fr ? 'Tous' : 'All'}
          </button>
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilterType(prev => prev === t ? '' : t)}
              className={`text-xs tracking-widest uppercase font-light px-4 py-2 border transition-colors ${
                filterType === t
                  ? 'border-green text-green bg-green/5'
                  : 'border-charcoal/10 text-charcoal/40 hover:border-charcoal/30'
              }`}
            >
              {t}
            </button>
          ))}
          <div className="w-px bg-charcoal/10 mx-1" />
          {gammes.map(g => (
            <button
              key={g}
              onClick={() => setFilterGamme(prev => prev === g ? '' : g)}
              className={`text-xs tracking-widest uppercase font-light px-4 py-2 border transition-colors ${
                filterGamme === g
                  ? 'border-green text-green bg-green/5'
                  : 'border-charcoal/10 text-charcoal/40 hover:border-charcoal/30'
              }`}
            >
              {GAMME_LABELS[lang]?.[g] ?? g}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-charcoal/40 text-sm font-light text-center py-16">
          {fr ? 'Aucune catégorie trouvée.' : 'No categories found.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-charcoal/5">
          {filtered.map(cat => {
            const name = fr ? cat.nameFr : cat.nameEn
            const desc = fr ? cat.descriptionFr : cat.descriptionEn
            const gammeLabel = GAMME_LABELS[lang]?.[cat.pmsGamme] ?? cat.pmsGamme
            const typeLabel  = TYPE_LABELS[lang]?.[cat.pmsType] ?? cat.pmsType

            return (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group bg-white block hover:shadow-sm transition-shadow duration-300"
              >
                {/* Header band */}
                <div className="bg-charcoal/3 border-b border-charcoal/5 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-charcoal/50">{cat.pmsType}</span>
                    <span className={`text-[10px] tracking-widest uppercase px-2 py-0.5 font-medium ${gammeColors[cat.pmsGamme] ?? 'bg-charcoal/5 text-charcoal/50'}`}>
                      {gammeLabel}
                    </span>
                  </div>
                  <span className="text-[10px] text-charcoal/30 font-light">
                    {cat.roomCount} {fr ? 'unité' : 'unit'}{cat.roomCount > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-display text-xl font-light text-charcoal group-hover:text-green transition-colors duration-300 leading-snug">
                      {name}
                    </h3>
                    <ArrowRight size={14} className="text-green/40 group-hover:text-green group-hover:translate-x-1 transition-all duration-300 mt-1.5 shrink-0 ml-2" />
                  </div>
                  <p className="text-charcoal/30 text-xs font-light mb-3">{typeLabel}</p>

                  {desc && (
                    <p className="text-charcoal/50 text-sm font-light leading-relaxed mb-4 line-clamp-2">{desc}</p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-charcoal/40 font-light mb-4">
                    <span className="flex items-center gap-1">
                      <Users size={11} className="text-green/60" />
                      {cat.capacityAdults} {fr ? 'adultes' : 'adults'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Home size={11} className="text-green/60" />
                      {cat.pmsType}
                    </span>
                  </div>

                  {/* Tariff grid */}
                  <div className="border-t border-charcoal/5 pt-4 space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-charcoal/30 text-xs font-light">{fr ? 'Nuitée' : 'Nightly'}</span>
                      <span className="text-green font-medium text-sm">{fmt(cat.tarifNuit)} FCFA</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-charcoal/30 text-xs font-light">{fr ? '15 jours (hors élec)' : '15 days (excl. elec)'}</span>
                      <span className="text-charcoal/60 text-xs">{fmt(cat.tarifN15)} FCFA/nuit</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-charcoal/30 text-xs font-light">{fr ? 'Mensuel (hors élec)' : 'Monthly (excl. elec)'}</span>
                      <span className="text-charcoal/60 text-xs">{fmt(cat.tarifN30)} FCFA/nuit</span>
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
