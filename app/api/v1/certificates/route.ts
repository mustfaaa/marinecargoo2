import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import QRCode from 'qrcode'

const hashKey = (key: string) => crypto.createHash('sha256').update(key).digest('hex')
const error = (message: string, status = 400) => NextResponse.json({ error: { message } }, { status })

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-eelell-api-key')
  if (!apiKey) return error('Missing x-eelell-api-key header.', 401)
  const auth = await db.execute(sql`SELECT id, scopes, status FROM public.partner_api_keys WHERE key_hash = ${hashKey(apiKey)} LIMIT 1`)
  const key = auth.rows[0] as { id: string; scopes: string[]; status: string } | undefined
  if (!key || key.status !== 'active') return error('Invalid or inactive API key.', 401)
  if (!key.scopes?.includes('certificates')) return error('API key is not permitted to issue certificates.', 403)
  const body = await request.json().catch(() => null)
  if (!body?.reference || !body?.insuredName) return error('reference and insuredName are required.')
  const quote = await db.execute(sql`SELECT id, reference, status FROM public.cargo_quotes WHERE reference = ${String(body.reference)} AND partner_key_id = ${key.id} LIMIT 1`)
  const record = quote.rows[0] as { id: string; reference: string; status: string } | undefined
  if (!record) return error('Quote not found for this partner.', 404)
  const certificateNumber = `EE-CERT-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
  await db.execute(sql`INSERT INTO public.cargo_certificates (quote_id, certificate_number, insured_name) VALUES (${record.id}, ${certificateNumber}, ${String(body.insuredName)})`)
  await db.execute(sql`UPDATE public.cargo_quotes SET status = 'bound' WHERE id = ${record.id}`)
  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://eelell.vercel.app'
  const verificationUrl = `${origin}/verify/policy/${certificateNumber}`
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { width: 240, margin: 1 })
  return NextResponse.json({ certificateNumber, reference: record.reference, status: 'issued', currency: 'LYD', verificationUrl, qrCodeDataUrl }, { status: 201 })
}
