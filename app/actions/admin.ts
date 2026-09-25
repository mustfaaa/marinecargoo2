'use server'

import crypto from 'node:crypto'
import { sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth/server'

const id = (value: string) => value || crypto.randomUUID()
const json = (value: unknown) => JSON.stringify(value ?? {})

export async function listInsurers() {
  const session = await requireRole(['admin', 'owner'])
  const result = await db.execute(sql`SELECT id, name, legal_name, license_number, status, contact_email, created_at, updated_at FROM public.insurers WHERE created_by = ${session.user.id} OR ${session.user.role} IN ('admin','owner') ORDER BY created_at DESC`)
  return result.rows
}

export async function createInsurer(input: { name: string; legalName: string; licenseNumber?: string; contactEmail?: string }) {
  const session = await requireRole(['admin', 'owner'])
  if (!input.name?.trim() || !input.legalName?.trim()) throw new Error('Name and legal name are required')
  const result = await db.execute(sql`INSERT INTO public.insurers (id, created_by, name, legal_name, license_number, contact_email) VALUES (${id('')}, ${session.user.id}, ${input.name.trim()}, ${input.legalName.trim()}, ${input.licenseNumber || null}, ${input.contactEmail || null}) RETURNING id, name, status`)
  revalidatePath('/')
  return result.rows[0]
}

export async function updateInsurer(input: { id: string; name?: string; legalName?: string; licenseNumber?: string; contactEmail?: string; status?: string }) {
  const session = await requireRole(['admin', 'owner'])
  const result = await db.execute(sql`UPDATE public.insurers SET name = COALESCE(${input.name || null}, name), legal_name = COALESCE(${input.legalName || null}, legal_name), license_number = COALESCE(${input.licenseNumber || null}, license_number), contact_email = COALESCE(${input.contactEmail || null}, contact_email), status = COALESCE(${input.status || null}, status), updated_at = now() WHERE id = ${input.id} AND (created_by = ${session.user.id} OR ${session.user.role} IN ('admin','owner')) RETURNING id, name, status`)
  revalidatePath('/')
  return result.rows[0]
}

export async function deleteInsurer(insurerId: string) {
  const session = await requireRole(['admin', 'owner'])
  await db.execute(sql`DELETE FROM public.insurers WHERE id = ${insurerId} AND (created_by = ${session.user.id} OR ${session.user.role} IN ('admin','owner'))`)
  revalidatePath('/')
}

export async function listProducts(insurerId?: string) {
  const session = await requireRole(['admin', 'owner', 'insurer'])
  const result = await db.execute(sql`SELECT id, insurer_id, name, product_type, status, currency, pricing_rules, created_at, updated_at FROM public.products WHERE (${insurerId || null} IS NULL OR insurer_id = ${insurerId || null}) AND created_by = ${session.user.id} ORDER BY created_at DESC`)
  return result.rows
}

export async function createProduct(input: { insurerId: string; name: string; productType?: string; currency?: string; pricingRules?: unknown }) {
  const session = await requireRole(['admin', 'owner', 'insurer'])
  if (!input.insurerId || !input.name?.trim()) throw new Error('Insurer and product name are required')
  const result = await db.execute(sql`INSERT INTO public.products (insurer_id, created_by, name, product_type, currency, pricing_rules) VALUES (${input.insurerId}, ${session.user.id}, ${input.name.trim()}, ${input.productType || 'cargo'}, ${input.currency || 'LYD'}, ${json(input.pricingRules)}::jsonb) RETURNING id, name, status`)
  revalidatePath('/')
  return result.rows[0]
}

export async function updateProduct(input: { id: string; name?: string; status?: string; pricingRules?: unknown }) {
  const session = await requireRole(['admin', 'owner', 'insurer'])
  const result = await db.execute(sql`UPDATE public.products SET name = COALESCE(${input.name || null}, name), status = COALESCE(${input.status || null}, status), pricing_rules = COALESCE(${input.pricingRules ? json(input.pricingRules) : null}::jsonb, pricing_rules), updated_at = now() WHERE id = ${input.id} AND created_by = ${session.user.id} RETURNING id, name, status`)
  revalidatePath('/')
  return result.rows[0]
}

export async function deleteProduct(productId: string) {
  const session = await requireRole(['admin', 'owner', 'insurer'])
  await db.execute(sql`DELETE FROM public.products WHERE id = ${productId} AND created_by = ${session.user.id}`)
  revalidatePath('/')
}

export async function listClients(insurerId?: string) {
  const session = await requireRole(['admin', 'owner', 'insurer'])
  const result = await db.execute(sql`SELECT id, insurer_id, name, email, phone, client_type, status, created_at FROM public.insurer_clients WHERE (${insurerId || null} IS NULL OR insurer_id = ${insurerId || null}) AND created_by = ${session.user.id} ORDER BY created_at DESC`)
  return result.rows
}

export async function createClient(input: { insurerId: string; name: string; email?: string; phone?: string; clientType?: string }) {
  const session = await requireRole(['admin', 'owner', 'insurer'])
  if (!input.insurerId || !input.name?.trim()) throw new Error('Insurer and client name are required')
  const result = await db.execute(sql`INSERT INTO public.insurer_clients (insurer_id, created_by, name, email, phone, client_type) VALUES (${input.insurerId}, ${session.user.id}, ${input.name.trim()}, ${input.email || null}, ${input.phone || null}, ${input.clientType || 'business'}) RETURNING id, name, status`)
  revalidatePath('/')
  return result.rows[0]
}

export async function updateClient(input: { id: string; name?: string; email?: string; phone?: string; status?: string }) {
  const session = await requireRole(['admin', 'owner', 'insurer'])
  const result = await db.execute(sql`UPDATE public.insurer_clients SET name = COALESCE(${input.name || null}, name), email = COALESCE(${input.email || null}, email), phone = COALESCE(${input.phone || null}, phone), status = COALESCE(${input.status || null}, status), updated_at = now() WHERE id = ${input.id} AND created_by = ${session.user.id} RETURNING id, name, status`)
  revalidatePath('/')
  return result.rows[0]
}

export async function deleteClient(clientId: string) {
  const session = await requireRole(['admin', 'owner', 'insurer'])
  await db.execute(sql`DELETE FROM public.insurer_clients WHERE id = ${clientId} AND created_by = ${session.user.id}`)
  revalidatePath('/')
}

export async function getSetting(settingKey: string) {
  await requireRole(['admin', 'owner'])
  const result = await db.execute(sql`SELECT setting_key, setting_value, updated_at FROM public.platform_settings WHERE setting_key = ${settingKey} LIMIT 1`)
  return result.rows[0] ?? null
}

export async function upsertSetting(settingKey: string, settingValue: unknown) {
  const session = await requireRole(['admin', 'owner'])
  const result = await db.execute(sql`INSERT INTO public.platform_settings (setting_key, setting_value, updated_by) VALUES (${settingKey}, ${json(settingValue)}::jsonb, ${session.user.id}) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_by = EXCLUDED.updated_by, updated_at = now() RETURNING setting_key, setting_value, updated_at`)
  revalidatePath('/')
  return result.rows[0]
}

export async function listCommissionRules(insurerId?: string) {
  const session = await requireRole(['admin', 'owner'])
  const result = await db.execute(sql`SELECT id, insurer_id, name, percentage, status, created_at, updated_at FROM public.commission_rules WHERE (${insurerId || null} IS NULL OR insurer_id = ${insurerId || null}) AND created_by = ${session.user.id} ORDER BY created_at DESC`)
  return result.rows
}

export async function createCommissionRule(input: { insurerId?: string; name: string; percentage: number }) {
  const session = await requireRole(['admin', 'owner'])
  if (!input.name?.trim() || !Number.isFinite(input.percentage) || input.percentage < 0 || input.percentage > 100) throw new Error('Valid name and percentage from 0 to 100 are required')
  const result = await db.execute(sql`INSERT INTO public.commission_rules (insurer_id, created_by, name, percentage) VALUES (${input.insurerId || null}, ${session.user.id}, ${input.name.trim()}, ${input.percentage}) RETURNING id, name, percentage, status`)
  revalidatePath('/')
  return result.rows[0]
}

export async function updateCommissionRule(input: { id: string; name?: string; percentage?: number; status?: string }) {
  const session = await requireRole(['admin', 'owner'])
  const result = await db.execute(sql`UPDATE public.commission_rules SET name = COALESCE(${input.name || null}, name), percentage = COALESCE(${typeof input.percentage === 'number' ? input.percentage : null}, percentage), status = COALESCE(${input.status || null}, status), updated_at = now() WHERE id = ${input.id} AND created_by = ${session.user.id} RETURNING id, name, percentage, status`)
  revalidatePath('/')
  return result.rows[0]
}

export async function deleteCommissionRule(ruleId: string) {
  const session = await requireRole(['admin', 'owner'])
  await db.execute(sql`DELETE FROM public.commission_rules WHERE id = ${ruleId} AND created_by = ${session.user.id}`)
  revalidatePath('/')
}
