const API = process.env.API_URL ?? 'http://localhost:5177'

export interface RoomImage {
  id: number
  filePath: string
  altTextFr: string | null
  altTextEn: string | null
  sortOrder: number
  isCover: boolean
}

export interface RoomAmenity {
  id: number
  nameFr: string
  nameEn: string
  icon: string | null
}

export interface RoomCategory {
  id: number
  slug: string
  pmsType: string
  pmsGamme: string
  nameFr: string
  nameEn: string
  descriptionFr: string | null
  descriptionEn: string | null
  capacityAdults: number
  capacityChildren: number
  tarifNuit: number
  tarifN15: number
  tarifN30: number
  roomCount: number
}

export interface Room {
  id: number
  roomNumber: string
  floor: number
  nameFr: string
  nameEn: string
  descriptionFr: string | null
  descriptionEn: string | null
  capacityAdults: number
  capacityChildren: number
  sizeSqm: number | null
  pricePerNight: number
  pricePerWeek: number | null
  pricePerMonth: number | null
  status: string
  isFeatured: boolean
  categoryId: number | null
  categorySlug: string | null
  pmsType: string | null
  pmsGamme: string | null
  images: RoomImage[]
  amenities: RoomAmenity[]
}

export async function getCategories(): Promise<RoomCategory[]> {
  try {
    const res = await fetch(`${API}/api/room-categories`, { next: { revalidate: 3600, tags: ['categories'] } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function getAvailableCategories(checkIn: string, checkOut: string, adults: number): Promise<RoomCategory[]> {
  try {
    const qs = `checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`
    const res = await fetch(`${API}/api/room-categories/available?${qs}`, { cache: 'no-store' })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function getCategoryBySlug(slug: string): Promise<RoomCategory | null> {
  try {
    const res = await fetch(`${API}/api/room-categories/${slug}`, { next: { revalidate: 3600, tags: ['categories', `cat-${slug}`] } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getRooms(): Promise<Room[]> {
  try {
    const res = await fetch(`${API}/api/rooms`, { next: { revalidate: 60, tags: ['rooms'] } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function getRoomById(id: string | number): Promise<Room | null> {
  try {
    const res = await fetch(`${API}/api/rooms/${id}`, { next: { revalidate: 30, tags: ['rooms', `room-${id}`] } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export function formatPrice(amount: number, lang: 'fr' | 'en' = 'fr'): string {
  const formatted = new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(amount)
  return `${formatted} FCFA`
}

export function coverImage(room: Room): string {
  const cover = room.images.find(i => i.isCover) ?? room.images[0]
  return cover?.filePath ?? '/images/IMG_5101.jpg'
}

export async function submitContact(data: { name: string, email: string, phone: string, subject: string, message: string }): Promise<boolean> {
  try {
    const res = await fetch(`${API}/api/public/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.ok
  } catch {
    return false
  }
}

export async function submitBooking(data: {
  firstName: string, lastName: string, email: string, phone: string, nationality: string,
  categoryId: number, checkInDate: string, checkOutDate: string, adults: number, children: number, notes: string
}): Promise<boolean> {
  try {
    const res = await fetch(`${API}/api/public/booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.ok
  } catch {
    return false
  }
}
