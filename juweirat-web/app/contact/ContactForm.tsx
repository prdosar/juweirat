'use client'
import { useState } from 'react'
import { Send, CheckCircle } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'

interface Props {
  lang: Lang
}

export default function ContactForm({ lang }: Props) {
  const [form, setForm]       = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { submitContact } = await import('@/lib/api')
    const success = await submitContact(form)
    if (success) {
      setSent(true)
    } else {
      alert(lang === 'fr' ? 'Une erreur est survenue.' : 'An error occurred.')
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16">
        <CheckCircle size={48} className="text-green mb-6" />
        <h3 className="font-display text-3xl font-light text-charcoal mb-4">{t(lang, 'cp_sent_title')}</h3>
        <p className="text-charcoal/50 font-light">{t(lang, 'cp_sent_sub')}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="font-display text-3xl font-light text-charcoal mb-8">
        {t(lang, 'cp_form')}<span className="italic text-green">{t(lang, 'cp_form_accent')}</span>
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {[
          { id: 'name',  label: t(lang, 'cp_name'),  type: 'text',  ph: t(lang, 'cp_ph_name'),  required: true },
          { id: 'email', label: t(lang, 'cp_email'), type: 'email', ph: t(lang, 'cp_ph_email'), required: true },
        ].map(({ id, label, type, ph, required }) => (
          <div key={id}>
            <label className="block text-charcoal/40 text-xs tracking-widest uppercase font-light mb-2">{label}</label>
            <input
              required={required}
              type={type}
              value={form[id as keyof typeof form]}
              onChange={e => setForm({ ...form, [id]: e.target.value })}
              className="w-full bg-surface border border-charcoal/10 text-charcoal px-4 py-3 text-sm font-light
                         focus:outline-none focus:border-green transition-colors duration-300 placeholder:text-charcoal/20"
              placeholder={ph}
            />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-charcoal/40 text-xs tracking-widest uppercase font-light mb-2">{t(lang, 'cp_phone')}</label>
        <input
          type="tel"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
          className="w-full bg-surface border border-charcoal/10 text-charcoal px-4 py-3 text-sm font-light
                     focus:outline-none focus:border-green transition-colors duration-300 placeholder:text-charcoal/20"
          placeholder={t(lang, 'cp_ph_phone')}
        />
      </div>

      <div>
        <label className="block text-charcoal/40 text-xs tracking-widest uppercase font-light mb-2">{t(lang, 'cp_subject')}</label>
        <select
          value={form.subject}
          onChange={e => setForm({ ...form, subject: e.target.value })}
          className="w-full bg-surface border border-charcoal/10 text-charcoal px-4 py-3 text-sm font-light
                     focus:outline-none focus:border-green transition-colors duration-300"
        >
          <option value="">{t(lang, 'cp_ph_subject')}</option>
          <option value="reservation">{t(lang, 'cp_opt_apt')}</option>
          <option value="terrasse">{t(lang, 'cp_opt_terr')}</option>
          <option value="info">{t(lang, 'cp_opt_info')}</option>
          <option value="autre">{t(lang, 'cp_opt_other')}</option>
        </select>
      </div>

      <div>
        <label className="block text-charcoal/40 text-xs tracking-widest uppercase font-light mb-2">{t(lang, 'cp_message')}</label>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={e => setForm({ ...form, message: e.target.value })}
          className="w-full bg-surface border border-charcoal/10 text-charcoal px-4 py-3 text-sm font-light
                     focus:outline-none focus:border-green transition-colors duration-300 placeholder:text-charcoal/20 resize-none"
          placeholder={t(lang, 'cp_ph_msg')}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-4 bg-green text-charcoal text-xs tracking-widest uppercase font-semibold
                   hover:bg-green-light transition-colors duration-300 disabled:opacity-50"
      >
        {loading ? t(lang, 'cp_sending') : <><Send size={14} /> {t(lang, 'cp_send')}</>}
      </button>
    </form>
  )
}

