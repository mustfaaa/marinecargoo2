import { createNeonAuth } from '@neondatabase/auth/next/server'

function getAuth() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET
  if (!baseUrl || !cookieSecret) throw new Error('Neon Auth is not configured')
  return createNeonAuth({
    baseUrl,
    cookies: { secret: cookieSecret },
  })
}

export const dynamic = 'force-dynamic'

export async function requireSession() {
  const { data, error } = await getAuth().getSession()
  if (error || !data?.user) throw new Error('UNAUTHORIZED')
  return data
}

export async function requireRole(roles: string[]) {
  const session = await requireSession()
  const role = session.user.role ?? 'user'
  if (!roles.includes(role)) throw new Error('FORBIDDEN')
  return session
}

export function actionError(error: unknown) {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') return { error: 'Unauthorized' as const }
  if (error instanceof Error && error.message === 'FORBIDDEN') return { error: 'Forbidden' as const }
  throw error
}
