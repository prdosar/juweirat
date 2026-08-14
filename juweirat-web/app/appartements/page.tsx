import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getLang } from '@/lib/lang'
import { getCategories } from '@/lib/api'
import { t } from '@/lib/i18n'
import CategoriesList from '@/components/CategoriesList'

export const metadata: Metadata = {
  title: 'Appartements — Résidence Juweirat Lomé',
  description: '9 catégories d\'appartements meublés à Lomé, Togo. Du studio au penthouse, découvrez nos espaces de vie confortables et élégants.',
}

export default async function AppartementsPage() {
  const [lang, categories] = await Promise.all([getLang(), getCategories()])

  const includedAmenities = lang === 'en'
    ? ['High-Speed Wi-Fi', 'Air Conditioning', 'Television', 'Equipped Kitchen', 'Hot Water', 'Secure Parking']
    : ['Wi-Fi haut débit', 'Climatisation', 'TV écran plat', 'Cuisine équipée', 'Eau chaude', 'Parking sécurisé']

  return (
    <div className="pt-20">

      {/* Page hero — kept dark: photo needs dark overlay */}
      <section className="relative h-64 md:h-80 flex items-center px-6 overflow-hidden bg-charcoal-800">
        <div className="absolute inset-0">
          <Image src="/images/IMG_5101.jpg" alt="Appartements Juweirat" fill className="object-cover opacity-20" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-800 via-charcoal-800/80 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto w-full">
          <p className="text-green text-xs tracking-[0.4em] uppercase font-light mb-3">Résidence Juweirat</p>
          <h1 className="font-display text-4xl md:text-6xl font-light text-white">
            {lang === 'en' ? 'Our ' : 'Nos '}
            <span className="italic text-green">{lang === 'en' ? 'Apartments' : 'Appartements'}</span>
          </h1>
          <p className="text-white/50 mt-3 font-light">{t(lang, 'ap_sub')}</p>
        </div>
      </section>

      {/* Included amenities bar */}
      <section className="bg-surface py-10 px-6 border-b border-charcoal/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <p className="text-green text-xs tracking-widest uppercase font-light shrink-0">{t(lang, 'ap_included')}</p>
            {includedAmenities.map(a => (
              <span key={a} className="text-charcoal/50 text-sm font-light flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-green inline-block" />
                {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Category grid with filters */}
      <section className="bg-[#FAFAFA] py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <CategoriesList categories={categories} lang={lang} />
        </div>
      </section>

      {/* Parking notice */}
      <section className="bg-surface py-12 px-6 border-t border-charcoal/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-green text-xs tracking-widest uppercase font-light mb-2">{t(lang, 'ap_parking')}</p>
            <h3 className="text-charcoal font-light text-xl font-display">{t(lang, 'ap_parking_title')}</h3>
            <p className="text-charcoal/40 text-sm font-light mt-1">{t(lang, 'ap_parking_sub')}</p>
          </div>
          <Link
            href="/contact"
            className="flex items-center gap-2 px-8 py-3.5 border border-green text-green text-xs tracking-widest uppercase font-medium
                       hover:bg-green hover:text-charcoal transition-all duration-300 shrink-0 group"
          >
            {t(lang, 'ap_book_apt')}
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  )
}
