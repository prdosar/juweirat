'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, ChevronDown } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'

interface Props { lang: Lang }

export default function Navbar({ lang }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen]         = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const langRef                 = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router   = useRouter()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('mousedown', onOut)
    return () => document.removeEventListener('mousedown', onOut)
  }, [])

  function switchLang(l: Lang) {
    document.cookie = `juweirat_lang=${l}; path=/; max-age=31536000`
    router.refresh()
  }

  const links = [
    { href: '/',             label: t(lang, 'nav_home') },
    { href: '/appartements', label: t(lang, 'nav_apartments') },
    { href: '/terrasse',     label: t(lang, 'nav_terrace') },
    { href: '/contact',      label: t(lang, 'nav_contact') },
  ]

  const isHome = pathname === '/'
  // solid = scrolled on home, or on any non-home page
  const solid  = scrolled || !isHome

  // On solid nav: white bg, dark text. Transparent: dark, white text.
  const navBg    = solid ? 'bg-white/95 backdrop-blur-md shadow-sm shadow-black/8 border-b border-charcoal/5' : 'bg-transparent'
  const linkBase = solid ? 'text-charcoal/70 hover:text-charcoal' : 'text-white/80 hover:text-white'
  const linkActive = 'text-green'

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${navBg}`}>
      <nav className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/img/logo.png"
            alt="Résidence Juweirat"
            width={160}
            height={63}
            className="h-12 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {links.map(({ href, label }) => {
            const active = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`relative text-sm tracking-widest uppercase font-light transition-colors duration-300 pb-1 ${
                    active ? linkActive : linkBase
                  }`}
                >
                  {label}
                  {active && <span className="absolute bottom-0 left-0 right-0 h-px bg-green" />}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Right: Book CTA + Lang dropdown + Mobile toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('open-calixia', { detail: { context: 'booking' } }))}
            className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 border border-green text-green text-xs tracking-widest uppercase font-medium
                       hover:bg-green hover:text-charcoal transition-all duration-300"
          >
            {t(lang, 'nav_book')}
          </button>

          {/* Lang dropdown */}
          <div ref={langRef} className="relative hidden md:block">
            <button
              onClick={() => setLangOpen(v => !v)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors duration-200 ${
                solid ? 'hover:bg-charcoal/5' : 'hover:bg-white/10'
              }`}
            >
              <div className="relative w-6 h-6 rounded-full overflow-hidden border border-charcoal/15">
                <Image src={`/images/language/icon_${lang}.png`} alt={lang} fill className="object-cover" sizes="24px" />
              </div>
              <span className={`text-xs font-medium tracking-widest uppercase transition-colors ${solid ? 'text-charcoal/60' : 'text-white/70'}`}>
                {lang.toUpperCase()}
              </span>
              <ChevronDown size={12} className={`transition-all duration-200 ${langOpen ? 'rotate-180' : ''} ${solid ? 'text-charcoal/40' : 'text-white/40'}`} />
            </button>

            {langOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-charcoal/10 shadow-lg shadow-black/8 min-w-[130px] z-50">
                {(['fr', 'en'] as Lang[]).map(l => (
                  <button
                    key={l}
                    onClick={() => { switchLang(l); setLangOpen(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-xs tracking-widest uppercase font-light transition-colors duration-200 ${
                      lang === l ? 'text-green bg-green/8' : 'text-charcoal/60 hover:text-charcoal hover:bg-charcoal/4'
                    }`}
                  >
                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-charcoal/15 shrink-0">
                      <Image src={`/images/language/icon_${l}.png`} alt={l} fill className="object-cover" sizes="24px" />
                    </div>
                    {l === 'fr' ? 'Français' : 'English'}
                    {lang === l && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setOpen(!open)}
            className={`md:hidden p-1 transition-colors ${solid ? 'text-charcoal/70 hover:text-charcoal' : 'text-white/80 hover:text-white'}`}
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu — always white bg */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 bg-white border-b border-charcoal/8 ${open ? 'max-h-[30rem]' : 'max-h-0'}`}>
        <ul className="px-6 py-6 flex flex-col gap-5">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className={`text-sm tracking-widest uppercase font-light ${pathname === href ? 'text-green' : 'text-charcoal/70'}`}
              >
                {label}
              </Link>
            </li>
          ))}
          <li>
            <button
              onClick={() => { setOpen(false); document.dispatchEvent(new CustomEvent('open-calixia', { detail: { context: 'booking' } })) }}
              className="inline-block px-5 py-2.5 border border-green text-green text-xs tracking-widest uppercase font-medium"
            >
              {t(lang, 'nav_book')}
            </button>
          </li>
          <li className="border-t border-charcoal/8 pt-4">
            <p className="text-charcoal/30 text-[10px] tracking-widest uppercase font-light mb-3">
              {lang === 'fr' ? 'Langue' : 'Language'}
            </p>
            <div className="flex flex-col gap-1">
              {(['fr', 'en'] as Lang[]).map(l => (
                <button key={l} onClick={() => { switchLang(l); setOpen(false) }}
                  className={`flex items-center gap-3 px-3 py-2.5 text-xs tracking-widest uppercase font-light transition-colors ${
                    lang === l ? 'text-green bg-green/8' : 'text-charcoal/50 hover:text-charcoal hover:bg-charcoal/4'
                  }`}
                >
                  <div className="relative w-6 h-6 rounded-full overflow-hidden border border-charcoal/15 shrink-0">
                    <Image src={`/images/language/icon_${l}.png`} alt={l} fill className="object-cover" sizes="24px" />
                  </div>
                  {l === 'fr' ? 'Français' : 'English'}
                  {lang === l && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green" />}
                </button>
              ))}
            </div>
          </li>
        </ul>
      </div>
    </header>
  )
}
