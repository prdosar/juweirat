export interface StayPricing {
  nights: number
  perNight: number
  total: number
  originalTotal: number
  savings: number
  rateLabel: string
}

export function nightsBetween(a: string, b: string): number {
  if (!a || !b) return 0
  const d1 = new Date(a + 'T00:00:00').getTime()
  const d2 = new Date(b + 'T00:00:00').getTime()
  return Math.max(0, Math.round((d2 - d1) / 86400000))
}

export function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' FCFA'
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

  const total = perNight * nights
  const originalTotal = tarifNuit * nights
  const savings = Math.max(0, originalTotal - total)

  return {
    nights,
    perNight,
    total,
    originalTotal,
    savings,
    rateLabel,
  }
}
