import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, Users, ArrowLeft } from 'lucide-react'
import { getLang } from '@/lib/lang'
import { getCategoryBySlug } from '@/lib/api'
import CategoryBookingForm from '@/components/CategoryBookingForm'

interface Props {
  params:       Promise<{ slug: string }>
  searchParams: Promise<{ checkIn?: string; checkOut?: string; adults?: string; children?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const cat = await getCategoryBySlug(slug)
  if (!cat) return { title: 'Réservation — Résidence Juweirat' }
  return { title: `Réserver ${cat.nameFr} — Résidence Juweirat` }
}

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }

export default async function CategoryBookingPage({ params, searchParams }: Props) {
  const { slug }                                                                                    = await params
  const { checkIn: queryCheckIn = '', checkOut: queryCheckOut = '', adults = '1', children = '0' } = await searchParams
  const [lang, cat]                                                                                 = await Promise.all([getLang(), getCategoryBySlug(slug)])

  if (!cat) notFound()

  const fr = lang === 'fr'
  const today = toDateStr(new Date())
  const tomorrow = toDateStr(new Date(Date.now() + 86400000))
  const checkIn = queryCheckIn && queryCheckIn >= today ? queryCheckIn : today
  const checkOut = queryCheckOut && queryCheckOut > checkIn ? queryCheckOut : (queryCheckIn ? toDateStr(new Date(new Date(checkIn).getTime() + 86400000)) : tomorrow)

  return (
    <div className="pt-20 bg-[#FAFAFA] min-h-screen">

      {/* Back */}
      <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-8 pb-4">
        <Link
          href={`/categories/${slug}`}
          className="inline-flex items-center gap-2 text-charcoal/40 hover:text-green text-sm font-light tracking-widest uppercase transition-colors duration-300"
        >
          <ArrowLeft size={14} />
          {fr ? 'Retour à la catégorie' : 'Back to category'}
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-10 pb-24">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-light text-charcoal">
            {fr ? 'Finaliser votre ' : 'Complete your '}
            <span className="italic text-green">{fr ? 'réservation' : 'booking'}</span>
          </h1>
        </div>

        <CategoryBookingForm
          categoryId={cat.id}
          categorySlug={slug}
          categoryName={fr ? cat.nameFr : cat.nameEn}
          pmsType={cat.pmsType}
          pmsGamme={cat.pmsGamme}
          lang={lang}
          checkIn={checkIn}
          checkOut={checkOut}
          adults={parseInt(adults) || 1}
          children={parseInt(children) || 0}
          tarifNuit={cat.tarifNuit}
          tarifN15={cat.tarifN15}
          tarifN30={cat.tarifN30}
        />
      </div>
    </div>
  )
}
