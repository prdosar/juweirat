import { Phone, Mail, MapPin } from 'lucide-react'
import Link from 'next/link'
import { getLang } from '@/lib/lang'
import { t } from '@/lib/i18n'

export default async function ContactSection() {
  const lang = await getLang()

  const contacts = [
    { icon: Phone,  labelFr: 'WhatsApp',  labelEn: 'WhatsApp',  value: '+228 90 00 00 00',    href: 'https://wa.me/22890000000' },
    { icon: Mail,   labelFr: 'Email',     labelEn: 'Email',     value: 'contact@juweirat.com', href: 'mailto:contact@juweirat.com' },
    { icon: MapPin, labelFr: 'Adresse',   labelEn: 'Address',   value: '376, Bd. de la Kara · Gbossimé · Lomé', href: '/contact' },
  ]

  return (
    <section className="bg-surface py-24 lg:py-32 px-6">
      <div className="max-w-4xl mx-auto text-center">

        <p className="text-green text-xs tracking-[0.4em] uppercase font-light mb-5">
          {t(lang, 'cs_label')}
        </p>
        <h2 className="font-display text-4xl md:text-6xl font-light text-charcoal mb-6">
          {t(lang, 'cs_heading')}
          <span className="italic text-green">{t(lang, 'cs_accent')}</span>
        </h2>
        <p className="text-charcoal/50 font-light mb-12 text-lg max-w-xl mx-auto">
          {t(lang, 'cs_sub')}
        </p>

        {/* Contact methods */}
        <div className="grid md:grid-cols-3 gap-px bg-charcoal/5 mb-12">
          {contacts.map(({ icon: Icon, labelFr, labelEn, value, href }) => (
            <a
              key={href}
              href={href}
              className="bg-white py-8 px-6 flex flex-col items-center gap-4 hover:bg-surface-alt transition-colors duration-300 group"
            >
              <div className="w-10 h-10 border border-green/30 flex items-center justify-center
                              group-hover:border-green group-hover:bg-green/10 transition-all duration-300">
                <Icon size={18} className="text-green" />
              </div>
              <div>
                <p className="text-green text-xs tracking-widest uppercase font-light mb-1">
                  {lang === 'en' ? labelEn : labelFr}
                </p>
                <p className="text-charcoal/70 text-sm font-light">{value}</p>
              </div>
            </a>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/contact"
            className="px-8 py-3.5 bg-green text-charcoal text-xs tracking-widest uppercase font-semibold
                       hover:bg-green-light transition-colors duration-300 min-w-[200px] text-center"
          >
            {t(lang, 'cs_cta')}
          </Link>
          <a
            href="https://wa.me/22890000000"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 border border-charcoal/20 text-charcoal/70 text-xs tracking-widest uppercase font-light
                       hover:border-green hover:text-green transition-colors duration-300 min-w-[200px] text-center"
          >
            {t(lang, 'cs_whatsapp')}
          </a>
        </div>
      </div>
    </section>
  )
}

