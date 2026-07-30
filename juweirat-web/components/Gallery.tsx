'use client'
import { useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { t, type Lang } from '@/lib/i18n'

const photos = [
  { src: '/images/IMG_4982.jpg', altFr: 'Chambre - vue frontale',    altEn: 'Bedroom - front view' },
  { src: '/images/IMG_4990.jpg', altFr: 'Chambre - vue salon',       altEn: 'Bedroom - living area' },
  { src: '/images/IMG_4994.jpg', altFr: 'Chambre - détail lit',      altEn: 'Bedroom - bed detail' },
  { src: '/images/IMG_5003.jpg', altFr: 'Chambre - angle',           altEn: 'Bedroom - angle view' },
  { src: '/images/IMG_5011.jpg', altFr: 'Chambre - lumière',         altEn: 'Bedroom - lighting' },
  { src: '/images/IMG_5017.jpg', altFr: 'Intérieur appartement',     altEn: 'Apartment interior' },
  { src: '/images/IMG_5022.jpg', altFr: 'Chambre double',            altEn: 'Double bedroom' },
  { src: '/images/IMG_5053.jpg', altFr: 'Salle de bain',             altEn: 'Bathroom' },
  { src: '/images/IMG_5065.jpg', altFr: 'Détail décoration',         altEn: 'Decor detail' },
  { src: '/images/IMG_5101.jpg', altFr: 'Salon principal',           altEn: 'Main living room' },
  { src: '/images/IMG_5106.jpg', altFr: 'Espace vie',                altEn: 'Living space' },
  { src: '/images/IMG_5118.jpg', altFr: 'Chambre moderne',           altEn: 'Modern bedroom' },
  { src: '/images/IMG_5121.jpg', altFr: 'Vue appartement',           altEn: 'Apartment view' },
  { src: '/images/IMG_5173.jpg', altFr: 'Bureau & TV',               altEn: 'Desk & TV' },
  { src: '/images/IMG_5177.jpg', altFr: 'Coin bureau',               altEn: 'Office corner' },
  { src: '/images/IMG_5218.jpg', altFr: 'Appartement prestige',      altEn: 'Prestige apartment' },
  { src: '/images/IMG_5229.jpg', altFr: 'Vue intérieure',            altEn: 'Interior view' },
  { src: '/images/IMG_5259.jpg', altFr: 'Galerie photo 1',           altEn: 'Gallery photo 1' },
  { src: '/images/IMG_5265.jpg', altFr: 'Galerie photo 2',           altEn: 'Gallery photo 2' },
  { src: '/images/IMG_5001.jpg', altFr: 'Salle de bain complète',    altEn: 'Full bathroom' },
]

interface Props {
  lang: Lang
  limit?: number
  showViewAll?: boolean
}

export default function Gallery({ lang, limit = 9, showViewAll = true }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const visible = photos.slice(0, limit)

  const prev = () => setLightbox(i => (i! > 0 ? i! - 1 : photos.length - 1))
  const next = () => setLightbox(i => (i! < photos.length - 1 ? i! + 1 : 0))

  return (
    <section className="bg-charcoal-800 py-24 lg:py-32 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-green text-xs tracking-[0.4em] uppercase font-light mb-4">
            {t(lang, 'gallery_label')}
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-light text-white">
            {t(lang, 'gallery_heading')}
            <span className="italic text-green">{t(lang, 'gallery_accent')}</span>
          </h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
          {visible.map((photo, i) => (
            <button
              key={i}
              onClick={() => setLightbox(i)}
              className="relative aspect-[4/3] overflow-hidden group block"
            >
              <Image
                src={photo.src}
                alt={lang === 'en' ? photo.altEn : photo.altFr}
                fill
                loading="lazy"
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/30 transition-colors duration-300" />
            </button>
          ))}
        </div>

        {/* View all */}
        {showViewAll && (
          <div className="text-center mt-10">
            <Link
              href="/appartements"
              className="inline-block px-8 py-3.5 border border-green/50 text-green text-xs tracking-widest uppercase font-light
                         hover:border-green hover:bg-green hover:text-charcoal transition-all duration-300"
            >
              {t(lang, 'gallery_view')}
            </Link>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white p-2"
            onClick={() => setLightbox(null)}
          >
            <X size={28} />
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-3"
            onClick={e => { e.stopPropagation(); prev() }}
          >
            <ChevronLeft size={32} />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-3"
            onClick={e => { e.stopPropagation(); next() }}
          >
            <ChevronRight size={32} />
          </button>
          <div
            className="relative max-w-5xl w-full max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={photos[lightbox].src}
              alt={lang === 'en' ? photos[lightbox].altEn : photos[lightbox].altFr}
              width={1200}
              height={800}
              className="object-contain w-full max-h-[85vh]"
            />
            <p className="text-center text-white/40 text-xs mt-3 tracking-widest">
              {lightbox + 1} / {photos.length}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
