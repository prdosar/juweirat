'use client'
import { useState, useRef, useMemo } from 'react'
import { CheckCircle, User, Mail, Phone, Globe, CreditCard, Smartphone, Lock, ChevronRight, CalendarDays, Users, ScrollText, ArrowLeft } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

interface Props {
  categoryId:   number
  categorySlug: string
  categoryName: string
  pmsType:      string
  pmsGamme:     string
  lang:         Lang
  checkIn:      string
  checkOut:     string
  adults:       number
  children:     number
  tarifNuit:    number
  tarifN15:     number
  tarifN30:     number
}

type PayMethod = 'fedapay' | 'stripe' | null

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA'
}

function formatDate(d: string, lang: Lang) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }
function todayStr()         { return toDateStr(new Date()) }
function addDays(dStr: string, n: number) {
  const d = new Date(dStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

function nightsBetween(a: string, b: string) {
  if (!a || !b) return 0
  const d1 = new Date(a + 'T00:00:00').getTime()
  const d2 = new Date(b + 'T00:00:00').getTime()
  return Math.max(0, Math.round((d2 - d1) / 86400000))
}

function calcPrice(tarifNuit: number, tarifN15: number, tarifN30: number, nights: number) {
  if (nights <= 0) return { total: 0, savings: 0, rateLabel: '', perNight: tarifNuit }
  if (nights >= 30 && tarifN30 > 0) {
    const total = tarifN30 * nights
    return { total, savings: nights * tarifNuit - total, rateLabel: 'forfait mensuel', perNight: tarifN30 }
  }
  if (nights >= 15 && tarifN15 > 0) {
    const total = tarifN15 * nights
    return { total, savings: nights * tarifNuit - total, rateLabel: 'forfait 15 jours', perNight: tarifN15 }
  }
  return { total: nights * tarifNuit, savings: 0, rateLabel: `${nights} nuit${nights > 1 ? 's' : ''}`, perNight: tarifNuit }
}

function openPicker(ref: React.RefObject<HTMLInputElement | null>) {
  try { ref.current?.showPicker() } catch { ref.current?.focus() }
}

export default function CategoryBookingForm({
  categoryId, categorySlug, categoryName, pmsType, pmsGamme,
  lang, checkIn: initCheckIn, checkOut: initCheckOut, adults, children,
  tarifNuit, tarifN15, tarifN30,
}: Props) {
  const [step,       setStep]       = useState<1 | 2 | 3>(1)
  const [payMethod,  setPayMethod]  = useState<PayMethod>(null)
  const [form,       setForm]       = useState({ firstName: '', lastName: '', email: '', phone: '', nationality: '', notes: '' })
  const [agreed,     setAgreed]     = useState(false)
  const [submitting, setSubmitting] = useState(false)

  /* Ensure initial checkIn is at least today */
  const today = todayStr()
  const validInitCheckIn = initCheckIn && initCheckIn >= today ? initCheckIn : today
  const validInitCheckOut = initCheckOut && initCheckOut > validInitCheckIn ? initCheckOut : addDays(validInitCheckIn, 1)

  const [localCheckIn,  setLocalCheckIn]  = useState(validInitCheckIn)
  const [localCheckOut, setLocalCheckOut] = useState(validInitCheckOut)
  const checkInRef  = useRef<HTMLInputElement>(null)
  const checkOutRef = useRef<HTMLInputElement>(null)

  const minCheckOut = localCheckIn
    ? addDays(localCheckIn, 1)
    : addDays(today, 1)

  const localNights = useMemo(() => nightsBetween(localCheckIn, localCheckOut), [localCheckIn, localCheckOut])
  const pricing     = useMemo(() => calcPrice(tarifNuit, tarifN15, tarifN30, localNights), [tarifNuit, tarifN15, tarifN30, localNights])

  const fr = lang === 'fr'

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function handleCheckInChange(val: string) {
    setLocalCheckIn(val)
    if (!localCheckOut || localCheckOut <= val) {
      setLocalCheckOut(addDays(val, 1))
    }
  }

  function handleCheckOutChange(val: string) {
    setLocalCheckOut(val)
  }

  const step1Valid = Boolean(
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.includes('@') &&
    form.phone.trim() &&
    localCheckIn &&
    localCheckOut &&
    localNights > 0
  )
  const step2Valid = payMethod !== null

  if (step === 3) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 border border-green/30 bg-green/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle size={32} className="text-green" />
        </div>
        <h2 className="font-display text-3xl font-light text-charcoal mb-3">
          {fr ? 'Demande envoyée avec succès !' : 'Request successfully sent!'}
        </h2>
        <p className="text-charcoal/60 font-light max-w-md mb-2">
          {fr
            ? `Votre demande pour ${categoryName} du ${formatDate(localCheckIn, lang)} au ${formatDate(localCheckOut, lang)} a bien été enregistrée.`
            : `Your request for ${categoryName} from ${formatDate(localCheckIn, lang)} to ${formatDate(localCheckOut, lang)} has been recorded.`}
        </p>
        <p className="text-charcoal/40 text-sm font-light max-w-md mb-8">
          {fr
            ? "Notre équipe vous contactera dans les prochaines heures pour confirmer et vous assigner une unité disponible."
            : "Our team will contact you shortly to confirm and assign you an available unit."}
        </p>
        <div className="bg-white border border-charcoal/10 p-6 text-left w-full max-w-md space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
            <span className="text-charcoal font-semibold text-sm">{categoryName}</span>
            <span className="text-green text-xs font-semibold uppercase tracking-wider">
              {fr ? 'En attente' : 'Pending'}
            </span>
          </div>
          <p className="text-charcoal/70 text-sm font-light">{form.firstName} {form.lastName}</p>
          <p className="text-charcoal/50 text-xs font-light">{form.email} · {form.phone}</p>
          <div className="bg-surface p-3 space-y-1 text-xs text-charcoal/60 font-light">
            <div className="flex justify-between">
              <span>{fr ? 'Dates :' : 'Dates:'}</span>
              <span className="font-medium text-charcoal">{formatDate(localCheckIn, lang)} → {formatDate(localCheckOut, lang)}</span>
            </div>
            <div className="flex justify-between">
              <span>{fr ? 'Durée :' : 'Duration:'}</span>
              <span className="font-medium text-charcoal">{localNights} {fr ? (localNights > 1 ? 'nuits' : 'nuit') : (localNights > 1 ? 'nights' : 'night')}</span>
            </div>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-charcoal/10">
            <span className="text-charcoal text-sm font-medium">{fr ? 'Montant total :' : 'Total amount:'}</span>
            <span className="text-green font-bold text-base">{formatFCFA(pricing.total)}</span>
          </div>
        </div>

        {localNights >= 30 && (
          <div className="w-full max-w-md border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 mt-4 text-left">
            <ScrollText size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 text-xs font-semibold tracking-wide uppercase mb-1">
                {fr ? 'Contrat de bail requis' : 'Lease contract required'}
              </p>
              <p className="text-amber-700 text-xs font-light leading-relaxed">
                {fr
                  ? 'Votre séjour étant de 30 nuits ou plus, un contrat de bail à usage d\'habitation est obligatoire. Notre équipe vous le fera signer avant votre arrivée.'
                  : 'Your stay being 30 nights or more, a residential lease agreement is required. Our team will have you sign it before check-in.'}
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-5 gap-10">

      {/* ── LEFT COLUMN : Booking Stepper & Form ── */}
      <div className="lg:col-span-3 space-y-8">

        {/* Progress steps (Clickable to return to step 1) */}
        <div className="flex items-center gap-0">
          {[
            { n: 1, label: fr ? 'Vos informations' : 'Your info' },
            { n: 2, label: fr ? 'Paiement' : 'Payment' },
          ].map(({ n, label }, i) => (
            <div key={n} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => { if (n === 1 && step === 2) setStep(1) }}
                className={`flex items-center gap-2 text-left transition-all ${
                  step >= n ? 'opacity-100' : 'opacity-30'
                } ${n === 1 && step === 2 ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
              >
                <span className={`w-7 h-7 flex items-center justify-center text-xs font-semibold border transition-all duration-300 ${
                  step > n ? 'bg-green border-green text-charcoal' : step === n ? 'border-green text-green' : 'border-charcoal/20 text-charcoal/40'
                }`}>
                  {step > n ? '✓' : n}
                </span>
                <span className="text-xs tracking-widest uppercase font-light hidden sm:block text-charcoal/70">{label}</span>
              </button>
              {i < 1 && <div className={`flex-1 h-px mx-3 transition-colors duration-300 ${step > 1 ? 'bg-green/40' : 'bg-charcoal/10'}`} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="font-display text-2xl font-light text-charcoal">
              {fr ? 'Vos informations & dates' : 'Your information & dates'}
            </h3>

            {/* Dates */}
            <div className="bg-white p-5 border border-charcoal/10 space-y-3">
              <p className="text-green text-[10px] tracking-widest uppercase font-semibold">
                {fr ? 'Période du séjour' : 'Stay period'}
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-1.5">
                    {fr ? 'Arrivée *' : 'Check-in *'}
                  </label>
                  <div className="relative cursor-pointer" onClick={() => openPicker(checkInRef)}>
                    <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green pointer-events-none z-10" />
                    <input
                      ref={checkInRef}
                      type="date"
                      min={today}
                      value={localCheckIn}
                      onChange={e => handleCheckInChange(e.target.value)}
                      className="w-full bg-surface border border-charcoal/10 text-charcoal text-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-green transition-colors duration-200 [color-scheme:light] cursor-pointer font-light"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-1.5">
                    {fr ? 'Départ *' : 'Check-out *'}
                  </label>
                  <div className="relative cursor-pointer" onClick={() => openPicker(checkOutRef)}>
                    <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green pointer-events-none z-10" />
                    <input
                      ref={checkOutRef}
                      type="date"
                      min={minCheckOut}
                      value={localCheckOut}
                      onChange={e => handleCheckOutChange(e.target.value)}
                      className="w-full bg-surface border border-charcoal/10 text-charcoal text-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-green transition-colors duration-200 [color-scheme:light] cursor-pointer font-light"
                    />
                  </div>
                </div>
              </div>

              {localNights > 0 ? (
                <div className="bg-green/10 border border-green/30 px-4 py-2.5 flex items-center justify-between mt-2">
                  <span className="text-charcoal/70 text-xs font-light">
                    {localNights} {fr ? (localNights > 1 ? 'nuits sélectionnées' : 'nuit sélectionnée') : (localNights > 1 ? 'nights selected' : 'night selected')}
                    {pricing.savings > 0 && <span className="text-green font-semibold ml-1.5">({pricing.rateLabel})</span>}
                  </span>
                  <span className="text-green font-bold text-sm">{formatFCFA(pricing.total)}</span>
                </div>
              ) : (
                <p className="text-amber-700 text-xs bg-amber-50 p-2 border border-amber-200">
                  {fr ? 'Veuillez sélectionner au moins 1 nuitée.' : 'Please select at least 1 night.'}
                </p>
              )}
            </div>

            {/* Name fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { k: 'firstName', label: fr ? 'Prénom *' : 'First name *', ph: fr ? 'Jean' : 'John', icon: User },
                { k: 'lastName',  label: fr ? 'Nom *'    : 'Last name *',  ph: fr ? 'Dupont' : 'Doe', icon: User },
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
                      className="w-full bg-surface border border-charcoal/10 text-charcoal pl-9 pr-4 py-2.5 text-sm font-light focus:outline-none focus:border-green transition-colors placeholder:text-charcoal/20"
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
                  className="w-full bg-surface border border-charcoal/10 text-charcoal pl-9 pr-4 py-2.5 text-sm font-light focus:outline-none focus:border-green transition-colors placeholder:text-charcoal/20"
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
                    className="w-full bg-surface border border-charcoal/10 text-charcoal pl-9 pr-4 py-2.5 text-sm font-light focus:outline-none focus:border-green transition-colors placeholder:text-charcoal/20"
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
                    className="w-full bg-surface border border-charcoal/10 text-charcoal pl-9 pr-4 py-2.5 text-sm font-light focus:outline-none focus:border-green transition-colors placeholder:text-charcoal/20"
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
                placeholder={fr ? "Heure d'arrivée prévue, besoins particuliers…" : "Estimated arrival time, special requests…"}
                className="w-full bg-surface border border-charcoal/10 text-charcoal px-4 py-2.5 text-sm font-light focus:outline-none focus:border-green transition-colors resize-none placeholder:text-charcoal/20"
              />
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-green text-charcoal text-xs tracking-widest uppercase font-semibold hover:bg-green-light transition-colors duration-300 disabled:opacity-30 disabled:cursor-not-allowed group shadow-sm"
            >
              {fr ? 'Passer au paiement' : 'Proceed to payment'}
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-charcoal/10">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-green hover:text-green-dark text-xs tracking-wider uppercase font-semibold transition-colors"
              >
                <ArrowLeft size={14} />
                {fr ? 'Modifier mes informations & dates' : 'Edit info & dates'}
              </button>
              <span className="text-xs text-charcoal/40 font-light">Étape 2 sur 2</span>
            </div>

            <h3 className="font-display text-2xl font-light text-charcoal">
              {fr ? 'Mode de règlement' : 'Payment method'}
            </h3>

            <p className="text-charcoal/50 text-sm font-light">
              {fr
                ? 'Sélectionnez votre moyen de paiement sécurisé pour valider votre demande.'
                : 'Select your preferred secure payment method to complete your booking.'}
            </p>

            {/* FedaPay */}
            <button
              type="button"
              onClick={() => setPayMethod('fedapay')}
              className={`w-full flex items-center gap-4 p-5 border transition-all duration-200 text-left ${
                payMethod === 'fedapay' ? 'border-green bg-green/10 shadow-sm' : 'border-charcoal/10 hover:border-charcoal/30 bg-white'
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
                  Flooz · T-Money · Moov Money — {fr ? 'Paiement instantané par téléphone' : 'Instant mobile payment'}
                </p>
              </div>
            </button>

            {/* Stripe */}
            <button
              type="button"
              onClick={() => setPayMethod('stripe')}
              className={`w-full flex items-center gap-4 p-5 border transition-all duration-200 text-left ${
                payMethod === 'stripe' ? 'border-green bg-green/10 shadow-sm' : 'border-charcoal/10 hover:border-charcoal/30 bg-white'
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

            <div className="flex items-start gap-3 p-4 bg-charcoal/5 border border-charcoal/10">
              <Lock size={14} className="text-green shrink-0 mt-0.5" />
              <p className="text-charcoal/50 text-xs font-light leading-relaxed">
                {fr
                  ? 'Vos données de réservation sont transmises de façon cryptée et sécurisée.'
                  : 'Your booking details are transmitted via encrypted and secure connection.'}
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => setAgreed(v => !v)}
                className={`w-4 h-4 border mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                  agreed ? 'bg-green border-green' : 'border-charcoal/30 group-hover:border-green/50'
                }`}
              >
                {agreed && <span className="text-charcoal text-[10px] font-bold">✓</span>}
              </div>
              <span className="text-charcoal/60 text-xs font-light leading-relaxed select-none">
                {fr
                  ? "J'accepte les conditions de réservation et la politique d'annulation de la Résidence Juweirat."
                  : "I accept the booking terms and cancellation policy of Résidence Juweirat."}
              </span>
            </label>

            <div className="space-y-3">
              <button
                type="button"
                onClick={async () => {
                  setSubmitting(true)
                  try {
                    const { submitBooking } = await import('@/lib/api')
                    const ok = await submitBooking({
                      ...form,
                      categoryId: categoryId,
                      checkInDate: localCheckIn,
                      checkOutDate: localCheckOut,
                      adults: adults,
                      children: children,
                      notes: form.notes
                    })
                    if (ok) setStep(3)
                    else alert(fr ? 'Erreur lors de la réservation. Veuillez réessayer.' : 'Booking error. Please try again.')
                  } finally {
                    setSubmitting(false)
                  }
                }}
                disabled={!step2Valid || !agreed || submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-green text-charcoal text-xs tracking-widest uppercase font-semibold hover:bg-green-light transition-colors duration-300 disabled:opacity-30 disabled:cursor-not-allowed group shadow-sm"
              >
                <Lock size={13} />
                {submitting
                  ? (fr ? 'Traitement en cours…' : 'Processing…')
                  : `${fr ? 'Confirmer la réservation' : 'Confirm booking'} — ${formatFCFA(pricing.total)}`}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-2.5 text-center text-xs text-charcoal/50 hover:text-charcoal font-light transition-colors"
              >
                ← {fr ? 'Retourner à l\'étape précédente' : 'Back to previous step'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT COLUMN : LIVE DYNAMIC SUMMARY CARD ── */}
      <div className="lg:col-span-2">
        <div className="sticky top-28 space-y-4">

          {/* Category card */}
          <div className="bg-white border border-charcoal/10 p-5 space-y-3 shadow-sm">
            <p className="text-green text-[10px] tracking-widest uppercase font-semibold">
              {fr ? 'Votre catégorie' : 'Your category'}
            </p>
            <div>
              <h2 className="text-charcoal font-display text-xl font-light">{categoryName}</h2>
              <p className="text-charcoal/40 text-xs font-light mt-1">
                {pmsType} · {pmsGamme} · Résidence Juweirat, Lomé
              </p>
            </div>
            <p className="text-charcoal/50 text-xs font-light">
              {fr
                ? 'Une unité disponible vous sera assignée à votre arrivée.'
                : 'An available unit will be assigned to you at check-in.'}
            </p>
          </div>

          {/* Stay details (Reactive in real time) */}
          <div className="bg-white border border-charcoal/10 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-charcoal/5 pb-2">
              <p className="text-green text-[10px] tracking-widest uppercase font-semibold">
                {fr ? 'Détails du séjour' : 'Stay details'}
              </p>
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-green hover:underline font-light"
                >
                  {fr ? 'Modifier dates' : 'Edit dates'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface p-3 space-y-1 border border-charcoal/5">
                <p className="text-charcoal/40 text-[10px] tracking-widest uppercase font-light flex items-center gap-1">
                  <CalendarDays size={11} className="text-green" /> {fr ? 'Arrivée' : 'Check-in'}
                </p>
                <p className="text-charcoal text-xs font-medium">{formatDate(localCheckIn, lang)}</p>
              </div>
              <div className="bg-surface p-3 space-y-1 border border-charcoal/5">
                <p className="text-charcoal/40 text-[10px] tracking-widest uppercase font-light flex items-center gap-1">
                  <CalendarDays size={11} className="text-green" /> {fr ? 'Départ' : 'Check-out'}
                </p>
                <p className="text-charcoal text-xs font-medium">{formatDate(localCheckOut, lang)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-light text-charcoal/70 bg-surface p-2.5">
              <Users size={13} className="text-green" />
              <span>
                {adults} {fr ? 'adulte' : 'adult'}{adults > 1 ? 's' : ''}
                {children > 0 && ` · ${children} ${fr ? 'enfant' : 'child'}${children > 1 ? (fr ? 's' : 'ren') : ''}`}
              </span>
              <span className="ml-auto font-medium text-charcoal">
                {localNights} {fr ? (localNights > 1 ? 'nuits' : 'nuit') : (localNights > 1 ? 'nights' : 'night')}
              </span>
            </div>

            <div className="h-px bg-charcoal/10" />

            {/* Price breakdown */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-charcoal/60 font-light">
                  {formatFCFA(tarifNuit)} × {localNights} {fr ? (localNights > 1 ? 'nuits' : 'nuit') : (localNights > 1 ? 'nights' : 'night')}
                </span>
                <span className="text-charcoal font-medium">{formatFCFA(localNights * tarifNuit)}</span>
              </div>
              {pricing.savings > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green font-light">{fr ? 'Réduction' : 'Discount'} ({pricing.rateLabel})</span>
                  <span className="text-green font-semibold">− {formatFCFA(pricing.savings)}</span>
                </div>
              )}
              <div className="h-px bg-charcoal/10 my-1" />
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-charcoal text-sm font-semibold">{fr ? 'Total séjour' : 'Total stay'}</span>
                <span className="text-green text-2xl font-bold">{formatFCFA(pricing.total)}</span>
              </div>
            </div>
          </div>

          <p className="text-charcoal/40 text-xs font-light text-center leading-relaxed">
            {fr
              ? 'Des questions ? Contactez-nous au +228 90 00 00 00 ou par email à contact@juweirat.com'
              : 'Questions? Contact us at +228 90 00 00 00 or by email at contact@juweirat.com'}
          </p>
        </div>
      </div>

    </div>
  )
}
