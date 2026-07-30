import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarCheck, Users, Sunset, Phone } from 'lucide-react'
import { getLang } from '@/lib/lang'
import { t } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'La Terrasse — Résidence Juweirat Lomé',
  description: 'Terrasse panoramique au 6ème étage de la Résidence Juweirat à Lomé. Disponible pour réceptions et événements privés sur réservation.',
}

export default async function TerrassePage() {
  const lang = await getLang()

  const features = [
    { icon: Sunset,        titleFr: 'Vue sur Lomé',      titleEn: 'View of Lomé',     descFr: 'Panorama dégagé depuis le 6ème étage avec vue sur la ville de Lomé.', descEn: 'Open panorama from the 6th floor with views over the city of Lomé.' },
    { icon: Users,         titleFr: 'Capacité flexible', titleEn: 'Flexible Capacity', descFr: 'Espace adaptable à vos besoins, des petites réunions aux grandes réceptions.', descEn: 'Space adaptable to your needs, from small meetings to large receptions.' },
    { icon: CalendarCheck, titleFr: 'Sur réservation',   titleEn: 'By reservation',    descFr: 'Disponibilité organisée directement avec notre équipe, selon votre calendrier.', descEn: 'Availability arranged directly with our team, according to your schedule.' },
  ]

  const occasions = t(lang, 'tp_occasions_list').split(',')

  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="relative h-72 md:h-96 flex items-center justify-center overflow-hidden bg-surface">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #3DC720 0%, transparent 70%)' }}
        />
        <div className="relative text-center px-6">
          <p className="text-green text-xs tracking-[0.4em] uppercase font-light mb-4">{t(lang, 'tp_label')}</p>
          <h1 className="font-display text-5xl md:text-7xl font-light text-charcoal">
            La <span className="italic text-green">Terrasse</span>
          </h1>
          <p className="text-charcoal/50 mt-4 font-light text-lg">{t(lang, 'tp_sub')}</p>
        </div>
      </section>

      {/* Description */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="h-px w-16 bg-green mx-auto mb-10" />
          <p className="text-charcoal/70 text-lg leading-relaxed font-light mb-6">
            {t(lang, 'tp_p1')}
          </p>
          <p className="text-charcoal/40 leading-relaxed font-light">
            {t(lang, 'tp_p2_a')}<span className="text-green">{t(lang, 'tp_p2_b')}</span>{t(lang, 'tp_p2_c')}
          </p>
          <div className="h-px w-16 bg-green mx-auto mt-10" />
        </div>
      </section>

      {/* Features */}
      <section className="bg-surface py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-px bg-charcoal/5">
          {features.map(({ icon: Icon, titleFr, titleEn, descFr, descEn }) => {
            const title = lang === 'en' ? titleEn : titleFr
            const desc  = lang === 'en' ? descEn  : descFr
            return (
              <div key={titleFr} className="bg-surface p-10 flex flex-col items-center text-center group hover:bg-surface-alt transition-colors duration-300">
                <div className="w-14 h-14 border border-green/30 flex items-center justify-center mb-6
                                group-hover:border-green group-hover:bg-green/10 transition-all duration-300">
                  <Icon size={22} className="text-green" />
                </div>
                <h3 className="text-charcoal font-medium text-lg mb-3">{title}</h3>
                <p className="text-charcoal/40 text-sm font-light leading-relaxed">{desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Occasions */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-green text-xs tracking-[0.4em] uppercase font-light mb-4">{t(lang, 'tp_ideal')}</p>
            <h2 className="font-display text-4xl font-light text-charcoal">
              {t(lang, 'tp_occasions')}<span className="italic text-green">{t(lang, 'tp_occ_accent')}</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-charcoal/5">
            {occasions.map(o => (
              <div
                key={o}
                className="bg-white py-6 px-8 text-center text-charcoal/60 text-sm font-light
                           hover:bg-surface hover:text-green transition-all duration-300"
              >
                {o}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface py-20 px-6 border-t border-charcoal/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl font-light text-charcoal mb-4">
            {t(lang, 'tp_organize')}<span className="italic text-green">{t(lang, 'tp_org_accent')}</span>
          </h2>
          <p className="text-charcoal/40 font-light mb-10">{t(lang, 'tp_org_sub')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="px-8 py-3.5 bg-green text-charcoal text-xs tracking-widest uppercase font-semibold
                         hover:bg-green-light transition-colors duration-300 min-w-[200px] text-center"
            >
              {t(lang, 'tp_book')}
            </Link>
            <a
              href="https://wa.me/22890000000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-3.5 border border-charcoal/20 text-charcoal/70 text-xs tracking-widest uppercase font-light
                         hover:border-green hover:text-green transition-colors duration-300 min-w-[200px] justify-center"
            >
              <Phone size={12} />
              WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

