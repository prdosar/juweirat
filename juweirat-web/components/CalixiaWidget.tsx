'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, MessageCircle, Loader2, Minimize2 } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  lang: Lang
}

const GREETING: Record<Lang, string> = {
  fr: "Bonjour ! Je suis **Calixia**, votre conseillère en séjour à la Résidence Juweirat. 🏠\n\nComment puis-je vous aider aujourd'hui ?",
  en: "Hello! I'm **Calixia**, your stay advisor at Résidence Juweirat. 🏠\n\nHow can I help you today?",
}

/* Render text with basic formatting and internal links */
function MessageContent({ text }: { text: string }) {
  const linkPattern = /(\/(?:appartements|reserver)\/\d+)/g

  /* Split on links first */
  const segments = text.split(linkPattern)

  return (
    <>
      {segments.map((seg, i) => {
        if (/^\/(appartements|reserver)\/\d+$/.test(seg)) {
          return (
            <a key={i} href={seg}
               className="underline underline-offset-2 font-medium hover:opacity-80 transition-opacity"
               onClick={e => e.stopPropagation()}>
              {seg}
            </a>
          )
        }
        /* Simple bold: **text** */
        const boldParts = seg.split(/\*\*(.+?)\*\*/g)
        return (
          <span key={i}>
            {boldParts.map((p, j) =>
              j % 2 === 1 ? <strong key={j}>{p}</strong> : p
            )}
          </span>
        )
      })}
    </>
  )
}

/* Typing dots indicator */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5">
      {[0, 150, 300].map(delay => (
        <span
          key={delay}
          className="w-1.5 h-1.5 bg-charcoal/30 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  )
}

export default function CalixiaWidget({ lang }: Props) {
  const fr = lang === 'fr'

  const [open,       setOpen]       = useState(false)
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState('')
  const [streaming,  setStreaming]  = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const abortRef   = useRef<AbortController | null>(null)

  /* Greeting on first open */
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: GREETING[lang] }])
    }
  }, [open, lang, messages.length])

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  /* Auto-resize textarea */
  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 96) + 'px'
  }

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { role: 'user', content: text }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    setStreaming(true)

    /* Placeholder assistant message (shows typing dots while empty) */
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/calixia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, lang }),
        signal: ctrl.signal,
      })

      if (!res.ok || !res.body) throw new Error('API error')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const token = JSON.parse(data).choices?.[0]?.delta?.content ?? ''
            accumulated += token
            setMessages(prev => [
              ...prev.slice(0, -1),
              { role: 'assistant', content: accumulated },
            ])
          } catch { /* skip malformed chunk */ }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: fr
            ? 'Désolée, je rencontre une difficulté technique. Veuillez réessayer ou contactez-nous directement au +228 90 00 00 00.'
            : "Sorry, I'm having a technical issue. Please try again or contact us at +228 90 00 00 00.",
        },
      ])
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, streaming, messages, lang, fr])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function handleClose() {
    abortRef.current?.abort()
    setOpen(false)
  }

  /* ── Render ── */
  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir Calixia"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-charcoal text-white pl-3 pr-4 py-2.5
                     shadow-lg hover:bg-charcoal-800 transition-colors duration-300 group"
        >
          <div className="w-7 h-7 rounded-full bg-green flex items-center justify-center text-charcoal text-xs font-bold shrink-0">
            C
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold tracking-widest uppercase leading-none">Calixia</p>
            <p className="text-white/40 text-[10px] font-light leading-none mt-0.5">
              {fr ? 'Conseillère IA' : 'AI Advisor'}
            </p>
          </div>
          <span className="w-2 h-2 rounded-full bg-green animate-pulse ml-1" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50
                        flex flex-col w-full sm:w-[390px] h-[90dvh] sm:h-[580px]
                        bg-white border border-charcoal/10 shadow-2xl">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 bg-charcoal shrink-0">
            <div className="w-9 h-9 rounded-full bg-green flex items-center justify-center text-charcoal font-bold text-sm shrink-0">
              C
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold leading-none">Calixia</p>
              <p className="text-green text-[10px] tracking-widest uppercase font-light mt-0.5">
                {fr ? 'Conseillère · Résidence Juweirat' : 'Advisor · Résidence Juweirat'}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              title={fr ? 'Réduire' : 'Minimize'}
              className="text-white/40 hover:text-white/80 transition-colors p-1 mr-1"
            >
              <Minimize2 size={15} />
            </button>
            <button
              onClick={handleClose}
              title={fr ? 'Fermer' : 'Close'}
              className="text-white/40 hover:text-white/80 transition-colors p-1"
            >
              <X size={17} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#FAFAFA]">
            {messages.map((msg, i) => {
              const isUser      = msg.role === 'user'
              const isLastAsst  = !isUser && i === messages.length - 1
              const showDots    = isLastAsst && streaming && msg.content === ''

              return (
                <div key={i} className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-6 h-6 rounded-full bg-green flex items-center justify-center text-charcoal text-[10px] font-bold shrink-0 mb-0.5">
                      C
                    </div>
                  )}
                  <div className={`max-w-[82%] px-4 py-2.5 text-sm font-light leading-relaxed ${
                    isUser
                      ? 'bg-green text-charcoal'
                      : 'bg-white text-charcoal/80 border border-charcoal/5 shadow-sm'
                  }`}
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  >
                    {showDots ? <TypingDots /> : <MessageContent text={msg.content} />}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-charcoal/8 px-4 py-3 bg-white shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); autoResize(e.target) }}
                onKeyDown={handleKeyDown}
                placeholder={fr ? 'Écrivez votre message…' : 'Type your message…'}
                rows={1}
                disabled={streaming}
                className="flex-1 bg-surface border border-charcoal/10 text-charcoal text-sm font-light
                           px-3 py-2.5 resize-none focus:outline-none focus:border-green transition-colors
                           placeholder:text-charcoal/25 disabled:opacity-50"
                style={{ lineHeight: '1.5', minHeight: '40px' }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || streaming}
                className="w-10 h-10 bg-green flex items-center justify-center text-charcoal
                           hover:bg-green-light transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                {streaming
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Send size={15} />}
              </button>
            </div>
            <p className="text-charcoal/20 text-[10px] text-center mt-1.5 font-light">
              {fr ? 'Entrée pour envoyer · Shift+Entrée pour nouvelle ligne' : 'Enter to send · Shift+Enter for new line'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
