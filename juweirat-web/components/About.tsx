import { getLang } from '@/lib/lang'
import { t } from '@/lib/i18n'

const stats = [
  { value: '18',  key: 'stats_apartments' as const },
  { value: '4',   key: 'stats_floors' as const },
  { value: '1',   key: 'stats_terrace' as const },
  { value: '24h', key: 'stats_security' as const },
]

export default async function About() {
  const lang = await getLang()

  const floors = [
    { key: 'floor_basement', descKey: 'floor_basement_desc' },
    { key: 'floor_2',        descKey: 'floor_2_desc' },
    { key: 'floor_4',        descKey: 'floor_4_desc' },
    { key: 'floor_5',        descKey: 'floor_5_desc' },
    { key: 'floor_6',        descKey: 'floor_6_desc' },
  ] as const

  return (
    <section className="bg-white py-24 lg:py-32 px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

        {/* Text */}
        <div>
          <p className="text-green text-xs tracking-[0.4em] uppercase font-light mb-5">
            {t(lang, 'about_label')}
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-charcoal leading-tight mb-8">
            {t(lang, 'about_heading')}
            <span className="italic text-green">{t(lang, 'about_accent')}</span>
          </h2>
          <div className="h-px w-16 bg-green mb-8" />
          <p className="text-charcoal/60 leading-relaxed mb-6 font-light">
            {t(lang, 'about_p1')}
          </p>
          <p className="text-charcoal/60 leading-relaxed mb-10 font-light">
            {t(lang, 'about_p2')}
          </p>

          {/* Building floors info */}
          <div className="border border-charcoal/10 p-6 space-y-3">
            <p className="text-green text-xs tracking-widest uppercase font-light mb-4">
              {t(lang, 'about_building')}
            </p>
            {floors.map(({ key, descKey }) => (
              <div key={key} className="flex items-center gap-4 text-sm">
                <span className="text-green font-medium w-32 shrink-0">{t(lang, key)}</span>
                <span className="text-charcoal/50 font-light">{t(lang, descKey)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-px bg-charcoal/10">
          {stats.map(({ value, key }) => (
            <div
              key={key}
              className="bg-white flex flex-col items-center justify-center py-12 px-6 text-center
                         hover:bg-surface transition-colors duration-300 group"
            >
              <span className="font-display text-5xl md:text-6xl font-light text-green-gradient mb-3
                               group-hover:scale-105 transition-transform duration-300 inline-block">
                {value}
              </span>
              <span className="text-charcoal/50 text-xs tracking-widest uppercase font-light">
                {t(lang, key)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

