'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Grid2X2 } from 'lucide-react'
import type { RoomImage } from '@/lib/api'
import type { Lang } from '@/lib/i18n'

interface Props {
  images: RoomImage[]
  lang: Lang
  roomName: string
  compact?: boolean
}

const FALLBACK = '/images/IMG_5101.jpg'

export default function RoomGallery({ images, lang, roomName, compact = false }: Props) {
  // Cover first, then by sortOrder
  const sorted = images.length
    ? [...images].sort((a, b) => {
        if (a.isCover && !b.isCover) return -1
        if (!a.isCover && b.isCover) return 1
        return a.sortOrder - b.sortOrder
      })
    : [{ id: 0, filePath: FALLBACK, altTextFr: roomName, altTextEn: roomName, sortOrder: 0, isCover: true }]

  const [active, setActive]     = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [fading, setFading]     = useState(false)
  const thumbsRef               = useRef<HTMLDivElement>(null)
  const lbThumbsRef             = useRef<HTMLDivElement>(null)

  const getAlt = (img: RoomImage, idx: number) =>
    (lang === 'en' ? img.altTextEn : img.altTextFr) ?? `${roomName} — photo ${idx + 1}`

  const scrollThumb = useCallback((idx: number, ref: React.RefObject<HTMLDivElement | null>) => {
    const container = ref.current
    if (!container) return
    const el = container.children[idx] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [])

  function goTo(idx: number) {
    if (idx === active) return
    setFading(true)
    setTimeout(() => {
      setActive(idx)
      setFading(false)
    }, 180)
    scrollThumb(idx, thumbsRef)
    scrollThumb(idx, lbThumbsRef)
  }

  const prev = useCallback(() => goTo(active > 0 ? active - 1 : sorted.length - 1), [active, sorted.length])
  const next = useCallback(() => goTo(active < sorted.length - 1 ? active + 1 : 0), [active, sorted.length])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape')     setLightbox(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, prev, next])

  // Lock body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = lightbox ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [lightbox])

  const current = sorted[active]

  return (
    <>
      {/* ── Main viewer ────────────────────────────────────────────────────── */}
      <div className="space-y-2">

        {/* Hero photo */}
        <div className={`relative ${compact ? 'aspect-[4/3]' : 'aspect-[16/9]'} overflow-hidden bg-charcoal/8 group cursor-pointer`}
             onClick={() => setLightbox(true)}>
          <Image
            src={current.filePath}
            alt={getAlt(current, active)}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 70vw"
            className={`object-cover transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}
          />

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-charcoal/70 to-transparent pointer-events-none" />

          {/* Counter */}
          <span className="absolute bottom-4 left-5 text-white/70 text-xs tracking-[0.2em] font-light pointer-events-none select-none">
            {active + 1} / {sorted.length}
          </span>

          {/* View all */}
          {sorted.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightbox(true) }}
              className="absolute bottom-3.5 right-4 flex items-center gap-1.5 bg-black/35 hover:bg-black/55 backdrop-blur-sm
                         text-white text-[10px] tracking-widest uppercase font-light px-3 py-2 transition-colors duration-200"
            >
              <Grid2X2 size={11} />
              {lang === 'fr' ? `Toutes les photos (${sorted.length})` : `All photos (${sorted.length})`}
            </button>
          )}

          {/* Arrows */}
          {sorted.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev() }}
                aria-label="Photo précédente"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/25 hover:bg-black/50 backdrop-blur-sm
                           text-white flex items-center justify-center transition-all duration-200
                           opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); next() }}
                aria-label="Photo suivante"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/25 hover:bg-black/50 backdrop-blur-sm
                           text-white flex items-center justify-center transition-all duration-200
                           opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {sorted.length > 1 && (
          <div
            ref={thumbsRef}
            className="flex gap-1.5 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {sorted.map((img, i) => (
              <button
                key={img.id}
                onClick={() => goTo(i)}
                className={`relative shrink-0 w-[88px] h-[58px] overflow-hidden transition-all duration-200 ${
                  i === active
                    ? 'ring-2 ring-green ring-offset-1 opacity-100'
                    : 'opacity-50 hover:opacity-80'
                }`}
              >
                <Image
                  src={img.filePath}
                  alt={getAlt(img, i)}
                  fill
                  className="object-cover"
                  sizes="88px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ───────────────────────────────────────────────────────── */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-charcoal/97 flex flex-col" onClick={() => setLightbox(false)}>

          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 shrink-0" onClick={e => e.stopPropagation()}>
            <div>
              <p className="text-white font-display text-lg font-light">{roomName}</p>
              <p className="text-white/30 text-xs tracking-[0.2em] mt-0.5">{active + 1} / {sorted.length}</p>
            </div>
            <button
              onClick={() => setLightbox(false)}
              className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={22} />
            </button>
          </div>

          {/* Main image area */}
          <div className="flex-1 relative flex items-center justify-center px-14 min-h-0" onClick={e => e.stopPropagation()}>
            <div className="relative w-full h-full">
              <Image
                src={current.filePath}
                alt={getAlt(current, active)}
                fill
                className={`object-contain transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}
                sizes="90vw"
              />
            </div>

            {sorted.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center
                             text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft size={26} />
                </button>
                <button
                  onClick={next}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center
                             text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ChevronRight size={26} />
                </button>
              </>
            )}
          </div>

          {/* Bottom thumbnail strip */}
          {sorted.length > 1 && (
            <div className="shrink-0 py-4 px-6" onClick={e => e.stopPropagation()}>
              <div
                ref={lbThumbsRef}
                className="flex gap-1.5 justify-center overflow-x-auto"
                style={{ scrollbarWidth: 'none' }}
              >
                {sorted.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => goTo(i)}
                    className={`relative shrink-0 w-14 h-9 overflow-hidden transition-all duration-200 ${
                      i === active
                        ? 'ring-1 ring-green opacity-100'
                        : 'opacity-30 hover:opacity-60'
                    }`}
                  >
                    <Image src={img.filePath} alt="" fill className="object-cover" sizes="56px" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
