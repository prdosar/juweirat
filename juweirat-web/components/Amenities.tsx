import { Wifi, Wind, Tv, UtensilsCrossed, Car, Shield, Droplets, Star } from 'lucide-react'
import { getLang } from '@/lib/lang'
import { t } from '@/lib/i18n'

const amenityIcons = [
  { icon: Wifi,            nameFr: 'Wi-Fi Haut Débit',       nameEn: 'High-Speed Wi-Fi',     descFr: 'Connexion incluse',              descEn: 'Included connection' },
  { icon: Wind,            nameFr: 'Climatisation',           nameEn: 'Air Conditioning',      descFr: 'Sharp — toutes pièces',          descEn: 'Sharp — all rooms' },
  { icon: Tv,              nameFr: 'Télévision',              nameEn: 'Television',            descFr: 'Écran plat HD',                  descEn: 'HD flat screen' },
  { icon: UtensilsCrossed, nameFr: 'Cuisine équipée',         nameEn: 'Equipped Kitchen',      descFr: 'Réfrigérateur, micro-ondes',     descEn: 'Refrigerator, microwave' },
  { icon: Car,             nameFr: 'Parking privé',           nameEn: 'Private Parking',       descFr: 'Sous-sol sécurisé',              descEn: 'Secure basement' },
  { icon: Shield,          nameFr: 'Sécurité 24h/24',        nameEn: '24h Security',          descFr: 'Surveillance continue',          descEn: 'Continuous surveillance' },
  { icon: Droplets,        nameFr: 'Eau chaude',              nameEn: 'Hot Water',             descFr: 'Disponible en continu',          descEn: 'Available continuously' },
  { icon: Star,            nameFr: 'Terrasse événementielle', nameEn: 'Event Terrace',         descFr: '6ème étage sur réservation',    descEn: '6th floor by reservation' },
]

export default async function Amenities() {
  const lang = await getLang()

  return (
    <section className="bg-white py-24 lg:py-32 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-green text-xs tracking-[0.4em] uppercase font-light mb-4">
            {t(lang, 'amen_label')}
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-light text-charcoal">
            {t(lang, 'amen_heading')}
            <span className="italic text-green">{t(lang, 'amen_accent')}</span>
          </h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-charcoal/5">
          {amenityIcons.map(({ icon: Icon, nameFr, nameEn, descFr, descEn }) => {
            const label = lang === 'en' ? nameEn : nameFr
            const desc  = lang === 'en' ? descEn  : descFr
            return (
              <div
                key={nameFr}
                className="bg-white p-8 flex flex-col items-center text-center group
                           hover:bg-surface transition-colors duration-300"
              >
                <div className="w-12 h-12 border border-green/30 flex items-center justify-center mb-5
                                group-hover:border-green group-hover:bg-green/10 transition-all duration-300">
                  <Icon size={20} className="text-green" />
                </div>
                <h3 className="text-charcoal text-sm font-medium tracking-wide mb-2">{label}</h3>
                <p className="text-charcoal/40 text-xs font-light">{desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

