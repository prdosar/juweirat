import Hero              from '@/components/Hero'
import About             from '@/components/About'
import ApartmentsPreview from '@/components/ApartmentsPreview'
import Amenities         from '@/components/Amenities'
import Gallery           from '@/components/Gallery'
import TerrasseSection   from '@/components/TerrasseSection'
import ContactSection    from '@/components/ContactSection'
import { getLang }       from '@/lib/lang'

export default async function Home() {
  const lang = await getLang()

  return (
    <>
      <Hero lang={lang} />
      <About />
      <ApartmentsPreview />
      <Amenities />
      <Gallery lang={lang} limit={9} showViewAll />
      <TerrasseSection />
      <ContactSection />
    </>
  )
}
