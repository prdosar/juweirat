import type { Metadata } from 'next'
import ContactForm from './ContactForm'
import { Phone, Mail, MapPin } from 'lucide-react'
import { getLang } from '@/lib/lang'
import { t } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Contact — Résidence Juweirat Lomé',
  description: 'Contactez la Résidence Juweirat à Lomé, Togo. Réservations, demandes d\'information et location de la terrasse.',
}

export default async function ContactPage() {
  const lang = await getLang()

  const contacts = [
    { icon: Phone,  label: 'WhatsApp',                      value: '+228 90 00 00 00',    href: 'https://wa.me/22890000000' },
    { icon: Mail,   label: 'Email',                          value: 'contact@juweirat.com', href: 'mailto:contact@juweirat.com' },
    { icon: MapPin, label: lang === 'en' ? 'Address' : 'Adresse', value: '376, Bd. de la Kara · Gbossimé · Lomé, Togo', href: '#' },
  ]

  const hours = lang === 'en'
    ? [['Monday – Friday', '7am – 10pm'], ['Saturday – Sunday', '8am – 8pm']]
    : [['Lundi – Vendredi', '7h00 – 22h00'], ['Samedi – Dimanche', '8h00 – 20h00']]

  return (
    <div className="pt-20">
      {/* Header */}
      <section className="bg-surface py-20 px-6 border-b border-charcoal/5">
        <div className="max-w-7xl mx-auto">
          <p className="text-green text-xs tracking-[0.4em] uppercase font-light mb-4">{t(lang, 'cp_label')}</p>
          <h1 className="font-display text-4xl md:text-6xl font-light text-charcoal">
            {t(lang, 'cp_heading')}<span className="italic text-green">{t(lang, 'cp_accent')}</span>
          </h1>
          <p className="text-charcoal/50 mt-4 font-light max-w-xl">{t(lang, 'cp_sub')}</p>
        </div>
      </section>

      <section className="bg-white py-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16">

          {/* Contact info */}
          <div>
            <h2 className="font-display text-3xl font-light text-charcoal mb-8">
              {t(lang, 'cp_info')}<span className="italic text-green">{t(lang, 'cp_info_accent')}</span>
            </h2>

            <div className="space-y-px mb-12">
              {contacts.map(({ icon: Icon, label, value, href }) => (
                <a
                  key={label}
                  href={href}
                  className="flex items-center gap-6 p-6 bg-surface hover:bg-surface-alt transition-colors duration-300 group"
                >
                  <div className="w-10 h-10 border border-green/30 flex items-center justify-center shrink-0
                                  group-hover:border-green group-hover:bg-green/10 transition-all duration-300">
                    <Icon size={16} className="text-green" />
                  </div>
                  <div>
                    <p className="text-green text-xs tracking-widest uppercase font-light mb-1">{label}</p>
                    <p className="text-charcoal/70 font-light">{value}</p>
                  </div>
                </a>
              ))}
            </div>

            {/* Address detail */}
            <div className="border border-charcoal/10 p-6 mb-6">
              <p className="text-green text-xs tracking-widest uppercase font-light mb-3">{t(lang, 'cp_location')}</p>
              <p className="text-charcoal/60 text-sm font-light leading-relaxed">
                376, Boulevard de la Kara<br />
                {lang === 'en' ? 'Near Gbossimé market' : 'Non loin du marché Gbossimé'}<br />
                08 BP 80859 · Lomé, Togo
              </p>
            </div>

            {/* Hours */}
            <div className="border border-charcoal/10 p-6">
              <p className="text-green text-xs tracking-widest uppercase font-light mb-4">{t(lang, 'cp_hours')}</p>
              <div className="space-y-2 text-sm font-light">
                {hours.map(([day, h]) => (
                  <div key={day} className="flex justify-between">
                    <span className="text-charcoal/50">{day}</span>
                    <span className="text-charcoal/80">{h}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-charcoal/50">{t(lang, 'cp_emergency')}</span>
                  <span className="text-green">{t(lang, 'cp_emergency_val')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form (client component) */}
          <ContactForm lang={lang} />
        </div>
      </section>
    </div>
  )
}

