import { getRooms } from '@/lib/api'
import type { Room } from '@/lib/api'

const MODEL = 'gpt-4o-mini'

function buildRoomSummary(rooms: Room[]): string {
  return rooms.map(r => {
    const prices = [
      `${r.pricePerNight.toLocaleString('fr-FR')} FCFA/nuit`,
      r.pricePerWeek  ? `${r.pricePerWeek.toLocaleString('fr-FR')} FCFA/semaine`  : null,
      r.pricePerMonth ? `${r.pricePerMonth.toLocaleString('fr-FR')} FCFA/mois`    : null,
    ].filter(Boolean).join(' · ')

    const amenities = r.amenities.map(a => a.nameFr).join(', ')

    return [
      `[${r.status === 'Available' ? '✅ DISPONIBLE' : '🔴 OCCUPÉ'}] ${r.nameFr} / ${r.nameEn} — ${r.roomNumber}`,
      `  Étage ${r.floor} | ${r.capacityAdults} adultes${r.capacityChildren > 0 ? `, ${r.capacityChildren} enfants` : ''}${r.sizeSqm ? ` | ${r.sizeSqm} m²` : ''}`,
      `  Prix : ${prices}`,
      amenities ? `  Équipements : ${amenities}` : null,
      r.descriptionFr ? `  Description : ${r.descriptionFr}` : null,
      r.descriptionEn && r.descriptionEn !== r.descriptionFr ? `  Description (EN) : ${r.descriptionEn}` : null,
      `  Lien : /appartements/${r.id}`,
    ].filter(Boolean).join('\n')
  }).join('\n\n')
}

function buildSystemPrompt(rooms: Room[]): string {
  const available = rooms.filter(r => r.status === 'Available').length
  const total     = rooms.length

  return `Tu es Calixia, conseillère en séjour virtuelle de la Résidence Juweirat, une résidence haut de gamme située au 376 Boulevard de la Kara, Gbossimé, Lomé, Togo.

## TON RÔLE
Aider les clients à trouver l'appartement idéal et les orienter vers la réservation. Tu es chaleureuse, professionnelle et concise.

## RÈGLES ABSOLUES
- Tu réponds UNIQUEMENT aux sujets liés au séjour, aux appartements et à la Résidence Juweirat
- Pour tout autre sujet, redirige poliment vers ta mission
- Tes réponses font maximum 4 phrases courtes (sauf si tu listes des appartements)
- Tu réponds dans la langue du client (français ou anglais)
- Tu poses des questions ciblées pour cerner les besoins avant de recommander

## QUESTIONS CLÉ À POSER (progressivement)
1. Nombre d'adultes et d'enfants
2. Dates d'arrivée et de départ (ou durée approximative)
3. Budget approximatif par nuit
4. Préférences particulières (étage élevé, grande surface, vue...)

## RÉSIDENCE JUWEIRAT — INFOS GÉNÉRALES
- 18 appartements meublés haut de gamme répartis sur plusieurs niveaux
- Étage 6 : appartements Prestige avec vue panoramique
- Équipements communs : Wi-Fi, Parking sécurisé, Accès 24h/24
- Contact : +228 90 00 00 00 | contact@juweirat.com

## INVENTAIRE DES APPARTEMENTS (${available} disponibles sur ${total})
${buildRoomSummary(rooms)}

## RECOMMANDATION
Quand tu recommandes un appartement, cite son nom et son lien /appartements/ID.
Pour lancer une réservation, oriente vers /reserver/ID (ex : "Cliquez sur /reserver/5 pour réserver").`
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'OpenAI API key not configured' }, { status: 503 })
  }

  let body: { messages: Array<{ role: string; content: string }>; lang: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { messages, lang } = body
  if (!Array.isArray(messages)) {
    return Response.json({ error: 'messages must be an array' }, { status: 400 })
  }

  /* Fetch rooms (cached 60 s by Next.js fetch) */
  const rooms = await getRooms()

  const systemPrompt = buildSystemPrompt(rooms)

  /* Forward to OpenAI with streaming */
  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-20), // keep last 20 messages to cap token usage
      ],
      stream: true,
      max_tokens: 600,
      temperature: 0.65,
    }),
  })

  if (!openaiRes.ok) {
    const err = await openaiRes.text()
    console.error('[Calixia] OpenAI error:', err)
    return Response.json({ error: 'OpenAI request failed' }, { status: 502 })
  }

  /* Pipe the SSE stream directly to the client */
  return new Response(openaiRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
