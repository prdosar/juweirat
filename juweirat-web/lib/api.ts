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
  images: RoomImage[]
  amenities: RoomAmenity[]
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
