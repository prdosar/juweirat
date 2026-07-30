import { cookies } from 'next/headers'
import type { Lang } from './i18n'

export async function getLang(): Promise<Lang> {
  const store = await cookies()
  const val = store.get('juweirat_lang')?.value
  return val === 'en' ? 'en' : 'fr'
}
