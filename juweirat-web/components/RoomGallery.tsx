'use client'
import { useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { RoomImage } from '@/lib/api'
import type { Lang } from '@/lib/i18n'

interface Props {
  images: RoomImage[]
  lang: Lang
  roomName: string
}

export default function RoomGallery({ images, lang, roomName }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  if (images.length === 0) return null

  const getAlt = (img: RoomImage, idx: number) =>
    (lang === 'en' ? img.altTextEn : img.altTextFr) ?? `${roomName} — photo ${idx + 1}`

  const prev = () => setLightbox(i => (i! > 0 ? i! - 1 : images.length - 1))
  const next = () => setLightbox(i => (i! < images.length - 1 ? i! + 1 : 0))

  const [cover, ...rest] = images

  return (
    <>
      {/* Main grid: cover large, rest smaller */}
      <div className={`grid gap-1 ${rest.length > 0 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Cover — takes 2 columns on md */}
        <button
          onClick={() => setLightbox(0)}
          className={`relative overflow-hidden group ${rest.length > 0 ? 'col-span-2 md:col-span-2 aspect-video' : 'aspect-video'}`}
        >
          <Image
            src={cover.filePath}
            alt={getAlt(cover, 0)}
            fill
            priority
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, 66vw"
          />
          <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/20 transition-colors duration-300" />
        </button>

        {/* Rest */}
        {rest.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setLightbox(i + 1)}
            className="relative aspect-video overflow-hidden group"
          >
            <Image
              src={img.filePath}
              alt={getAlt(img, i + 1)}
              fill
              loading="lazy"
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/20 transition-colors duration-300" />
            {i === rest.length - 1 && images.length > rest.length + 1 && (
              <div className="absolute inset-0 bg-charcoal/60 flex items-center justify-center">
                <span className="text-white font-light text-lg">+{images.length - rest.length - 1}</span>
              </div>
            )}
          </button>
        ))}
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
              src={images[lightbox].filePath}
              alt={getAlt(images[lightbox], lightbox)}
              width={1200}
              height={800}
              className="object-contain w-full max-h-[85vh]"
            />
            <p className="text-center text-white/40 text-xs mt-3 tracking-widest">
              {lightbox + 1} / {images.length}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

