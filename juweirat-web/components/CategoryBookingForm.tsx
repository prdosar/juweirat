'use client'
import { useState, useRef, useMemo, useEffect } from 'react'
import { CheckCircle, User, Mail, Phone, Globe, CreditCard, Lock, ChevronRight, CalendarDays, Users, ScrollText, ArrowLeft, AlertTriangle } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

import { calcStayPrice, nightsBetween, formatFCFA } from '@/lib/pricing'
import { getCategoryAvailability, type CategoryAvailability } from '@/lib/api'

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

// La garantie remplace le mode de paiement. Le client fournit soit une empreinte
// carte (obligatoire pour bloquer la résa), soit indique qu'il n'a pas de carte —
// dans ce cas la direction doit être contactée pour finaliser manuellement.
type GarantieChoice = 'card' | 'none' | null

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

function openPicker(ref: React.RefObject<HTMLInputElement | null>) {
  try { ref.current?.showPicker() } catch { ref.current?.focus() }
}

export default function CategoryBookingForm({
  categoryId, categorySlug, categoryName, pmsType, pmsGamme,
  lang, checkIn: initCheckIn, checkOut: initCheckOut, adults, children,
  tarifNuit, tarifN15, tarifN30,
}: Props) {
  const [step,       setStep]       = useState<1 | 2 | 3>(1)
  const [garantie,   setGarantie]   = useState<GarantieChoice>(null)
  const [carteNumero, setCarteNumero]     = useState('')
  const [carteNom, setCarteNom]           = useState('')
  const [carteExpiration, setCarteExpiration] = useState('')
  const [form,       setForm]       = useState({ firstName: '', lastName: '', email: '', phone: '', nationality: '', notes: '' })
  const [agreed,     setAgreed]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [availability, setAvailability] = useState<CategoryAvailability | null>(null)
  const [availLoading,  setAvailLoading]  = useState(false)

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
  const pricing     = useMemo(() => calcStayPrice(tarifNuit, tarifN15, tarifN30, localNights), [tarifNuit, tarifN15, tarifN30, localNights])

  // Recharge la dispo dès qu'une date change — bloque la suite si tout est pris.
  useEffect(() => {
    if (!localCheckIn || !localCheckOut || localNights <= 0) { setAvailability(null); return }
    let cancelled = false
    setAvailLoading(true)
    getCategoryAvailability(categoryId, localCheckIn, localCheckOut, Math.max(1, adults))
      .then(a => { if (!cancelled) setAvailability(a) })
      .finally(() => { if (!cancelled) setAvailLoading(false) })
    return () => { cancelled = true }
  }, [categoryId, localCheckIn, localCheckOut, adults, localNights])

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

  // Une catégorie est bookable si availability = null (chargement) ou available > 0.
  const soldOut = availability !== null && availability.available <= 0

  const step1Valid = Boolean(
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.includes('@') &&
    form.phone.trim() &&
    localCheckIn &&
    localCheckOut &&
    localNights > 0 &&
    !soldOut
  )

  const cardValid =
    carteNumero.replace(/\s/g, '').length >= 4 &&
    carteNom.trim().length > 0 &&
    /^\d{2}\/\d{4}$/.test(carteExpiration)
  // 'none' est intentionnellement non-soumettable : le client doit contacter la direction.
  const step2Valid = garantie === 'card' && cardValid

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
            { n: 2, label: fr ? 'Garantie'         : 'Guarantee' },
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

              {/* Disponibilité temps réel pour cette catégorie */}
              {localNights > 0 && (
                availLoading ? (
                  <p className="text-charcoal/40 text-[11px] mt-2 tracking-widest uppercase font-light">
                    {fr ? 'Vérification de la disponibilité…' : 'Checking availability…'}
                  </p>
                ) : availability && availability.available > 0 ? (
                  <p className="text-green text-[11px] mt-2 tracking-widest uppercase font-semibold">
                    ✓ {availability.available} / {availability.total} {fr ? 'unités disponibles' : 'units available'}
                  </p>
                ) : availability && availability.available === 0 ? (
                  <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 px-3 py-2 text-red-700">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <p className="text-xs">
                      {fr
                        ? 'Catégorie complète sur ces dates. Modifiez la période ou choisissez une autre catégorie.'
                        : 'Category fully booked for these dates. Change the period or pick another category.'}
                    </p>
                  </div>
                ) : null
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
                    placeholder="+228 70 79 08 89"
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
              {fr ? 'Continuer' : 'Continue'}
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
              {fr ? 'Garantie de la réservation' : 'Booking guarantee'}
            </h3>

            <p className="text-charcoal/50 text-sm font-light">
              {fr
                ? "Une empreinte de carte bancaire est requise pour bloquer votre séjour. Aucun débit ne sera effectué avant votre arrivée — la carte sert uniquement de garantie."
                : 'A credit card imprint is required to secure your stay. No charge will be made before your arrival — the card is only used as guarantee.'}
            </p>

            {/* Choix : carte bancaire */}
            <button
              type="button"
              onClick={() => setGarantie('card')}
              className={`w-full flex items-start gap-4 p-5 border transition-all duration-200 text-left ${
                garantie === 'card' ? 'border-green bg-green/10 shadow-sm' : 'border-charcoal/10 hover:border-charcoal/30 bg-white'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                garantie === 'card' ? 'border-green' : 'border-charcoal/20'
              }`}>
                {garantie === 'card' && <span className="w-2.5 h-2.5 rounded-full bg-green" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <CreditCard size={16} className="text-green shrink-0" />
                  <span className="text-charcoal text-sm font-medium">
                    {fr ? "J'ai une carte bancaire" : 'I have a credit card'}
                  </span>
                </div>
                <p className="text-charcoal/40 text-xs font-light pl-7">
                  Visa · Mastercard · American Express — {fr ? 'seuls les 4 derniers chiffres sont conservés' : 'only the last 4 digits are stored'}
                </p>
              </div>
            </button>

            {/* Formulaire carte — visible uniquement si option 'card' choisie */}
            {garantie === 'card' && (
              <div className="space-y-4 border border-charcoal/10 bg-white p-5">
                <div>
                  <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-1.5">
                    {fr ? 'Numéro de carte *' : 'Card number *'}
                  </label>
                  <input
                    maxLength={19}
                    value={carteNumero}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 16)
                      setCarteNumero(raw.replace(/(.{4})/g, '$1 ').trim())
                    }}
                    placeholder="XXXX XXXX XXXX XXXX"
                    inputMode="numeric"
                    className="w-full bg-surface border border-charcoal/10 text-charcoal px-4 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:border-green transition-colors placeholder:text-charcoal/20"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-1.5">
                      {fr ? 'Nom sur la carte *' : 'Cardholder name *'}
                    </label>
                    <input
                      value={carteNom}
                      onChange={e => setCarteNom(e.target.value.toUpperCase())}
                      placeholder="NOM PRÉNOM"
                      className="w-full bg-surface border border-charcoal/10 text-charcoal px-4 py-2.5 text-sm font-light focus:outline-none focus:border-green transition-colors placeholder:text-charcoal/20"
                    />
                  </div>
                  <div>
                    <label className="block text-charcoal/40 text-[10px] tracking-widest uppercase font-light mb-1.5">
                      {fr ? 'Expiration *' : 'Expiry *'}
                    </label>
                    <input
                      maxLength={7}
                      value={carteExpiration}
                      onChange={e => {
                        let v = e.target.value.replace(/\D/g, '')
                        if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2, 6)
                        setCarteExpiration(v)
                      }}
                      placeholder="MM/AAAA"
                      inputMode="numeric"
                      className="w-full bg-surface border border-charcoal/10 text-charcoal px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-green transition-colors placeholder:text-charcoal/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Choix : pas de carte → contact direction */}
            <button
              type="button"
              onClick={() => setGarantie('none')}
              className={`w-full flex items-start gap-4 p-5 border transition-all duration-200 text-left ${
                garantie === 'none' ? 'border-amber-400 bg-amber-50 shadow-sm' : 'border-charcoal/10 hover:border-charcoal/30 bg-white'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                garantie === 'none' ? 'border-amber-500' : 'border-charcoal/20'
              }`}>
                {garantie === 'none' && <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span className="text-charcoal text-sm font-medium">
                    {fr ? "Je n'ai pas de carte bancaire" : 'I have no credit card'}
                  </span>
                </div>
                <p className="text-charcoal/40 text-xs font-light pl-7">
                  {fr ? 'La direction sera contactée pour finaliser votre réservation' : 'Direction will be contacted to finalize your booking'}
                </p>
              </div>
            </button>

            {garantie === 'none' && (
              <div className="border border-amber-200 bg-amber-50 p-5 space-y-2">
                <p className="text-amber-800 text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle size={14} /> {fr ? 'Réservation non finalisable en ligne' : 'Booking cannot be finalized online'}
                </p>
                <p className="text-amber-700 text-xs font-light leading-relaxed">
                  {fr
                    ? "Contactez la direction de la Résidence Juweirat pour compléter votre réservation :"
                    : 'Please contact Juweirat management to complete your booking:'}
                </p>
                <ul className="text-amber-800 text-xs font-medium space-y-1 pl-4">
                  <li>📞 <a href="tel:+22870790889" className="underline">+228 70 79 08 89</a></li>
                  <li>✉️ <a href="mailto:contact@juweirat.com" className="underline">contact@juweirat.com</a></li>
                </ul>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-charcoal/5 border border-charcoal/10">
              <Lock size={14} className="text-green shrink-0 mt-0.5" />
              <p className="text-charcoal/50 text-xs font-light leading-relaxed">
                {fr
                  ? 'Vos données sont transmises de façon cryptée et sécurisée. Seuls les 4 derniers chiffres de votre carte sont conservés.'
                  : 'Your data is transmitted securely. Only the last 4 digits of your card are stored.'}
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

            {submitError && (
              <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-2 text-xs">{submitError}</div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={async () => {
                  setSubmitting(true)
                  setSubmitError(null)
                  try {
                    const { submitBooking } = await import('@/lib/api')
                    const result = await submitBooking({
                      ...form,
                      categoryId: categoryId,
                      checkInDate: localCheckIn,
                      checkOutDate: localCheckOut,
                      adults: adults,
                      children: children,
                      notes: form.notes,
                      carteNom: carteNom.trim(),
                      carteNumero: carteNumero.replace(/\s/g, ''),
                      carteExpiration: carteExpiration,
                    })
                    if (result.ok) setStep(3)
                    else setSubmitError(
                      result.error ??
                      (fr ? 'Erreur lors de la réservation. Veuillez réessayer.' : 'Booking error. Please try again.')
                    )
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
                <span className="text-charcoal font-medium">{formatFCFA(pricing.originalTotal)}</span>
              </div>
              {pricing.savings > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green font-light">{fr ? 'Tarif préférentiel' : 'Discounted rate'} ({pricing.rateLabel})</span>
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
              ? 'Des questions ? Contactez-nous au +228 70 79 08 89 ou par email à contact@juweirat.com'
              : 'Questions? Contact us at +228 70 79 08 89 or by email at contact@juweirat.com'}
          </p>
        </div>
      </div>

    </div>
  )
}
