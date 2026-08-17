import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { CalendarCheck, Users, Sunset, Phone, Sparkles, Camera, MapPin, Wine } from 'lucide-react'
import { getLang } from '@/lib/lang'
import { t } from '@/lib/i18n'
import { TERRASSE_PHOTOS } from '@/lib/categoryPhotos'

export const metadata: Metadata = {
  title: 'La Terrasse Panoramique (6ème étage) — Résidence Juweirat Lomé',
  description: 'Terrasse panoramique au 6ème étage de la Résidence Juweirat à Lomé. Vue imprenable sur la ville, disponible pour réceptions et événements privés.',
}

export default async function TerrassePage() {
  const lang = await getLang()
  const fr = lang === 'fr'

  const features = [
    { icon: Sunset,        titleFr: 'Vue Panoramique sur Lomé', titleEn: 'Panoramic View of Lomé', descFr: 'Panorama dégagé à 360° depuis le 6ème étage avec une vue spectaculaire sur la ville et ses couchers de soleil.', descEn: 'Open 360° panorama from the 6th floor with spectacular views over the city and sunset.' },
    { icon: Users,         titleFr: 'Capacité Évènementielle Flexible', titleEn: 'Flexible Event Capacity', descFr: 'Espace spacieux et adaptable à vos projets : réceptions privées, cocktails dînatoires, anniversaires et séminaires.', descEn: 'Spacious space adaptable to your needs: private receptions, cocktail dinners, anniversaries and corporate events.' },
    { icon: CalendarCheck, titleFr: 'Privatisation sur Réservation',   titleEn: 'Private Reservation',    descFr: 'Mise à disposition exclusive organisée directement avec notre conciergerie selon votre planning.', descEn: 'Exclusive access organized directly with our concierge team according to your schedule.' },
  ]

  const occasions = [
    fr ? 'Cocktails dînatoires' : 'Cocktail Receptions',
    fr ? 'Anniversaires & Célébrations' : 'Birthdays & Celebrations',
    fr ? 'Soirées d\'entreprises & Afterworks' : 'Corporate Afterworks',
    fr ? 'Shooting photo & Tournages' : 'Photo Shoots & Video',
    fr ? 'Dîners privés sous les étoiles' : 'Private Dinners under the stars',
    fr ? 'Séminaires & Réunions de direction' : 'Executive Seminars',
  ]

  const galleryImages = TERRASSE_PHOTOS.gallery

  return (
    <div className="pt-20 bg-[#FAFAFA] min-h-screen">
      
      {/* ── HERO BANNER AVEC PHOTO DE LA TERRASSE ── */}
      <section className="relative h-[420px] md:h-[500px] flex items-center justify-center overflow-hidden">
        <Image
          src={TERRASSE_PHOTOS.hero}
          alt="Terrasse Panoramique Résidence Juweirat 6ème étage"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-black/40" />

        <div className="relative text-center px-6 max-w-4xl mx-auto text-white space-y-4">
          <div className="inline-flex items-center gap-2 bg-gold/80 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-white shadow-sm">
            <Sparkles size={14} />
            {fr ? '6ème Étage · Rooftop d\'Exception' : '6th Floor · Luxury Rooftop'}
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-light">
            La <span className="italic text-green-light">Terrasse</span> Panoramique
          </h1>
          <p className="text-white/80 font-light text-base md:text-xl max-w-2xl mx-auto leading-relaxed">
            {fr 
              ? 'Un espace exclusif suspendu au-dessus de Lomé pour des moments inoubliables et des réceptions privées.'
              : 'An exclusive rooftop space suspended over Lomé for unforgettable moments and private receptions.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/contact"
              className="bg-green text-charcoal font-bold px-6 py-3 rounded-lg text-xs uppercase tracking-wider hover:bg-green-light transition-colors shadow-md"
            >
              {fr ? 'Demander une privatisation' : 'Book a private event'}
            </Link>
          </div>
        </div>
      </section>

      {/* ── GALERIE PHOTOS DE LA TERRASSE ── */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-green text-xs tracking-[0.3em] uppercase font-bold mb-1">
              {fr ? 'Visite Visuelle' : 'Visual Tour'}
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-light text-charcoal flex items-center gap-2">
              <Camera size={26} className="text-gold" />
              {fr ? 'Galerie Photos du 6ème Étage' : '6th Floor Photo Gallery'}
            </h2>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {galleryImages.length} {fr ? 'clichés haute définition' : 'high-resolution views'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {galleryImages.map((src, i) => (
            <div key={i} className="relative h-52 sm:h-64 rounded-xl overflow-hidden shadow-xs border border-gray-200 group bg-gray-100">
              <Image
                src={src}
                alt={`Terrasse panoramique Juweirat ${i + 1}`}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            </div>
          ))}
        </div>
      </section>

      {/* ── PRÉSENTATION & PRESTATIONS ── */}
      <section className="bg-white py-16 px-6 border-y border-gray-100">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="h-1 w-16 bg-gold mx-auto rounded-full" />
          <h2 className="font-display text-3xl md:text-4xl font-light text-charcoal">
            {fr ? 'Un cadre prestigieux au cœur de la capitale' : 'A prestigious setting in the heart of Lomé'}
          </h2>
          <p className="text-charcoal/70 text-base md:text-lg leading-relaxed font-light">
            {fr
              ? 'Niché au dernier étage de la Résidence Juweirat, notre rooftop offre un cadre exceptionnel combinant brise agréable, mobilier lounge et vue imprenable sur les toits de Lomé. Que ce soit pour un cocktail au coucher du soleil ou un dîner sous les étoiles, nous adaptons la configuration à votre évènement.'
              : 'Perched on the top floor of Résidence Juweirat, our rooftop offers an extraordinary setting combining a pleasant breeze, lounge furniture and breathtaking views over Lomé.'}
          </p>
        </div>
      </section>

      {/* ── CARACTÉRISTIQUES ── */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, titleFr, titleEn, descFr, descEn }) => (
            <div key={titleFr} className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center space-y-4 hover:border-green/40 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-green/10 flex items-center justify-center text-green">
                <Icon size={26} />
              </div>
              <h3 className="font-bold text-lg text-charcoal">{fr ? titleFr : titleEn}</h3>
              <p className="text-charcoal/60 text-sm font-light leading-relaxed">{fr ? descFr : descEn}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── OCCASIONS ── */}
      <section className="bg-white py-16 px-6 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-gold text-xs tracking-[0.3em] uppercase font-bold mb-2">{fr ? 'ÉVÈNEMENTS' : 'EVENTS'}</p>
            <h2 className="font-display text-3xl md:text-4xl font-light text-charcoal">
              {fr ? 'Idéal pour toutes vos célébrations' : 'Ideal for all your celebrations'}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {occasions.map((o, idx) => (
              <div
                key={idx}
                className="bg-surface border border-gray-100 rounded-xl py-5 px-6 text-center text-charcoal font-medium text-sm hover:border-gold/40 hover:bg-gold/5 transition-all shadow-2xs"
              >
                {o}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA CONTACT & RÉSERVATION ── */}
      <section className="bg-surface py-20 px-6 border-t border-gray-200">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="font-display text-4xl font-light text-charcoal">
            {fr ? 'Organisez votre évènement sur la terrasse' : 'Organize your event on our rooftop'}
          </h2>
          <p className="text-charcoal/60 font-light text-sm">
            {fr
              ? 'Notre équipe de conciergerie est à votre écoute pour organiser votre évènement sur mesure.'
              : 'Our concierge team is at your disposal to tailor your private event.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/contact"
              className="px-8 py-3.5 bg-green text-charcoal text-xs tracking-widest uppercase font-bold rounded-xl
                         hover:bg-green-light transition-colors duration-300 min-w-[220px] text-center shadow-sm"
            >
              {fr ? 'Contacter l\'équipe' : 'Contact team'}
            </Link>
            <a
              href="https://wa.me/22890000000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-3.5 bg-white border border-gray-200 text-charcoal text-xs tracking-widest uppercase font-bold rounded-xl
                         hover:border-green hover:text-green transition-colors duration-300 min-w-[220px] justify-center shadow-2xs"
            >
              <Phone size={14} />
              WhatsApp Direct
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
