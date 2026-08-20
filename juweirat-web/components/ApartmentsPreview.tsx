import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getLang } from '@/lib/lang'
import { getRooms, formatPrice, coverImage } from '@/lib/api'
import { t } from '@/lib/i18n'

export default async function ApartmentsPreview() {
  const [lang, allRooms] = await Promise.all([getLang(), getRooms()])
  const featured = allRooms.filter(r => r.isFeatured).slice(0, 3)

  return (
    <section className="bg-surface py-24 lg:py-32 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <div>
            <p className="text-green text-xs tracking-[0.4em] uppercase font-light mb-4">
              {t(lang, 'apts_label')}
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-light text-charcoal">
              {t(lang, 'apts_heading')}
              <br />
              <span className="italic text-green">{t(lang, 'apts_accent')}</span>
            </h2>
          </div>
          <Link
            href="/appartements"
            className="flex items-center gap-2 text-green text-xs tracking-widest uppercase font-light
                       hover:gap-4 transition-all duration-300 group shrink-0"
          >
            {t(lang, 'apts_view_all')}
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>

        {/* Cards */}
        {featured.length === 0 ? (
          <p className="text-charcoal/40 text-center py-12">{t(lang, 'apts_no_rooms')}</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-px bg-charcoal/5">
            {featured.map(room => {
              const name  = lang === 'en' ? room.nameEn : room.nameFr
              const cover = coverImage(room)
              return (
                <Link
                  key={room.id}
                  href={`/appartements/${room.id}`}
                  className="group relative overflow-hidden bg-surface block"
                >
                  {/* Image */}
                  <div className="relative h-72 overflow-hidden">
                    <Image
                      src={cover}
                      alt={name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-charcoal/30 group-hover:bg-charcoal/10 transition-colors duration-500" />
                    {room.floor === 6 && (
                      <span className="absolute top-4 left-4 text-[10px] tracking-widest uppercase bg-green text-charcoal px-3 py-1 font-semibold">
                        {t(lang, 'ap_prestige')}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 border-t border-charcoal/5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-display text-xl font-light text-charcoal group-hover:text-green transition-colors duration-300">
                        {name}
                      </h3>
                      <ArrowRight
                        size={16}
                        className="text-green/50 group-hover:text-green group-hover:translate-x-1 transition-all duration-300 mt-1 shrink-0"
                      />
                    </div>
                    <p className="text-charcoal/40 text-xs font-light mb-3">{room.roomNumber}</p>
                    <p className="text-green text-sm font-medium">
                      {t(lang, 'apts_from')} {formatPrice(room.tarifNuit, lang)}{' '}
                      <span className="text-charcoal/40 text-xs font-light">{t(lang, 'apts_per_night')}</span>
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

