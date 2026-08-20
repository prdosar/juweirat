export interface StayPricing {
  nights: number
  perNight: number
  total: number          // Total HT (les prix stockés sont HT)
  totalTva: number       // TVA 18% ajoutée
  totalTtc: number       // total + totalTva
  originalTotal: number
  savings: number
  rateLabel: string
}

// Taux TVA appliqué à l'hôtellerie au Togo — même valeur côté back-office.
export const TVA_RATE = 0.18

export function nightsBetween(a: string, b: string): number {
  if (!a || !b) return 0
  const d1 = new Date(a + 'T00:00:00').getTime()
  const d2 = new Date(b + 'T00:00:00').getTime()
  return Math.max(0, Math.round((d2 - d1) / 86400000))
}

export function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' FCFA'
}

// Formatte un montant HT avec le suffixe "HT" explicite.
export function formatFCFAHT(n: number): string {
  return formatFCFA(n) + ' HT'
}

export function calcStayPrice(
  tarifNuit: number,
  tarifN15: number | null | undefined,
  tarifN30: number | null | undefined,
  nights: number
): StayPricing {
  if (nights <= 0 || !tarifNuit) {
    return {
      nights: 0,
      perNight: tarifNuit || 0,
      total: 0,
      totalTva: 0,
      totalTtc: 0,
      originalTotal: 0,
      savings: 0,
      rateLabel: '',
    }
  }

  // Tous les tarifs sont journaliers (source unique : RoomCategory).
  // Palier choisi par durée : < 15 nuits → tarifNuit, 15–29 → tarifN15, ≥ 30 → tarifN30.
  let perNight = tarifNuit
  let rateLabel = `${nights} nuit${nights > 1 ? 's' : ''}`

  if (nights >= 30 && tarifN30 && tarifN30 > 0) {
    perNight = tarifN30
    rateLabel = 'forfait mensuel'
  } else if (nights >= 15 && tarifN15 && tarifN15 > 0) {
    perNight = tarifN15
    rateLabel = 'forfait 15 jours'
  }

  // Convention : les tarifs stockés (tarifNuit, tarifN15, tarifN30) sont HT.
  // La TVA 18% est ajoutée par-dessus pour donner le TTC (montant que paie le client).
  const total = perNight * nights
  const originalTotal = tarifNuit * nights
  const savings = Math.max(0, originalTotal - total)
  const totalTva = Math.round(total * TVA_RATE)
  const totalTtc = total + totalTva

  return {
    nights,
    perNight,
    total,
    totalTva,
    totalTtc,
    originalTotal,
    savings,
    rateLabel,
  }
}
