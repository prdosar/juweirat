import Link from 'next/link'
import Image from 'next/image'
import { getLang } from '@/lib/lang'
import { t, type Lang } from '@/lib/i18n'

function getLinks(lang: Lang) {
  return [
    { href: '/',             label: t(lang, 'nav_home') },
    { href: '/appartements', label: t(lang, 'nav_apartments') },
    { href: '/terrasse',     label: t(lang, 'nav_terrace') },
    { href: '/contact',      label: t(lang, 'nav_contact') },
  ]
}

interface Props {
  lang: Lang
}

export default async function Footer({ lang }: Props) {
  const resolvedLang = lang ?? await getLang()
  const links = getLinks(resolvedLang)

  return (
    <footer className="bg-charcoal border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="grid md:grid-cols-3 gap-12 mb-12">

          {/* Brand */}
          <div>
            <div className="mb-5">
              <Image
                src="/img/logo.png"
                alt="Résidence Juweirat"
                width={160}
                height={63}
                className="h-12 w-auto object-contain"
              />
            </div>
            <p className="text-white/40 text-sm font-light leading-relaxed max-w-xs">
              {resolvedLang === 'en'
                ? '18 premium furnished apartments in Lomé, Togo. Your exceptional address in West Africa.'
                : '18 appartements meublés haut de gamme à Lomé, Togo. Votre adresse d\'exception en Afrique de l\'Ouest.'}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-green text-xs tracking-[0.3em] uppercase font-light mb-6">
              {t(resolvedLang, 'footer_nav')}
            </p>
            <ul className="space-y-3">
              {links.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-white/50 text-sm font-light hover:text-green transition-colors duration-300"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-green text-xs tracking-[0.3em] uppercase font-light mb-6">
              {t(resolvedLang, 'footer_contact')}
            </p>
            <ul className="space-y-3 text-white/50 text-sm font-light">
              <li>
                <a href="https://wa.me/22870790889" className="hover:text-green transition-colors duration-300">
                  +228 70 79 08 89
                </a>
              </li>
              <li>
                <a href="mailto:contact@juweirat.com" className="hover:text-green transition-colors duration-300">
                  contact@juweirat.com
                </a>
              </li>
              <li>376, Bd. de la Kara, Gbossimé<br />Lomé, Togo</li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 mb-6" />

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-white/25 text-xs font-light">
          <p>&copy; {new Date().getFullYear()} Résidence Juweirat. {t(resolvedLang, 'footer_rights')}</p>
          <p>
            {t(resolvedLang, 'footer_by')}{' '}
            <span className="text-green/60">Simplex Tech</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
