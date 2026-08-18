'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Users, Baby, ArrowRight, TrendingDown } from 'lucide-react'
import type { Room } from '@/lib/api'
import type { Lang } from '@/lib/i18n'

import { calcStayPrice, nightsBetween, formatFCFA } from '@/lib/pricing'

interface Props {
  room: Room
  lang: Lang
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function today() { return toDateStr(new Date()) }

function openPicker(ref: React.RefObject<HTMLInputElement | null>) {
  try { ref.current?.showPicker() } catch { ref.current?.focus() }
}

export default function BookingWidget({ room, lang }: Props) {
  const router = useRouter()

  const checkInRef  = useRef<HTMLInputElement>(null)
  const checkOutRef = useRef<HTMLInputElement>(null)

  const [checkIn,  setCheckIn]  = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [adults,   setAdults]   = useState(1)
  const [children, setChildren] = useState(0)

  const nights = nightsBetween(checkIn, checkOut)
  const sim    = nights > 0 ? calcStayPrice(room.pricePerNight, room.pricePerWeek, room.pricePerMonth, nights) : null

  const minCheckOut = checkIn
    ? toDateStr(new Date(new Date(checkIn).getTime() + 86400000))
    : today()

  useEffect(() => {
    if (checkIn && checkOut && checkOut <= checkIn) setCheckOut('')
  }, [checkIn, checkOut])

  function handleBook() {
    if (!checkIn || !checkOut || nights === 0) return
    const params = new URLSearchParams({ checkIn, checkOut, adults: String(adults), children: String(children) })
    router.push(`/reserver/${room.id}?${params}`)
  }

  const fr = lang === 'fr'

  return (
    <div className="bg-surface border border-charcoal/10">
      {/* Header */}
      <div className="px-6 py-4 border-b border-charcoal/5">
        <p className="text-green text-xs tracking-widest uppercase font-light">
          {fr ? 'Réserver cet appartement' : 'Book this apartment'}
        </p>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-1.5">
              {fr ? 'Arrivée' : 'Check-in'}
            </label>
            {/* Full-area click → showPicker() */}
            <div
              className="relative cursor-pointer"
              onClick={() => openPicker(checkInRef)}
            >
              <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-green/60 pointer-events-none z-10" />
              <input
                ref={checkInRef}
                type="date"
                min={today()}
                value={checkIn}
                onChange={e => setCheckIn(e.target.value)}
                className="w-full bg-white border border-charcoal/10 text-charcoal text-xs pl-8 pr-3 py-2.5
                           focus:outline-none focus:border-green transition-colors duration-200
                           [color-scheme:light] cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-1.5">
              {fr ? 'Départ' : 'Check-out'}
            </label>
            <div
              className={`relative ${checkIn ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              onClick={() => checkIn && openPicker(checkOutRef)}
            >
              <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-green/60 pointer-events-none z-10" />
              <input
                ref={checkOutRef}
                type="date"
                min={minCheckOut}
                value={checkOut}
                onChange={e => setCheckOut(e.target.value)}
                disabled={!checkIn}
                className="w-full bg-white border border-charcoal/10 text-charcoal text-xs pl-8 pr-3 py-2.5
                           focus:outline-none focus:border-green transition-colors duration-200
                           [color-scheme:light] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Guests */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-1.5">
              {fr ? 'Adultes' : 'Adults'}
            </label>
            <div className="flex items-center border border-charcoal/10 bg-white">
              <button
                onClick={() => setAdults(a => Math.max(1, a - 1))}
                className="px-3 py-2.5 text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors text-sm"
              >−</button>
              <span className="flex-1 text-center text-charcoal text-sm font-light">{adults}</span>
              <button
                onClick={() => setAdults(a => Math.min(room.capacityAdults, a + 1))}
                className="px-3 py-2.5 text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors text-sm"
              >+</button>
            </div>
          </div>
          <div>
            <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-1.5">
              {fr ? 'Enfants' : 'Children'}
            </label>
            <div className="flex items-center border border-charcoal/10 bg-white">
              <button
                onClick={() => setChildren(c => Math.max(0, c - 1))}
                className="px-3 py-2.5 text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors text-sm"
              >−</button>
              <span className="flex-1 text-center text-charcoal text-sm font-light">{children}</span>
              <button
                onClick={() => setChildren(c => Math.min(room.capacityChildren, c + 1))}
                className="px-3 py-2.5 text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors text-sm"
              >+</button>
            </div>
          </div>
        </div>

        {/* Simulation */}
        {sim && (
          <div className="bg-white border border-green/20 p-4 space-y-2">
            <p className="text-green text-[10px] tracking-widest uppercase font-light mb-3">
              {fr ? 'Simulation du coût' : 'Cost estimate'}
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-charcoal/50 font-light">
                {formatFCFA(room.pricePerNight)} × {nights} {fr ? (nights > 1 ? 'nuits' : 'nuit') : (nights > 1 ? 'nights' : 'night')}
              </span>
              <span className="text-charcoal/70">{formatFCFA(sim.originalTotal)}</span>
            </div>
            {sim.savings > 0 && (
              <div className="flex justify-between text-sm items-center">
                <span className="text-green/70 font-light flex items-center gap-1">
                  <TrendingDown size={12} />
                  {fr ? 'Réduction tarif' : 'Rate discount'} ({sim.rateLabel})
                </span>
                <span className="text-green">− {formatFCFA(sim.savings)}</span>
              </div>
            )}
            <div className="h-px bg-charcoal/10 my-2" />
            <div className="flex justify-between items-baseline">
              <span className="text-charcoal text-sm font-medium">{fr ? 'Total estimé' : 'Estimated total'}</span>
              <span className="text-green text-lg font-semibold">{formatFCFA(sim.total)}</span>
            </div>
            <p className="text-charcoal/25 text-[10px] font-light">
              {fr ? '* Estimation — confirmée lors de la réservation' : '* Estimate — confirmed at booking'}
            </p>
          </div>
        )}

        {!checkIn && (
          <p className="text-charcoal/25 text-xs text-center font-light py-1">
            {fr ? 'Sélectionnez vos dates pour voir le prix' : 'Select your dates to see the price'}
          </p>
        )}

        {/* CTA */}
        <button
          onClick={handleBook}
          disabled={!checkIn || !checkOut || nights === 0}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-green text-charcoal text-xs tracking-widest uppercase font-semibold
                     hover:bg-green-light transition-colors duration-300 disabled:opacity-30 disabled:cursor-not-allowed group"
        >
          {fr ? 'Réserver' : 'Book now'}
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  )
}
