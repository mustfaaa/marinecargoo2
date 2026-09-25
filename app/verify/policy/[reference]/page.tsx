import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export default async function PolicyVerificationPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  const result = await db.execute(sql`
    SELECT c.certificate_number, c.insured_name, c.created_at, q.reference, q.status, q.currency, q.premium, q.payload
    FROM public.cargo_certificates c
    JOIN public.cargo_quotes q ON q.id = c.quote_id
    WHERE c.certificate_number = ${reference} OR q.reference = ${reference}
    LIMIT 1
  `)
  const policy = result.rows[0] as { certificate_number: string; insured_name: string; created_at: string; reference: string; status: string; currency: string; premium: number; payload: Record<string, unknown> } | undefined
  return <main className="min-h-screen bg-[#f2f7f5] px-4 py-12 text-[#193332]"><section className="mx-auto max-w-xl rounded-3xl border border-[#dbe8e4] bg-white p-7 shadow-sm sm:p-10"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#0e6d69]">Official policy verification</p>{policy ? <><div className="mt-5 flex items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Policy verified</h1><p className="mt-1 text-sm text-[#78908d]">This record was issued through the insurer policy system.</p></div><div className="rounded-full bg-[#e8f5f1] px-3 py-1 text-xs font-semibold text-[#0e6d69]">{policy.status}</div></div><div className="mt-7 grid gap-3 sm:grid-cols-2">{[['Certificate', policy.certificate_number], ['Insured', policy.insured_name], ['Product', String(policy.payload?.productType || 'Marine cargo')], ['Reference', policy.reference], ['Issued', new Date(policy.created_at).toLocaleDateString()], ['Premium', `${policy.currency} ${Number(policy.premium).toLocaleString()}`]].map(([label, value]) => <div key={label} className="rounded-xl bg-[#f5f9f8] p-3"><p className="text-[10px] text-[#78908d]">{label}</p><p className="mt-1 text-xs font-semibold">{value}</p></div>)}</div><p className="mt-7 text-xs leading-5 text-[#52736e]">Government parties, port officials, banks, and approved partners can use this page to confirm the policy certificate and current status.</p></> : <><h1 className="mt-5 text-2xl font-semibold">Policy not found</h1><p className="mt-2 text-sm text-[#78908d]">The certificate or reference could not be verified. Check the QR code and try again.</p></>}</section></main>
}
