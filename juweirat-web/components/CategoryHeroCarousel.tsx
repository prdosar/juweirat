'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Camera, X, Maximize2 } from 'lucide-react';

interface Props {
  images: string[];
  name: string;
  pmsType: string;
  gammeLabel: string;
}

export default function CategoryHeroCarousel({ images, name, pmsType, gammeLabel }: Props) {
  const photoList = images.length > 0 ? images : ['/images/IMG_5101.jpg'];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const prev = useCallback(() => {
    setCurrentIdx((prev) => (prev > 0 ? prev - 1 : photoList.length - 1));
  }, [photoList.length]);

  const next = useCallback(() => {
    setCurrentIdx((prev) => (prev < photoList.length - 1 ? prev + 1 : 0));
  }, [photoList.length]);

  // Optional subtle auto-advance every 6 seconds when not hovered
  useEffect(() => {
    if (isHovered || lightbox || photoList.length <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [isHovered, lightbox, photoList.length, next]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightbox) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') setLightbox(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox, prev, next]);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 40) {
      if (diff > 0) next();
      else prev();
    }
    setTouchStart(null);
  };

  return (
    <>
      {/* ── CAROUSEL HERO CONTAINER ── */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative h-80 sm:h-96 overflow-hidden rounded-2xl bg-charcoal/5 shadow-md group select-none cursor-pointer"
        onClick={() => setLightbox(true)}
      >
        {/* Images with crossfade */}
        {photoList.map((src, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              idx === currentIdx ? 'opacity-100 z-0 scale-100' : 'opacity-0 -z-10 scale-105'
            }`}
          >
            <Image
              src={src}
              alt={`${name} — photo ${idx + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority={idx === 0}
            />
          </div>
        ))}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-black/30 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-4 left-4 flex gap-2 z-10">
          <span className="text-[10px] tracking-widest uppercase bg-charcoal/80 text-white px-3 py-1 font-semibold rounded-md backdrop-blur-md border border-white/10">
            {pmsType}
          </span>
          <span className="text-[10px] tracking-widest uppercase bg-green text-charcoal px-3 py-1 font-bold rounded-md shadow-sm">
            {gammeLabel}
          </span>
        </div>

        {/* Top Right: Fullscreen / Expand button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setLightbox(true);
          }}
          title="Agrandir en plein écran"
          className="absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-colors opacity-80 hover:opacity-100"
        >
          <Maximize2 size={14} />
        </button>

        {/* Navigation Arrows (Prev / Next) */}
        {photoList.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Photo précédente"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/40 hover:bg-black/75 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-105"
            >
              <ChevronLeft size={22} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Photo suivante"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/40 hover:bg-black/75 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-105"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Bottom Bar: Indicators & Photo Count */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs z-10">
          {/* Indicator dots or pill */}
          {photoList.length > 1 && (
            <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-full backdrop-blur-sm">
              {photoList.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIdx(i);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentIdx ? 'w-5 bg-green' : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Aller à la photo ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Photos Count badge */}
          <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm ml-auto">
            <Camera size={13} className="text-green" />
            <span>
              {currentIdx + 1} / {photoList.length} photos
            </span>
          </span>
        </div>
      </div>

      {/* ── LIGHTBOX PLEIN ÉCRAN ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 select-none animate-in fade-in duration-200"
          onClick={() => setLightbox(false)}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between text-white z-20 pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-display text-xl font-light">{name}</h3>
              <p className="text-xs text-white/50">
                Photo {currentIdx + 1} sur {photoList.length}
              </p>
            </div>

            <button
              onClick={() => setLightbox(false)}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              <X size={22} />
            </button>
          </div>

          {/* Main Photo */}
          <div
            className="relative flex-1 w-full max-h-[78vh] flex items-center justify-center z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full max-w-5xl">
              <Image
                src={photoList[currentIdx]}
                alt={`${name} — photo ${currentIdx + 1}`}
                fill
                className="object-contain"
                sizes="95vw"
                priority
              />
            </div>

            {photoList.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-md transition-colors"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-md transition-colors"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails */}
          {photoList.length > 1 && (
            <div
              className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              {photoList.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                    i === currentIdx ? 'border-green scale-105 opacity-100' : 'border-transparent opacity-40 hover:opacity-75'
                  }`}
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
