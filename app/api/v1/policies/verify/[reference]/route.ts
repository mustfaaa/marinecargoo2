import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export async function GET(_: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  const result = await db.execute(sql`
    SELECT c.certificate_number, c.insured_name, c.created_at, q.reference, q.status, q.currency, q.premium, q.payload
    FROM public.cargo_certificates c
    JOIN public.cargo_quotes q ON q.id = c.quote_id
    WHERE c.certificate_number = ${reference} OR q.reference = ${reference}
    LIMIT 1
  `)
  const record = result.rows[0] as { certificate_number: string; insured_name: string; created_at: string; reference: string; status: string; currency: string; premium: number; payload: Record<string, unknown> } | undefined
  if (!record) return NextResponse.json({ verified: false, error: 'Policy not found.' }, { status: 404 })
  return NextResponse.json({ verified: record.status === 'bound', certificateNumber: record.certificate_number, reference: record.reference, status: record.status, insuredName: record.insured_name, issuedAt: record.created_at, currency: record.currency, premium: record.premium, product: record.payload?.productType || 'Marine cargo', origin: record.payload?.origin, destination: record.payload?.destination })
}
