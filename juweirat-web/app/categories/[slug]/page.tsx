import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Users, Home, Zap, Camera, ShieldCheck, Sparkles, Coffee } from 'lucide-react'
import { getLang } from '@/lib/lang'
import { getCategoryBySlug, getRooms } from '@/lib/api'
import { getCategoryPhotos } from '@/lib/categoryPhotos'
import CategoryHeroCarousel from '@/components/CategoryHeroCarousel'

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

  // Real photos mapped specifically to this category
  const categoryPhotos = getCategoryPhotos(slug, cat)
  const coverSrc = categoryPhotos.hero
  const galleryImages = categoryPhotos.gallery

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

          {/* LEFT: Info + Photo Gallery */}
          <div className="lg:col-span-3 space-y-8">

            {/* Hero Carousel */}
            <CategoryHeroCarousel
              images={galleryImages}
              name={name}
              pmsType={cat.pmsType}
              gammeLabel={gammeLabel}
            />

            {/* Title + description */}
            <div>
              <p className="text-green text-xs tracking-[0.4em] uppercase font-bold mb-2">Résidence Juweirat · Lomé</p>
              <h1 className="font-display text-4xl font-light text-charcoal mb-4">{name}</h1>
              {desc && <p className="text-charcoal/70 font-light leading-relaxed text-base">{desc}</p>}
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: fr ? 'Type de logement' : 'Unit Type', value: cat.pmsType },
                { label: fr ? 'Gamme de finition' : 'Finish Grade', value: gammeLabel },
                { label: fr ? 'Capacité d\'accueil' : 'Capacity', value: `${cat.capacityAdults} adultes${cat.capacityChildren > 0 ? ` + ${cat.capacityChildren} enfant${cat.capacityChildren > 1 ? 's' : ''}` : ''}` },
                { label: fr ? 'Logements dans l\'immeuble' : 'Units in Residence', value: `${cat.roomCount} appartements` },
                { label: fr ? 'Wifi & Climatisation' : 'Wifi & AC', value: 'Inclus' },
                { label: fr ? 'Service de ménage' : 'Housekeeping', value: 'Régulier' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs">
                  <p className="text-gray-400 text-[10px] tracking-wider uppercase font-bold mb-1">{label}</p>
                  <p className="text-charcoal font-semibold text-sm">{value}</p>
                </div>
              ))}
            </div>

            {/* ── GALERIE PHOTOS DE CETTE CATÉGORIE ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-charcoal flex items-center gap-2">
                  <Camera size={18} className="text-green" />
                  {fr ? 'Galerie Photos du Logement' : 'Apartment Photo Gallery'}
                </h3>
                <span className="text-xs text-gray-400 font-medium">{galleryImages.length} vues HD</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {galleryImages.map((imgSrc, idx) => (
                  <div key={idx} className="relative h-36 sm:h-44 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group">
                    <Image
                      src={imgSrc}
                      alt={`${name} photo ${idx + 1}`}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  </div>
                ))}
              </div>
            </div>

            {/* Tariffs Breakdown */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <p className="text-green text-xs tracking-widest uppercase font-extrabold mb-4">
                {fr ? 'Grille tarifaire dégressive' : 'Discounted Rate Grid'}
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
                  <div>
                    <p className="text-charcoal text-sm font-semibold">
                      {fr ? 'Nuitée standard (< 15 nuits)' : 'Nightly rate (< 15 nights)'}
                    </p>
                    <p className="text-green text-xs flex items-center gap-1 mt-0.5 font-medium">
                      <Zap size={11} /> {fr ? 'Électricité incluse' : 'Electricity included'}
                    </p>
                  </div>
                  <p className="text-green-dark font-black text-xl">{fmt(cat.tarifNuit)} <span className="text-xs font-semibold text-gray-400">FCFA HT/n</span></p>
                </div>
                <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
                  <div>
                    <p className="text-charcoal text-sm font-semibold">
                      {fr ? 'Forfait 15 jours (15–29 nuits)' : '15-day stay (15–29 nights)'}
                    </p>
                    <p className="text-amber-700 text-xs mt-0.5 font-medium">
                      {fr ? 'Électricité hors forfait (230 FCFA/kWh)' : 'Electricity not included (230 FCFA/kWh)'}
                    </p>
                  </div>
                  <p className="text-charcoal font-bold text-base">{fmt(cat.tarifN15)} <span className="text-xs text-gray-400">FCFA HT/n</span></p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-charcoal text-sm font-semibold">
                      {fr ? 'Forfait mensuel (≥ 30 nuits)' : 'Monthly stay (≥ 30 nights)'}
                    </p>
                    <p className="text-amber-700 text-xs mt-0.5 font-medium">
                      {fr ? 'Contrat de bail requis · Électricité au compteur' : 'Lease agreement · Metered electricity'}
                    </p>
                  </div>
                  <p className="text-charcoal font-bold text-base">{fmt(cat.tarifN30)} <span className="text-xs text-gray-400">FCFA HT/n</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Booking CTA */}
          <div className="lg:col-span-2">
            <div className="sticky top-28 space-y-4">
              <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5 shadow-sm">
                <p className="text-gold text-xs tracking-widest uppercase font-extrabold">
                  {fr ? 'Réservation Directe' : 'Direct Booking'}
                </p>
                <div>
                  <p className="text-gray-400 text-xs font-medium mb-1">
                    {fr ? 'À partir de' : 'Starting from'}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-green-dark font-black text-3xl">{fmt(cat.tarifNuit)}</span>
                    <span className="text-gray-400 text-xs font-semibold">FCFA HT / {fr ? 'nuit' : 'night'}</span>
                  </div>
                  <p className="text-gray-400 text-[11px] mt-1 italic">
                    {fr ? 'TVA 18 % ajoutée à la réservation' : '18% VAT added at booking'}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-sm font-medium text-charcoal bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <Users size={15} className="text-green shrink-0" />
                  <span>
                    {cat.capacityAdults} {fr ? 'adultes' : 'adults'}
                    {cat.capacityChildren > 0 && ` · ${cat.capacityChildren} ${fr ? 'enfants' : 'children'}`}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-green" />
                    <span>{fr ? 'Confirmation instantanée' : 'Instant confirmation'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coffee size={14} className="text-gold" />
                    <span>{fr ? 'Option Petit Déjeuner disponible' : 'Breakfast option available'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-blue-600" />
                    <span>{fr ? 'Service hôtelier & conciergerie' : 'Hotel amenities & concierge'}</span>
                  </div>
                </div>

                <Link
                  href={`/reserver/category/${cat.slug}`}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-green text-white text-xs tracking-widest uppercase font-bold rounded-xl shadow-sm
                             hover:bg-green-dark transition-all duration-300 group"
                >
                  {fr ? 'Réserver maintenant' : 'Book now'}
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-4 text-center text-xs text-gray-500 space-y-1 shadow-2xs">
                <p className="font-semibold text-charcoal">{fr ? 'Besoin d\'assistance ?' : 'Need assistance?'}</p>
                <p>{fr ? 'Contactez-nous sur WhatsApp au' : 'Contact us on WhatsApp at'}</p>
                <a href="https://wa.me/22870790889" target="_blank" rel="noopener noreferrer" className="font-bold text-green hover:underline inline-block mt-0.5">
                  +228 70 79 08 89
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
