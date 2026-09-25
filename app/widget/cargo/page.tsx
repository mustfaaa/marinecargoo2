'use client'

import { FormEvent, useState } from 'react'

export default function CargoWidget() {
  const [result, setResult] = useState<{ premium: number; reference: string } | null>(null)
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setResult(null)
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/widget/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cargoValue: Number(form.get('cargoValue')), origin: form.get('origin'), destination: form.get('destination'), commodity: form.get('commodity') }) })
    const quote = await response.json()
    if (response.ok) setResult({ premium: quote.premium, reference: quote.reference })
    setLoading(false)
  }
  return <main className="min-h-screen bg-[#f3f8f7] p-4 text-[#193332]"><section className="mx-auto max-w-md rounded-2xl border border-[#dce9e6] bg-white p-6 shadow-sm"><div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-bold tracking-[.18em] text-[#0e6d69]">EELELL</p><h1 className="mt-1 text-xl font-semibold">Cargo protection</h1></div><span className="rounded-full bg-[#e5f4ef] px-3 py-1 text-[10px] font-semibold text-[#14735f]">Libya</span></div><form onSubmit={submit} className="flex flex-col gap-4"><label className="text-xs font-semibold">Cargo value <input required name="cargoValue" type="number" min="1" placeholder="250000" className="mt-2 w-full rounded-lg border border-[#d9e6e3] p-3 text-sm outline-none focus:border-[#0e6d69]" /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Origin<input required name="origin" defaultValue="Misrata" className="mt-2 w-full rounded-lg border border-[#d9e6e3] p-3 text-sm" /></label><label className="text-xs font-semibold">Destination<input required name="destination" defaultValue="Tripoli" className="mt-2 w-full rounded-lg border border-[#d9e6e3] p-3 text-sm" /></label></div><label className="text-xs font-semibold">Commodity<select name="commodity" className="mt-2 w-full rounded-lg border border-[#d9e6e3] bg-white p-3 text-sm"><option>General goods</option><option>Machinery</option><option>Food and agricultural</option><option>Electronics</option></select></label><button disabled={loading} className="rounded-lg bg-[#0e6d69] p-3 text-sm font-semibold text-white disabled:opacity-60">{loading ? 'Calculating…' : 'Get cargo quote'}</button></form>{result && <div className="mt-5 rounded-xl bg-[#e8f5f1] p-4"><p className="text-xs text-[#55736e]">Indicative premium</p><p className="mt-1 text-2xl font-semibold text-[#0e6d69]">LYD {result.premium.toLocaleString()}</p><p className="mt-2 text-[10px] text-[#55736e]">Reference {result.reference} · valid for 24 hours</p></div>}<p className="mt-5 text-center text-[10px] text-[#91a4a1]">Powered by EELELL · Institute Cargo Clauses (A)</p></section></main>
}
