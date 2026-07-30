import Link from 'next/link'
import { CalendarCheck, Users, Sunset } from 'lucide-react'
import { getLang } from '@/lib/lang'
import { t } from '@/lib/i18n'

export default async function TerrasseSection() {
  const lang = await getLang()

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

      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">

        {/* Text */}
        <div>
          <p className="text-green text-xs tracking-[0.4em] uppercase font-light mb-5">
            {t(lang, 'terr_label')}
          </p>
          <h2 className="font-display text-5xl md:text-6xl font-light text-charcoal leading-tight mb-6">
            {t(lang, 'terr_heading')}
            <br />
            <span className="italic text-green">{t(lang, 'terr_accent')}</span>
          </h2>
          <div className="h-px w-16 bg-green mb-8" />
          <p className="text-charcoal/60 leading-relaxed mb-6 font-light text-lg">
            {t(lang, 'terr_p1')}
          </p>
          <p className="text-charcoal/40 leading-relaxed mb-10 font-light">
            {t(lang, 'terr_p2')}
          </p>
          <Link
            href="/terrasse"
            className="inline-block px-8 py-3.5 border border-green text-green text-xs tracking-widest uppercase font-medium
                       hover:bg-green hover:text-charcoal transition-all duration-300"
          >
            {t(lang, 'terr_cta')}
          </Link>
        </div>

        {/* Feature cards */}
        <div className="grid gap-px bg-charcoal/5">
          {features.map(({ icon: Icon, titleKey, descKey }) => (
            <div
              key={titleKey}
              className="bg-surface p-8 flex gap-6 items-start hover:bg-surface-alt transition-colors duration-300 group"
            >
              <div className="w-10 h-10 border border-green/30 flex items-center justify-center shrink-0
                              group-hover:border-green group-hover:bg-green/10 transition-all duration-300">
                <Icon size={18} className="text-green" />
              </div>
              <div>
                <h3 className="text-charcoal font-medium mb-2">{t(lang, titleKey)}</h3>
                <p className="text-charcoal/40 text-sm font-light leading-relaxed">{t(lang, descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

