import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Users, Home, Zap } from 'lucide-react'
import { getLang } from '@/lib/lang'
import { getCategoryBySlug, getRooms } from '@/lib/api'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const cat = await getCategoryBySlug(slug)
  if (!cat) return { title: 'Catégorie — Résidence Juweirat' }
  return { title: `${cat.nameFr} — Résidence Juweirat Lomé` }
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}

const GAMME_LABELS: Record<string, Record<string, string>> = {
  fr: { standard: 'Standard', supérieure: 'Supérieure', privilège: 'Privilège', suite: 'Suite' },
  en: { standard: 'Standard', supérieure: 'Superior',   privilège: 'Privilege',  suite: 'Suite' },
}

export default async function CategoryPage({ params }: Props) {
  const { slug }         = await params
  const [lang, cat, rooms] = await Promise.all([getLang(), getCategoryBySlug(slug), getRooms()])

  if (!cat) notFound()

  const fr = lang === 'fr'
  const name = fr ? cat.nameFr : cat.nameEn
  const desc = fr ? cat.descriptionFr : cat.descriptionEn
  const gammeLabel = GAMME_LABELS[lang]?.[cat.pmsGamme] ?? cat.pmsGamme

  // Rooms in this category — pick their cover images
  const categoryRooms = rooms.filter(r => r.categorySlug === slug)
  const sampleImages  = categoryRooms
    .flatMap(r => r.images)
    .filter(i => i.isCover || i.sortOrder === 0)
    .slice(0, 3)

  const coverSrc = sampleImages[0]?.filePath ?? '/images/IMG_5101.jpg'

  return (
    <div className="pt-20 bg-[#FAFAFA] min-h-screen">

      {/* Back */}
      <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-8 pb-4">
        <Link
          href="/appartements"
          className="inline-flex items-center gap-2 text-charcoal/40 hover:text-green text-sm font-light tracking-widest uppercase transition-colors duration-300"
        >
          <ArrowLeft size={14} />
          {fr ? 'Toutes les catégories' : 'All categories'}
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-10 pb-24">
        <div className="grid lg:grid-cols-5 gap-10">

          {/* LEFT: Info */}
          <div className="lg:col-span-3 space-y-8">

            {/* Hero */}
            <div className="relative h-72 overflow-hidden bg-charcoal/5">
              <Image
                src={coverSrc}
                alt={name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 60vw"
                priority
              />
              <div className="absolute inset-0 bg-charcoal/25" />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="text-[10px] tracking-widest uppercase bg-charcoal/60 text-white px-2.5 py-1 font-medium backdrop-blur-sm">
                  {cat.pmsType}
                </span>
                <span className="text-[10px] tracking-widest uppercase bg-green/90 text-charcoal px-2.5 py-1 font-semibold">
                  {gammeLabel}
                </span>
              </div>
            </div>

            {/* Title + description */}
            <div>
              <p className="text-green text-xs tracking-[0.4em] uppercase font-light mb-2">Résidence Juweirat</p>
              <h1 className="font-display text-4xl font-light text-charcoal mb-4">{name}</h1>
              {desc && <p className="text-charcoal/60 font-light leading-relaxed">{desc}</p>}
            </div>

            {/* Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: fr ? 'Type' : 'Type', value: cat.pmsType },
                { label: fr ? 'Gamme' : 'Grade', value: gammeLabel },
                { label: fr ? 'Capacité' : 'Capacity', value: `${cat.capacityAdults} adultes${cat.capacityChildren > 0 ? ` + ${cat.capacityChildren} enfant${cat.capacityChildren > 1 ? 's' : ''}` : ''}` },
                { label: fr ? 'Unités disponibles' : 'Available units', value: String(cat.roomCount) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-charcoal/8 p-4">
                  <p className="text-charcoal/30 text-[10px] tracking-widest uppercase font-light mb-1">{label}</p>
                  <p className="text-charcoal font-light text-sm">{value}</p>
                </div>
              ))}
            </div>

            {/* Tariffs */}
            <div className="bg-white border border-charcoal/8 p-6">
              <p className="text-green text-[10px] tracking-widest uppercase font-light mb-4">
                {fr ? 'Grille tarifaire' : 'Rate grid'}
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-charcoal/5">
                  <div>
                    <p className="text-charcoal text-sm font-light">
                      {fr ? 'Nuitée (< 15 nuits)' : 'Nightly (< 15 nights)'}
                    </p>
                    <p className="text-charcoal/30 text-xs font-light flex items-center gap-1 mt-0.5">
                      <Zap size={10} className="text-green" />
                      {fr ? 'Électricité incluse' : 'Electricity included'}
                    </p>
                  </div>
                  <p className="text-green font-semibold text-lg">{fmt(cat.tarifNuit)} <span className="text-xs font-light text-charcoal/40">FCFA</span></p>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-charcoal/5">
                  <div>
                    <p className="text-charcoal text-sm font-light">
                      {fr ? 'Forfait 15 jours (15–29 nuits)' : '15-day rate (15–29 nights)'}
                    </p>
                    <p className="text-charcoal/30 text-xs font-light mt-0.5">
                      {fr ? 'Électricité hors forfait (230 FCFA/kWh)' : 'Electricity not included (230 FCFA/kWh)'}
                    </p>
                  </div>
                  <p className="text-charcoal font-medium text-sm">{fmt(cat.tarifN15)} <span className="text-xs font-light text-charcoal/40">FCFA/nuit</span></p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-charcoal text-sm font-light">
                      {fr ? 'Forfait mensuel (≥ 30 nuits)' : 'Monthly rate (≥ 30 nights)'}
                    </p>
                    <p className="text-charcoal/30 text-xs font-light mt-0.5">
                      {fr ? 'Électricité hors forfait (230 FCFA/kWh)' : 'Electricity not included (230 FCFA/kWh)'}
                    </p>
                  </div>
                  <p className="text-charcoal font-medium text-sm">{fmt(cat.tarifN30)} <span className="text-xs font-light text-charcoal/40">FCFA/nuit</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Booking CTA */}
          <div className="lg:col-span-2">
            <div className="sticky top-28 space-y-4">
              <div className="bg-white border border-charcoal/10 p-6 space-y-5">
                <p className="text-green text-[10px] tracking-widest uppercase font-light">
                  {fr ? 'Réserver cette catégorie' : 'Book this category'}
                </p>
                <div>
                  <p className="text-charcoal/40 text-xs font-light mb-1">
                    {fr ? 'À partir de' : 'Starting from'}
                  </p>
                  <p className="text-green font-semibold text-3xl">{fmt(cat.tarifNuit)}</p>
                  <p className="text-charcoal/30 text-xs font-light">FCFA / {fr ? 'nuit' : 'night'}</p>
                </div>

                <div className="flex items-center gap-3 text-sm font-light text-charcoal/60 bg-charcoal/3 p-3">
                  <Users size={14} className="text-green/60 shrink-0" />
                  <span>
                    {cat.capacityAdults} {fr ? 'adultes max' : 'adults max'}
                    {cat.capacityChildren > 0 && ` · ${cat.capacityChildren} ${fr ? 'enfants' : 'children'}`}
                  </span>
                </div>

                <p className="text-charcoal/40 text-xs font-light leading-relaxed">
                  {fr
                    ? 'Une unité disponible vous sera automatiquement assignée à votre arrivée.'
                    : 'An available unit will be automatically assigned to you at check-in.'}
                </p>

                <Link
                  href={`/reserver/category/${cat.slug}`}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-green text-charcoal text-xs tracking-widest uppercase font-semibold
                             hover:bg-green-light transition-colors duration-300 group"
                >
                  {fr ? 'Réserver' : 'Book now'}
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <p className="text-charcoal/25 text-xs font-light text-center leading-relaxed">
                {fr
                  ? 'Des questions ? Contactez-nous sur WhatsApp au +228 90 00 00 00'
                  : 'Questions? Contact us on WhatsApp at +228 90 00 00 00'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
