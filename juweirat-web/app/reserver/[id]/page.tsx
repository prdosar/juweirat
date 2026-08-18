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
  if (nights >= 30 && room.pricePerMonth) {
    const total   = room.pricePerMonth * nights
    const savings = nights * room.pricePerNight - total
    return { total, savings, rateLabel: 'forfait mensuel' }
  }
  if (nights >= 15 && room.pricePerWeek) {
    const total   = room.pricePerWeek * nights
    const savings = nights * room.pricePerNight - total
    return { total, savings, rateLabel: 'forfait 15 jours' }
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

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }

export default async function ReserverPage({ params, searchParams }: Props) {
  const { id }                                                        = await params
  const { checkIn: queryCheckIn = '', checkOut: queryCheckOut = '', adults = '1', children = '0' } = await searchParams
  const [lang, room]                                                  = await Promise.all([getLang(), getRoomById(id)])

  if (!room) notFound()

  const today = toDateStr(new Date())
  const tomorrow = toDateStr(new Date(Date.now() + 86400000))
  const checkIn = queryCheckIn && queryCheckIn >= today ? queryCheckIn : today
  const checkOut = queryCheckOut && queryCheckOut > checkIn ? queryCheckOut : (queryCheckIn ? toDateStr(new Date(new Date(checkIn).getTime() + 86400000)) : tomorrow)

  const fr = lang === 'fr'

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
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-light text-charcoal">
            {fr ? 'Finaliser votre ' : 'Complete your '}
            <span className="italic text-green">{fr ? 'réservation' : 'booking'}</span>
          </h1>
        </div>

        <BookingForm
          room={room}
          lang={lang}
          checkIn={checkIn}
          checkOut={checkOut}
          adults={parseInt(adults) || 1}
          children={parseInt(children) || 0}
        />
      </div>
    </div>
  )
}
