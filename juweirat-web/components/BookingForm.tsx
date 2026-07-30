'use client'
import { useState, useRef } from 'react'
import { CheckCircle, User, Mail, Phone, Globe, CreditCard, Smartphone, Lock, ChevronRight, CalendarDays } from 'lucide-react'
import type { Room } from '@/lib/api'
import type { Lang } from '@/lib/i18n'

interface Props {
  room: Room
  lang: Lang
  checkIn: string
  checkOut: string
  adults: number
  children: number
  nights: number
  totalFcfa: number
  savings: number
  rateLabel: string
}

type PayMethod = 'fedapay' | 'stripe' | null

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA'
}

function formatDate(d: string, lang: Lang) {
  return new Date(d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }
function todayStr()         { return toDateStr(new Date()) }

function nightsBetween(a: string, b: string) {
  if (!a || !b) return 0
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

function calcPrice(room: Room, nights: number) {
  if (nights <= 0) return { total: 0, savings: 0, rateLabel: '' }
  if (nights >= 28 && room.pricePerMonth) {
    const m = Math.floor(nights / 28), r = nights % 28
    const total = m * room.pricePerMonth + r * room.pricePerNight
    return { total, savings: nights * room.pricePerNight - total, rateLabel: `${m} mois` }
  }
  if (nights >= 7 && room.pricePerWeek) {
    const w = Math.floor(nights / 7), r = nights % 7
    const total = w * room.pricePerWeek + r * room.pricePerNight
    return { total, savings: nights * room.pricePerNight - total, rateLabel: `${w} semaine${w > 1 ? 's' : ''}` }
  }
  return { total: nights * room.pricePerNight, savings: 0, rateLabel: `${nights} nuit${nights > 1 ? 's' : ''}` }
}

function openPicker(ref: React.RefObject<HTMLInputElement | null>) {
  try { ref.current?.showPicker() } catch { ref.current?.focus() }
}

export default function BookingForm({ room, lang, checkIn: initCheckIn, checkOut: initCheckOut, adults, children, nights: initNights, totalFcfa: initTotal, savings: initSavings, rateLabel: initRateLabel }: Props) {
  const [step,      setStep]      = useState<1 | 2 | 3>(1)
  const [payMethod, setPayMethod] = useState<PayMethod>(null)
  const [form,      setForm]      = useState({ firstName: '', lastName: '', email: '', phone: '', nationality: '', notes: '' })
  const [agreed,    setAgreed]    = useState(false)

  /* Editable dates — initialized from URL params */
  const [localCheckIn,  setLocalCheckIn]  = useState(initCheckIn)
  const [localCheckOut, setLocalCheckOut] = useState(initCheckOut)
  const checkInRef  = useRef<HTMLInputElement>(null)
  const checkOutRef = useRef<HTMLInputElement>(null)

  const minCheckOut = localCheckIn
    ? toDateStr(new Date(new Date(localCheckIn).getTime() + 86400000))
    : todayStr()

  /* Recalculate price whenever dates change */
  const localNights = nightsBetween(localCheckIn, localCheckOut)
  const pricing     = localNights > 0
    ? calcPrice(room, localNights)
    : { total: initTotal, savings: initSavings, rateLabel: initRateLabel }

  const fr   = lang === 'fr'
  const name = fr ? room.nameFr : room.nameEn

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function handleCheckInChange(val: string) {
    setLocalCheckIn(val)
    if (localCheckOut && localCheckOut <= val) setLocalCheckOut('')
  }

  const step1Valid = form.firstName.trim() && form.lastName.trim() && form.email.includes('@') && form.phone.trim() && localCheckIn && localCheckOut && localNights > 0
  const step2Valid = payMethod !== null

  /* ── Confirmed screen ── */
  if (step === 3) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 border border-green/30 bg-green/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle size={32} className="text-green" />
        </div>
        <h2 className="font-display text-3xl font-light text-charcoal mb-3">
          {fr ? 'Demande envoyée !' : 'Request received!'}
        </h2>
        <p className="text-charcoal/50 font-light max-w-md mb-2">
          {fr
            ? `Votre demande pour ${name} du ${formatDate(localCheckIn, lang)} au ${formatDate(localCheckOut, lang)} a bien été enregistrée.`
            : `Your request for ${name} from ${formatDate(localCheckIn, lang)} to ${formatDate(localCheckOut, lang)} has been recorded.`}
        </p>
        <p className="text-charcoal/30 text-sm font-light max-w-md mb-8">
          {fr
            ? "Notre équipe vous contactera dans les prochaines heures pour confirmer et finaliser le paiement."
            : "Our team will contact you within a few hours to confirm and finalize payment."}
        </p>
        <div className="bg-surface border border-charcoal/10 p-5 text-left w-full max-w-sm space-y-2">
          <p className="text-charcoal/60 text-sm font-light">{form.firstName} {form.lastName}</p>
          <p className="text-charcoal/40 text-xs font-light">{form.email}</p>
          <p className="text-charcoal/40 text-xs font-light">{form.phone}</p>
          <div className="h-px bg-charcoal/5 my-2" />
          <p className="text-charcoal text-sm font-medium">{formatFCFA(pricing.total)}</p>
          <p className="text-charcoal/40 text-xs font-light">{localNights} {fr ? (localNights > 1 ? 'nuits' : 'nuit') : (localNights > 1 ? 'nights' : 'night')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* Progress steps */}
      <div className="flex items-center gap-0">
        {[
          { n: 1, label: fr ? 'Vos informations' : 'Your info' },
          { n: 2, label: fr ? 'Paiement' : 'Payment' },
        ].map(({ n, label }, i) => (
          <div key={n} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 ${step >= n ? 'opacity-100' : 'opacity-30'}`}>
              <span className={`w-7 h-7 flex items-center justify-center text-xs font-semibold border transition-all duration-300 ${
                step > n ? 'bg-green border-green text-charcoal' : step === n ? 'border-green text-green' : 'border-charcoal/20 text-charcoal/40'
              }`}>
                {step > n ? '✓' : n}
              </span>
              <span className="text-xs tracking-widest uppercase font-light hidden sm:block text-charcoal/60">{label}</span>
            </div>
            {i < 1 && <div className={`flex-1 h-px mx-3 transition-colors duration-300 ${step > 1 ? 'bg-green/40' : 'bg-charcoal/10'}`} />}
          </div>
        ))}
      </div>

      {/* ── STEP 1 : Guest info + dates ── */}
      {step === 1 && (
        <div className="space-y-5">
          <h3 className="font-display text-2xl font-light text-charcoal">
            {fr ? 'Vos informations' : 'Your information'}
          </h3>

          {/* Dates (editable) */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-1.5">
                {fr ? 'Arrivée *' : 'Check-in *'}
              </label>
              <div
                className="relative cursor-pointer"
                onClick={() => openPicker(checkInRef)}
              >
                <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-green/60 pointer-events-none z-10" />
                <input
                  ref={checkInRef}
                  type="date"
                  min={todayStr()}
                  value={localCheckIn}
                  onChange={e => handleCheckInChange(e.target.value)}
                  className="w-full bg-surface border border-charcoal/10 text-charcoal text-sm pl-9 pr-3 py-2.5
                             focus:outline-none focus:border-green transition-colors duration-200
                             [color-scheme:light] cursor-pointer font-light"
                />
              </div>
            </div>
            <div>
              <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-1.5">
                {fr ? 'Départ *' : 'Check-out *'}
              </label>
              <div
                className={`relative ${localCheckIn ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                onClick={() => localCheckIn && openPicker(checkOutRef)}
              >
                <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-green/60 pointer-events-none z-10" />
                <input
                  ref={checkOutRef}
                  type="date"
                  min={minCheckOut}
                  value={localCheckOut}
                  onChange={e => setLocalCheckOut(e.target.value)}
                  disabled={!localCheckIn}
                  className="w-full bg-surface border border-charcoal/10 text-charcoal text-sm pl-9 pr-3 py-2.5
                             focus:outline-none focus:border-green transition-colors duration-200
                             [color-scheme:light] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-light"
                />
              </div>
            </div>
          </div>

          {/* Live price recap when dates are set */}
          {localNights > 0 && (
            <div className="bg-green/5 border border-green/20 px-4 py-3 flex items-center justify-between">
              <span className="text-charcoal/50 text-xs font-light">
                {localNights} {fr ? (localNights > 1 ? 'nuits' : 'nuit') : (localNights > 1 ? 'nights' : 'night')}
                {pricing.savings > 0 && <span className="text-green ml-2">({pricing.rateLabel})</span>}
              </span>
              <span className="text-green font-semibold text-sm">{formatFCFA(pricing.total)}</span>
            </div>
          )}

          {/* Name fields */}
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { k: 'firstName', label: fr ? 'Prénom *' : 'First name *', ph: fr ? 'Jean' : 'John',    icon: User },
              { k: 'lastName',  label: fr ? 'Nom *'    : 'Last name *',  ph: fr ? 'Dupont' : 'Doe',  icon: User },
            ].map(({ k, label, ph, icon: Icon }) => (
              <div key={k}>
                <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-1.5">{label}</label>
                <div className="relative">
                  <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/20 pointer-events-none" />
                  <input
                    required
                    value={form[k as keyof typeof form]}
                    onChange={e => set(k, e.target.value)}
                    placeholder={ph}
                    className="w-full bg-surface border border-charcoal/10 text-charcoal pl-9 pr-4 py-2.5 text-sm font-light
                               focus:outline-none focus:border-green transition-colors placeholder:text-charcoal/15"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Email */}
          <div>
            <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-1.5">Email *</label>
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/20 pointer-events-none" />
              <input
                type="email"
                required
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full bg-surface border border-charcoal/10 text-charcoal pl-9 pr-4 py-2.5 text-sm font-light
                           focus:outline-none focus:border-green transition-colors placeholder:text-charcoal/15"
              />
            </div>
          </div>

          {/* Phone + nationality */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-1.5">
                {fr ? 'Téléphone / WhatsApp *' : 'Phone / WhatsApp *'}
              </label>
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/20 pointer-events-none" />
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="+228 90 00 00 00"
                  className="w-full bg-surface border border-charcoal/10 text-charcoal pl-9 pr-4 py-2.5 text-sm font-light
                             focus:outline-none focus:border-green transition-colors placeholder:text-charcoal/15"
                />
              </div>
            </div>
            <div>
              <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-1.5">
                {fr ? 'Nationalité' : 'Nationality'}
              </label>
              <div className="relative">
                <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/20 pointer-events-none" />
                <input
                  value={form.nationality}
                  onChange={e => set('nationality', e.target.value)}
                  placeholder={fr ? 'Ex: Togolaise' : 'E.g. French'}
                  className="w-full bg-surface border border-charcoal/10 text-charcoal pl-9 pr-4 py-2.5 text-sm font-light
                             focus:outline-none focus:border-green transition-colors placeholder:text-charcoal/15"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-1.5">
              {fr ? 'Remarques / Demandes spéciales' : 'Notes / Special requests'}
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder={fr ? "Heure d'arrivée, besoins particuliers…" : "Arrival time, special needs…"}
              className="w-full bg-surface border border-charcoal/10 text-charcoal px-4 py-2.5 text-sm font-light
                         focus:outline-none focus:border-green transition-colors resize-none placeholder:text-charcoal/15"
            />
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!step1Valid}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-green text-charcoal text-xs tracking-widest uppercase font-semibold
                       hover:bg-green-light transition-colors duration-300 disabled:opacity-30 disabled:cursor-not-allowed group"
          >
            {fr ? 'Continuer' : 'Continue'}
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* ── STEP 2 : Payment method ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(1)}
              className="text-charcoal/30 hover:text-charcoal/70 text-xs tracking-widest uppercase font-light transition-colors"
            >
              ← {fr ? 'Retour' : 'Back'}
            </button>
            <h3 className="font-display text-2xl font-light text-charcoal">
              {fr ? 'Mode de paiement' : 'Payment method'}
            </h3>
          </div>

          <p className="text-charcoal/40 text-sm font-light">
            {fr
              ? 'Choisissez votre mode de paiement préféré. Les paiements sont sécurisés et cryptés.'
              : 'Choose your preferred payment method. All payments are secure and encrypted.'}
          </p>

          {/* FedaPay */}
          <button
            onClick={() => setPayMethod('fedapay')}
            className={`w-full flex items-center gap-4 p-5 border transition-all duration-200 text-left ${
              payMethod === 'fedapay' ? 'border-green bg-green/5' : 'border-charcoal/10 hover:border-charcoal/30 bg-surface'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              payMethod === 'fedapay' ? 'border-green' : 'border-charcoal/20'
            }`}>
              {payMethod === 'fedapay' && <span className="w-2.5 h-2.5 rounded-full bg-green" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <Smartphone size={16} className="text-green shrink-0" />
                <span className="text-charcoal text-sm font-medium">Mobile Money (FedaPay)</span>
                <span className="ml-auto text-[10px] bg-green/20 text-green px-2 py-0.5 tracking-widest uppercase font-medium">
                  {fr ? 'Recommandé' : 'Recommended'}
                </span>
              </div>
              <p className="text-charcoal/40 text-xs font-light pl-7">
                Flooz · T-Money · Moov Money — {fr ? 'Paiement instantané depuis votre téléphone' : 'Instant payment from your phone'}
              </p>
            </div>
          </button>

          {/* Stripe */}
          <button
            onClick={() => setPayMethod('stripe')}
            className={`w-full flex items-center gap-4 p-5 border transition-all duration-200 text-left ${
              payMethod === 'stripe' ? 'border-green bg-green/5' : 'border-charcoal/10 hover:border-charcoal/30 bg-surface'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              payMethod === 'stripe' ? 'border-green' : 'border-charcoal/20'
            }`}>
              {payMethod === 'stripe' && <span className="w-2.5 h-2.5 rounded-full bg-green" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <CreditCard size={16} className="text-green shrink-0" />
                <span className="text-charcoal text-sm font-medium">
                  {fr ? 'Carte bancaire (Stripe)' : 'Credit / Debit card (Stripe)'}
                </span>
              </div>
              <p className="text-charcoal/40 text-xs font-light pl-7">Visa · Mastercard · American Express</p>
            </div>
          </button>

          {/* Security notice */}
          <div className="flex items-start gap-3 p-4 bg-charcoal/3 border border-charcoal/5">
            <Lock size={14} className="text-green/60 shrink-0 mt-0.5" />
            <p className="text-charcoal/30 text-xs font-light leading-relaxed">
              {fr
                ? 'Vos données de paiement sont chiffrées et sécurisées. Nous ne stockons jamais vos informations bancaires.'
                : 'Your payment data is encrypted and secure. We never store your banking information.'}
            </p>
          </div>

          {/* Agree */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div
              onClick={() => setAgreed(v => !v)}
              className={`w-4 h-4 border mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                agreed ? 'bg-green border-green' : 'border-charcoal/30 group-hover:border-green/50'
              }`}
            >
              {agreed && <span className="text-charcoal text-[10px] font-bold">✓</span>}
            </div>
            <span className="text-charcoal/40 text-xs font-light leading-relaxed">
              {fr
                ? "J'accepte les conditions de réservation et la politique d'annulation de la Résidence Juweirat."
                : "I accept the booking terms and cancellation policy of Résidence Juweirat."}
            </span>
          </label>

          <button
            onClick={() => setStep(3)}
            disabled={!step2Valid || !agreed}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-green text-charcoal text-xs tracking-widest uppercase font-semibold
                       hover:bg-green-light transition-colors duration-300 disabled:opacity-30 disabled:cursor-not-allowed group"
          >
            <Lock size={13} />
            {fr ? 'Confirmer la réservation' : 'Confirm booking'} — {formatFCFA(pricing.total)}
          </button>

          <p className="text-center text-charcoal/20 text-[10px] font-light">
            {fr
              ? 'Intégration paiement en cours — votre demande sera confirmée par notre équipe.'
              : 'Payment integration in progress — your request will be confirmed by our team.'}
          </p>
        </div>
      )}
    </div>
  )
}
