'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'

interface Props {
  lang: Lang
}

export default function Hero({ lang }: Props) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="/images/IMG_5101.jpg"
          alt="Salon Résidence Juweirat"
          fill
          priority
          className="object-cover scale-105"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-charcoal/50 to-charcoal" />
        <div className="absolute inset-0 bg-charcoal/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Eyebrow */}
        <p
          className={`text-green text-xs md:text-sm tracking-[0.4em] uppercase font-light mb-6 transition-all duration-1000 ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {t(lang, 'hero_eyebrow')}
        </p>

        {/* Logo */}
        <div
          className={`flex justify-center mb-6 transition-all duration-1000 delay-100 ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Image
            src="/img/logo.png"
            alt="Résidence Juweirat"
            width={280}
            height={110}
            className="h-20 md:h-28 w-auto object-contain drop-shadow-2xl"
            priority
          />
        </div>

        {/* Main heading */}
        <h1
          className={`font-display text-3xl md:text-5xl lg:text-6xl font-light text-white leading-none mb-4 transition-all duration-1000 delay-200 ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="italic text-green-gradient font-medium">Résidence</span>
        </h1>

        {/* Tagline */}
        <div
          className={`flex items-center justify-center gap-4 my-8 transition-all duration-1000 delay-300 ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="h-px w-16 bg-green/60" />
          <p className="text-white/70 text-sm md:text-base tracking-widest uppercase font-light">
            {t(lang, 'hero_tagline')}
          </p>
          <div className="h-px w-16 bg-green/60" />
        </div>

        {/* Sub-tagline */}
        <p
          className={`text-white/60 text-sm md:text-base font-light max-w-md mx-auto mb-10 transition-all duration-1000 delay-400 ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {t(lang, 'hero_sub')}
        </p>

        {/* CTAs */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 delay-500 ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Link
            href="/appartements"
            className="px-8 py-3.5 bg-green text-charcoal text-xs tracking-widest uppercase font-semibold
                       hover:bg-green-light transition-colors duration-300 min-w-[200px] text-center"
          >
            {t(lang, 'hero_cta_apts')}
          </Link>
          <Link
            href="/contact"
            className="px-8 py-3.5 border border-white/40 text-white text-xs tracking-widest uppercase font-light
                       hover:border-green hover:text-green transition-colors duration-300 min-w-[200px] text-center"
          >
            {t(lang, 'hero_cta_contact')}
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 animate-bounce">
        <span className="text-[10px] tracking-widest uppercase">{t(lang, 'hero_discover')}</span>
        <ChevronDown size={16} />
      </div>
    </section>
  )
}
