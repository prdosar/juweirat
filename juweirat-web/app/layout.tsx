import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CalixiaWidget from '@/components/CalixiaWidget'
import { getLang } from '@/lib/lang'

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://juweirat.com'),
  title: 'Résidence Juweirat — Appartements à Lomé, Togo',
  description:
    'Résidence Juweirat — 18 appartements meublés haut de gamme à Lomé, Togo. Séjours courts et longs pour voyageurs internationaux. Terrasse événementielle, parking sécurisé.',
  keywords: 'appartements Lomé, résidence Togo, location courte durée Lomé, Juweirat, hébergement Lomé',
  icons: {
    icon: '/img/logo.png',
    apple: '/img/logo.png',
  },
  openGraph: {
    title: 'Résidence Juweirat — Lomé, Togo',
    description: '18 appartements meublés haut de gamme à Lomé',
    type: 'website',
    url: 'https://juweirat.com',
    siteName: 'Résidence Juweirat',
    images: [{ url: '/img/logo.png', width: 512, height: 512 }],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang()

  return (
    <html lang={lang} className={`${cormorant.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#FAFAFA] text-charcoal">
        <Navbar lang={lang} />
        <main className="flex-1">{children}</main>
        <Footer lang={lang} />
        <CalixiaWidget lang={lang} />
      </body>
    </html>
  )
}
