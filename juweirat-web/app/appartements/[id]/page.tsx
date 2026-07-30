import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Users, Baby, Maximize2, Mail, ArrowLeft } from 'lucide-react'
import { getLang } from '@/lib/lang'
import { getRoomById, formatPrice } from '@/lib/api'
import { t } from '@/lib/i18n'
import RoomGallery from '@/components/RoomGallery'
import BookingWidget from '@/components/BookingWidget'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const room = await getRoomById(id)
  if (!room) return { title: 'Appartement — Résidence Juweirat' }
  return {
    title: `${room.nameFr} — Résidence Juweirat`,
    description: room.descriptionFr ?? `${room.nameFr} · Résidence Juweirat Lomé`,
  }
}

export default async function RoomPage({ params }: Props) {
  const { id } = await params
  const [lang, room] = await Promise.all([getLang(), getRoomById(id)])

  if (!room) notFound()

  const name        = lang === 'en' ? room.nameEn : room.nameFr
  const description = lang === 'en' ? room.descriptionEn : room.descriptionFr
  const altDesc     = lang === 'en' ? room.descriptionFr : room.descriptionEn
  const altLabel    = lang === 'en' ? room.nameFr        : room.nameEn
  const available   = room.status === 'Available'

  return (
    <div className="pt-20 bg-[#FAFAFA] min-h-screen">

      {/* Back */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-8 pb-4">
        <Link
          href="/appartements"
          className="inline-flex items-center gap-2 text-charcoal/40 hover:text-green text-sm font-light tracking-widest uppercase transition-colors duration-300"
        >
          <ArrowLeft size={14} />
          {t(lang, 'apt_back')}
        </Link>
      </div>

      {/* Gallery */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-10">
        <RoomGallery images={room.images} lang={lang} roomName={name} />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <div className="grid lg:grid-cols-3 gap-12">

          {/* Main info */}
          <div className="lg:col-span-2 space-y-10">

            {/* Title + status */}
            <div>
              <div className="flex items-start gap-4 mb-2 flex-wrap">
                <h1 className="font-display text-4xl md:text-5xl font-light text-charcoal">{name}</h1>
                {room.floor === 6 && (
                  <span className="text-xs tracking-widest uppercase bg-green text-charcoal px-3 py-1.5 font-semibold mt-2">
                    {t(lang, 'ap_prestige')}
                  </span>
                )}
              </div>
              <p className="text-charcoal/30 text-sm font-light">{room.roomNumber}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className={`inline-block w-2 h-2 rounded-full ${available ? 'bg-green' : 'bg-charcoal/25'}`} />
                <span className={`text-sm font-light ${available ? 'text-green' : 'text-charcoal/50'}`}>
                  {available ? t(lang, 'apts_available') : t(lang, 'apts_occupied')}
                </span>
              </div>
            </div>

            {/* Description */}
            {description && (
              <div>
                <p className="text-green text-xs tracking-widest uppercase font-light mb-4">{t(lang, 'apt_description')}</p>
                <p className="text-charcoal/60 font-light leading-relaxed">{description}</p>
              </div>
            )}

            {/* Alt language description */}
            {altDesc && (
              <div className="border border-charcoal/5 p-6">
                <p className="text-charcoal/30 text-xs tracking-widest uppercase font-light mb-3">
                  {t(lang, 'apt_description_en')}
                </p>
                <p className="text-charcoal/30 font-light text-sm leading-relaxed italic">{altDesc}</p>
                <p className="text-charcoal/20 text-xs mt-2 font-light">{altLabel}</p>
              </div>
            )}

            {/* Capacity & size */}
            <div>
              <p className="text-green text-xs tracking-widest uppercase font-light mb-4">{t(lang, 'apt_capacity')}</p>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-green/30 flex items-center justify-center">
                    <Users size={16} className="text-green" />
                  </div>
                  <div>
                    <p className="text-charcoal font-medium">{room.capacityAdults}</p>
                    <p className="text-charcoal/40 text-xs font-light">{t(lang, 'apts_adults')}</p>
                  </div>
                </div>
                {room.capacityChildren > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border border-green/30 flex items-center justify-center">
                      <Baby size={16} className="text-green" />
                    </div>
                    <div>
                      <p className="text-charcoal font-medium">{room.capacityChildren}</p>
                      <p className="text-charcoal/40 text-xs font-light">{t(lang, 'apts_children')}</p>
                    </div>
                  </div>
                )}
                {room.sizeSqm && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border border-green/30 flex items-center justify-center">
                      <Maximize2 size={16} className="text-green" />
                    </div>
                    <div>
                      <p className="text-charcoal font-medium">{room.sizeSqm} {t(lang, 'apts_sqm')}</p>
                      <p className="text-charcoal/40 text-xs font-light">{t(lang, 'apt_size')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Amenities */}
            {room.amenities.length > 0 && (
              <div>
                <p className="text-green text-xs tracking-widest uppercase font-light mb-4">{t(lang, 'apt_amenities')}</p>
                <div className="flex flex-wrap gap-2">
                  {room.amenities.map(a => (
                    <span
                      key={a.id}
                      className="px-4 py-2 bg-surface border border-charcoal/10 text-charcoal/60 text-xs font-light tracking-wide
                                 hover:border-green/40 hover:text-charcoal/80 transition-colors duration-300"
                    >
                      {lang === 'en' ? a.nameEn : a.nameFr}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: booking widget + contact */}
          <div className="space-y-4">

            {/* Tarifs rapides */}
            <div className="bg-surface border border-charcoal/10 px-5 py-4 flex flex-wrap gap-x-6 gap-y-2">
              <div>
                <p className="text-charcoal/30 text-[10px] tracking-widest uppercase font-light">{t(lang, 'ap_per_night')}</p>
                <p className="text-green font-medium text-sm">{formatPrice(room.pricePerNight, lang)}</p>
              </div>
              {room.pricePerWeek && (
                <div>
                  <p className="text-charcoal/30 text-[10px] tracking-widest uppercase font-light">{t(lang, 'ap_per_week')}</p>
                  <p className="text-charcoal/60 text-sm">{formatPrice(room.pricePerWeek, lang)}</p>
                </div>
              )}
              {room.pricePerMonth && (
                <div>
                  <p className="text-charcoal/30 text-[10px] tracking-widest uppercase font-light">{t(lang, 'ap_per_month')}</p>
                  <p className="text-charcoal/60 text-sm">{formatPrice(room.pricePerMonth, lang)}</p>
                </div>
              )}
            </div>

            {/* Booking widget or unavailable notice */}
            {available ? (
              <BookingWidget room={room} lang={lang} />
            ) : (
              <div className="bg-surface border border-charcoal/10 p-6 text-center">
                <p className="text-charcoal/40 text-sm font-light">{t(lang, 'apts_occupied')}</p>
              </div>
            )}

            <Link
              href="/contact"
              className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-charcoal/10 text-charcoal/40 text-xs tracking-widest uppercase font-light
                         hover:border-green/50 hover:text-green/70 transition-colors duration-300"
            >
              <Mail size={13} />
              {t(lang, 'apts_contact')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
