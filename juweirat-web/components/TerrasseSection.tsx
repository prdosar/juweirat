import Link from 'next/link'
import Image from 'next/image'
import { CalendarCheck, Users, Sunset, Camera, Sparkles } from 'lucide-react'
import { getLang } from '@/lib/lang'
import { t } from '@/lib/i18n'
import { TERRASSE_PHOTOS } from '@/lib/categoryPhotos'

export default async function TerrasseSection() {
  const lang = await getLang()
  const fr = lang === 'fr'

  const features = [
    { icon: Sunset,        titleKey: 'terr_view',   descKey: 'terr_view_desc' },
    { icon: Users,         titleKey: 'terr_events', descKey: 'terr_events_desc' },
    { icon: CalendarCheck, titleKey: 'terr_resa',   descKey: 'terr_resa_desc' },
  ] as const

  return (
    <section className="relative bg-white py-24 lg:py-32 px-6 overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green/30 to-transparent" />
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #3DC720 0%, transparent 60%)' }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">

        {/* Text */}
        <div>
          <div className="inline-flex items-center gap-2 bg-green/10 text-green font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full mb-4">
            <Sparkles size={13} />
            {t(lang, 'terr_label')}
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-light text-charcoal leading-tight mb-6">
            {t(lang, 'terr_heading')}
            <br />
            <span className="italic text-green">{t(lang, 'terr_accent')}</span>
          </h2>
          <div className="h-1 w-16 bg-gold mb-8 rounded-full" />
          <p className="text-charcoal/70 leading-relaxed mb-6 font-light text-base md:text-lg">
            {t(lang, 'terr_p1')}
          </p>
          <p className="text-charcoal/50 leading-relaxed mb-8 font-light text-sm">
            {t(lang, 'terr_p2')}
          </p>
          
          <div className="flex items-center gap-4">
            <Link
              href="/terrasse"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-green text-charcoal text-xs tracking-widest uppercase font-bold rounded-lg
                         hover:bg-green-light transition-all duration-300 shadow-sm"
            >
              <Camera size={14} />
              {fr ? 'Découvrir la terrasse & Photos' : 'Explore Terrace & Photos'}
            </Link>
          </div>
        </div>

        {/* Terrace Visual & Features */}
        <div className="space-y-4">
          <div className="relative h-64 md:h-72 rounded-2xl overflow-hidden shadow-md group">
            <Image
              src={TERRASSE_PHOTOS.hero}
              alt="Terrasse Panoramique Résidence Juweirat"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gold-light">Rooftop 6ème Étage</p>
                <p className="text-sm font-semibold">Vue panoramique sur toute la ville de Lomé</p>
              </div>
              <span className="text-[11px] bg-white/20 backdrop-blur-md px-3 py-1 rounded-full font-medium">
                Privatisable
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {features.map(({ icon: Icon, titleKey, descKey }) => (
              <div
                key={titleKey}
                className="bg-surface p-4 rounded-xl border border-gray-100 flex flex-col items-center text-center hover:bg-surface-alt transition-colors duration-300 group"
              >
                <div className="w-9 h-9 rounded-lg bg-green/10 flex items-center justify-center mb-2 text-green
                                group-hover:bg-green group-hover:text-charcoal transition-all duration-300">
                  <Icon size={16} />
                </div>
                <h3 className="text-charcoal font-bold text-xs mb-1">{t(lang, titleKey)}</h3>
                <p className="text-gray-400 text-[11px] font-light leading-snug line-clamp-2">{t(lang, descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
