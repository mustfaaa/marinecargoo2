import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const cargoValue = Number(body?.cargoValue)
  if (!Number.isFinite(cargoValue) || cargoValue <= 0 || !body?.origin || !body?.destination || !body?.commodity) return NextResponse.json({ error: { message: 'Valid cargoValue, origin, destination, and commodity are required.' } }, { status: 400 })
  const premium = Math.round(cargoValue * 0.0025 * 100) / 100
  const reference = `EE-W-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`
  await db.execute(sql`INSERT INTO public.cargo_quotes (reference, currency, premium, payload) VALUES (${reference}, 'LYD', ${premium}, ${JSON.stringify(body)}::jsonb)`)
  return NextResponse.json({ reference, status: 'quoted', currency: 'LYD', premium, coverage: 'Institute Cargo Clauses (A)', expiresInHours: 24 }, { status: 201 })
}
