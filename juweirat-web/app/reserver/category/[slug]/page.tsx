import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, Users, ArrowLeft } from 'lucide-react'
import { getLang } from '@/lib/lang'
import { getCategoryBySlug } from '@/lib/api'
import CategoryBookingForm from '@/components/CategoryBookingForm'

interface Props {
  params:      Promise<{ slug: string }>
  searchParams: Promise<{ checkIn?: string; checkOut?: string; adults?: string; children?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const cat = await getCategoryBySlug(slug)
  if (!cat) return { title: 'Réservation — Résidence Juweirat' }
  return { title: `Réserver ${cat.nameFr} — Résidence Juweirat` }
}

function nightsBetween(a: string, b: string) {
  const diff = new Date(b).getTime() - new Date(a).getTime()
  return Math.max(0, Math.round(diff / 86400000))
}

function calcPrice(tarifNuit: number, tarifN15: number, tarifN30: number, nights: number) {
  if (nights <= 0) return { total: 0, savings: 0, rateLabel: '' }
  if (nights >= 30) {
    const total = tarifN30 * nights
    return { total, savings: nights * tarifNuit - total, rateLabel: 'forfait mensuel' }
  }
  if (nights >= 15) {
    const total = tarifN15 * nights
    return { total, savings: nights * tarifNuit - total, rateLabel: 'forfait 15 jours' }
  }
  return { total: nights * tarifNuit, savings: 0, rateLabel: `${nights} nuit${nights > 1 ? 's' : ''}` }
}

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA'
}

function formatDate(d: string, lang: 'fr' | 'en') {
  return new Date(d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default async function CategoryBookingPage({ params, searchParams }: Props) {
  const { slug }                                                               = await params
  const { checkIn = '', checkOut = '', adults = '1', children = '0' }         = await searchParams
  const [lang, cat]                                                            = await Promise.all([getLang(), getCategoryBySlug(slug)])

  if (!cat) notFound()

  const fr = lang === 'fr'

  if (!checkIn || !checkOut) {
    return (
      <div className="pt-20 min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-charcoal/40 text-sm font-light mb-6">
            {fr ? 'Aucune date sélectionnée.' : 'No dates selected.'}
          </p>
          <Link href={`/categories/${slug}`} className="text-green text-xs tracking-widest uppercase border border-green px-6 py-3 hover:bg-green hover:text-charcoal transition-colors">
            {fr ? '← Retour à la catégorie' : '← Back to category'}
          </Link>
        </div>
      </div>
    )
  }

  const nights                               = nightsBetween(checkIn, checkOut)
  const { total, savings, rateLabel }        = calcPrice(cat.tarifNuit, cat.tarifN15, cat.tarifN30, nights)
  const name                                 = fr ? cat.nameFr : cat.nameEn

  return (
    <div className="pt-20 bg-[#FAFAFA] min-h-screen">

      {/* Back */}
      <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-8 pb-4">
        <Link
          href={`/categories/${slug}`}
          className="inline-flex items-center gap-2 text-charcoal/40 hover:text-green text-sm font-light tracking-widest uppercase transition-colors duration-300"
        >
          <ArrowLeft size={14} />
          {fr ? 'Retour à la catégorie' : 'Back to category'}
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-10 pb-24">
        <div className="grid lg:grid-cols-5 gap-10">

          {/* ── LEFT: Booking form ── */}
          <div className="lg:col-span-3">
            <h1 className="font-display text-3xl md:text-4xl font-light text-charcoal mb-8">
              {fr ? 'Finaliser votre ' : 'Complete your '}
              <span className="italic text-green">{fr ? 'réservation' : 'booking'}</span>
            </h1>

            <CategoryBookingForm
              categoryId={cat.id}
              categorySlug={slug}
              lang={lang}
              checkIn={checkIn}
              checkOut={checkOut}
              adults={parseInt(adults)}
              children={parseInt(children)}
              nights={nights}
              totalFcfa={total}
              savings={savings}
              rateLabel={rateLabel}
              tarifNuit={cat.tarifNuit}
              tarifN15={cat.tarifN15}
              tarifN30={cat.tarifN30}
            />
          </div>

          {/* ── RIGHT: Summary ── */}
          <div className="lg:col-span-2">
            <div className="sticky top-28 space-y-4">

              {/* Category card */}
              <div className="bg-white border border-charcoal/10 p-5 space-y-3">
                <p className="text-green text-[10px] tracking-widest uppercase font-light">
                  {fr ? 'Votre catégorie' : 'Your category'}
                </p>
                <div>
                  <h2 className="text-charcoal font-display text-xl font-light">{name}</h2>
                  <p className="text-charcoal/30 text-xs font-light mt-1">
                    {cat.pmsType} · {cat.pmsGamme} · Résidence Juweirat, Lomé
                  </p>
                </div>
                <p className="text-charcoal/40 text-xs font-light">
                  {fr
                    ? 'Une unité disponible vous sera assignée à votre arrivée.'
                    : 'An available unit will be assigned to you at check-in.'}
                </p>
              </div>

              {/* Stay details */}
              <div className="bg-white border border-charcoal/10 p-5 space-y-4">
                <p className="text-green text-[10px] tracking-widest uppercase font-light">
                  {fr ? 'Détails du séjour' : 'Stay details'}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface p-3 space-y-1">
                    <p className="text-charcoal/30 text-[10px] tracking-widest uppercase font-light flex items-center gap-1">
                      <CalendarDays size={10} /> {fr ? 'Arrivée' : 'Check-in'}
                    </p>
                    <p className="text-charcoal text-xs font-light">{formatDate(checkIn, lang)}</p>
                  </div>
                  <div className="bg-surface p-3 space-y-1">
                    <p className="text-charcoal/30 text-[10px] tracking-widest uppercase font-light flex items-center gap-1">
                      <CalendarDays size={10} /> {fr ? 'Départ' : 'Check-out'}
                    </p>
                    <p className="text-charcoal text-xs font-light">{formatDate(checkOut, lang)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm font-light text-charcoal/60">
                  <Users size={13} className="text-green/60" />
                  {adults} {fr ? 'adulte' : 'adult'}{parseInt(adults) > 1 ? 's' : ''}
                  {parseInt(children) > 0 && ` · ${children} ${fr ? 'enfant' : 'child'}${parseInt(children) > 1 ? (fr ? 's' : 'ren') : ''}`}
                </div>

                <div className="h-px bg-charcoal/5" />

                {/* Price breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-charcoal/50 font-light">
                      {formatFCFA(cat.tarifNuit)} × {nights} {fr ? (nights > 1 ? 'nuits' : 'nuit') : (nights > 1 ? 'nights' : 'night')}
                    </span>
                    <span className="text-charcoal/70">{formatFCFA(nights * cat.tarifNuit)}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green/70 font-light">{fr ? 'Réduction' : 'Discount'} ({rateLabel})</span>
                      <span className="text-green">− {formatFCFA(savings)}</span>
                    </div>
                  )}
                  <div className="h-px bg-charcoal/5 my-1" />
                  <div className="flex justify-between items-baseline">
                    <span className="text-charcoal text-sm font-medium">Total</span>
                    <span className="text-green text-xl font-semibold">{formatFCFA(total)}</span>
                  </div>
                </div>
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
