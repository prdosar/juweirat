import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, Users, ArrowLeft, MapPin } from 'lucide-react'
import { getLang } from '@/lib/lang'
import { getRoomById } from '@/lib/api'
import BookingForm from '@/components/BookingForm'

interface Props {
  params:      Promise<{ id: string }>
  searchParams: Promise<{ checkIn?: string; checkOut?: string; adults?: string; children?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const room = await getRoomById(id)
  if (!room) return { title: 'Réservation — Résidence Juweirat' }
  return { title: `Réserver ${room.nameFr} — Résidence Juweirat` }
}

function nightsBetween(a: string, b: string) {
  const diff = new Date(b).getTime() - new Date(a).getTime()
  return Math.max(0, Math.round(diff / 86400000))
}

function calcPrice(room: Awaited<ReturnType<typeof getRoomById>>, nights: number) {
  if (!room || nights <= 0) return { total: 0, savings: 0, rateLabel: '' }
  if (nights >= 28 && room.pricePerMonth) {
    const months    = Math.floor(nights / 28)
    const remaining = nights % 28
    const total     = months * room.pricePerMonth + remaining * room.pricePerNight
    const savings   = nights * room.pricePerNight - total
    return { total, savings, rateLabel: `${months} mois` }
  }
  if (nights >= 7 && room.pricePerWeek) {
    const weeks     = Math.floor(nights / 7)
    const remaining = nights % 7
    const total     = weeks * room.pricePerWeek + remaining * room.pricePerNight
    const savings   = nights * room.pricePerNight - total
    return { total, savings, rateLabel: `${weeks} semaine${weeks > 1 ? 's' : ''}` }
  }
  return { total: nights * room.pricePerNight, savings: 0, rateLabel: `${nights} nuit${nights > 1 ? 's' : ''}` }
}

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA'
}

function formatDate(d: string, lang: 'fr' | 'en') {
  return new Date(d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default async function ReserverPage({ params, searchParams }: Props) {
  const { id }                               = await params
  const { checkIn = '', checkOut = '', adults = '1', children = '0' } = await searchParams
  const [lang, room]                         = await Promise.all([getLang(), getRoomById(id)])

  if (!room) notFound()
  if (!checkIn || !checkOut) {
    return (
      <div className="pt-20 min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-charcoal/40 text-sm font-light mb-6">
            {lang === 'fr' ? 'Aucune date sélectionnée.' : 'No dates selected.'}
          </p>
          <Link href={`/appartements/${id}`} className="text-green text-xs tracking-widest uppercase border border-green px-6 py-3 hover:bg-green hover:text-charcoal transition-colors">
            {lang === 'fr' ? '← Retour à l\'appartement' : '← Back to apartment'}
          </Link>
        </div>
      </div>
    )
  }

  const nights          = nightsBetween(checkIn, checkOut)
  const { total, savings, rateLabel } = calcPrice(room, nights)
  const name            = lang === 'en' ? room.nameEn : room.nameFr
  const cover           = room.images.find(i => i.isCover)?.filePath ?? room.images[0]?.filePath ?? '/images/IMG_5101.jpg'
  const fr              = lang === 'fr'

  return (
    <div className="pt-20 bg-[#FAFAFA] min-h-screen">

      {/* Back */}
      <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-8 pb-4">
        <Link
          href={`/appartements/${id}`}
          className="inline-flex items-center gap-2 text-charcoal/40 hover:text-green text-sm font-light tracking-widest uppercase transition-colors duration-300"
        >
          <ArrowLeft size={14} />
          {fr ? 'Retour à l\'appartement' : 'Back to apartment'}
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

            <BookingForm
              room={room}
              lang={lang}
              checkIn={checkIn}
              checkOut={checkOut}
              adults={parseInt(adults)}
              children={parseInt(children)}
              nights={nights}
              totalFcfa={total}
              savings={savings}
              rateLabel={rateLabel}
            />
          </div>

          {/* ── RIGHT: Booking summary ── */}
          <div className="lg:col-span-2">
            <div className="sticky top-28 space-y-4">

              {/* Room card */}
              <div className="bg-white border border-charcoal/10 overflow-hidden">
                <div className="relative h-44">
                  <Image
                    src={cover}
                    alt={name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                  <div className="absolute inset-0 bg-charcoal/20" />
                  {room.floor === 6 && (
                    <span className="absolute top-3 left-3 text-[10px] tracking-widest uppercase bg-green text-charcoal px-2.5 py-1 font-semibold">
                      Prestige
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="text-charcoal font-display text-xl font-light mb-1">{name}</h2>
                  <p className="text-charcoal/30 text-xs font-light flex items-center gap-1">
                    <MapPin size={11} /> Résidence Juweirat · Lomé, Togo
                  </p>
                </div>
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
                      {formatFCFA(room.pricePerNight)} × {nights} {fr ? (nights > 1 ? 'nuits' : 'nuit') : (nights > 1 ? 'nights' : 'night')}
                    </span>
                    <span className="text-charcoal/70">{formatFCFA(nights * room.pricePerNight)}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green/70 font-light">{fr ? 'Réduction' : 'Discount'} ({rateLabel})</span>
                      <span className="text-green">− {formatFCFA(savings)}</span>
                    </div>
                  )}
                  <div className="h-px bg-charcoal/5 my-1" />
                  <div className="flex justify-between items-baseline">
                    <span className="text-charcoal text-sm font-medium">{fr ? 'Total' : 'Total'}</span>
                    <span className="text-green text-xl font-semibold">{formatFCFA(total)}</span>
                  </div>
                </div>
              </div>

              {/* Help */}
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
