import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

function hashKey(key: string) { return crypto.createHash('sha256').update(key).digest('hex') }
function jsonError(message: string, status = 400) { return NextResponse.json({ error: { message } }, { status }) }

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-eelell-api-key')
  if (!apiKey) return jsonError('Missing x-eelell-api-key header.', 401)
  const key = await db.execute(sql`SELECT id, scopes, status FROM public.partner_api_keys WHERE key_hash = ${hashKey(apiKey)} LIMIT 1`)
  const record = key.rows[0] as { id: string; scopes: string[]; status: string } | undefined
  if (!record || record.status !== 'active') return jsonError('Invalid or inactive API key.', 401)
  if (!record.scopes?.includes('quotes')) return jsonError('API key is not permitted to create quotes.', 403)

  const body = await request.json().catch(() => null)
  if (!body?.cargoValue || !body?.origin || !body?.destination || !body?.commodity) return jsonError('cargoValue, origin, destination, and commodity are required.')
  const cargoValue = Number(body.cargoValue)
  if (!Number.isFinite(cargoValue) || cargoValue <= 0) return jsonError('cargoValue must be a positive number.')
  const premium = Math.round(cargoValue * 0.0025 * 100) / 100
  const reference = `EE-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`
  await db.execute(sql`INSERT INTO public.cargo_quotes (partner_key_id, reference, currency, premium, payload) VALUES (${record.id}, ${reference}, 'LYD', ${premium}, ${JSON.stringify(body)}::jsonb)`)
  await db.execute(sql`UPDATE public.partner_api_keys SET last_used_at = now() WHERE id = ${record.id}`)
  return NextResponse.json({ reference, status: 'quoted', currency: 'LYD', premium, coverage: 'Institute Cargo Clauses (A)', expiresInHours: 24 }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-eelell-api-key')
  if (!apiKey) return jsonError('Missing x-eelell-api-key header.', 401)
  const key = await db.execute(sql`SELECT id, scopes, status FROM public.partner_api_keys WHERE key_hash = ${hashKey(apiKey)} LIMIT 1`)
  const record = key.rows[0] as { id: string; scopes: string[]; status: string } | undefined
  if (!record || record.status !== 'active') return jsonError('Invalid or inactive API key.', 401)
  const quotes = await db.execute(sql`SELECT reference, status, currency, premium, created_at FROM public.cargo_quotes WHERE partner_key_id = ${record.id} ORDER BY created_at DESC LIMIT 50`)
  return NextResponse.json({ data: quotes.rows })
}
