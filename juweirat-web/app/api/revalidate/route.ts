import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(req: Request) {
  const secret = req.headers.get('x-revalidate-secret')
  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { path?: string; roomId?: string | number } = {}
  try { body = await req.json() } catch { /* no body = revalidate all */ }

  /* Tag-based revalidation — purges all cached room data (stale-while-revalidate) */
  revalidateTag('rooms', 'max')
  if (body.roomId) {
    revalidateTag(`room-${body.roomId}`, 'max')
  }

  /* Path revalidation for page-level cache */
  if (body.roomId) {
    revalidatePath(`/appartements/${body.roomId}`)
    revalidatePath(`/reserver/${body.roomId}`)
  }
  revalidatePath('/appartements')
  revalidatePath('/')

  return Response.json({ revalidated: true, at: new Date().toISOString() })
}
