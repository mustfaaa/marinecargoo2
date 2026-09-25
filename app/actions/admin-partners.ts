'use server'

import crypto from 'node:crypto'
import { sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth/server'

const json = (value: unknown) => JSON.stringify(value ?? {})

async function audit(actorId: string, action: string, resourceType: string, resourceId?: string, metadata?: unknown) {
  await db.execute(sql`INSERT INTO public.audit_events (actor_id, action, resource_type, resource_id, metadata) VALUES (${actorId}, ${action}, ${resourceType}, ${resourceId || null}, ${json(metadata)}::jsonb)`)
}

export async function listPartners() {
  const session = await requireRole(['admin', 'owner'])
  const result = await db.execute(sql`SELECT id, name, legal_name, partner_type, status, contact_email, allowed_origins, created_at, updated_at FROM public.partners WHERE created_by = ${session.user.id} OR ${session.user.role} IN ('admin','owner') ORDER BY created_at DESC`)
  return result.rows
}

export async function createPartner(input: { name: string; legalName: string; partnerType?: string; contactEmail?: string; allowedOrigins?: string[] }) {
  const session = await requireRole(['admin', 'owner'])
  if (!input.name?.trim() || !input.legalName?.trim()) throw new Error('Name and legal name are required')
  const result = await db.execute(sql`INSERT INTO public.partners (created_by, name, legal_name, partner_type, contact_email, allowed_origins) VALUES (${session.user.id}, ${input.name.trim()}, ${input.legalName.trim()}, ${input.partnerType || 'bank'}, ${input.contactEmail || null}, ${input.allowedOrigins || []}) RETURNING id, name, status`)
  const row = result.rows[0] as { id: string }
  await audit(session.user.id, 'partner.created', 'partner', row.id, { name: input.name })
  revalidatePath('/')
  return row
}

export async function updatePartner(input: { id: string; name?: string; legalName?: string; partnerType?: string; contactEmail?: string; allowedOrigins?: string[]; status?: string }) {
  const session = await requireRole(['admin', 'owner'])
  const result = await db.execute(sql`UPDATE public.partners SET name = COALESCE(${input.name || null}, name), legal_name = COALESCE(${input.legalName || null}, legal_name), partner_type = COALESCE(${input.partnerType || null}, partner_type), contact_email = COALESCE(${input.contactEmail || null}, contact_email), allowed_origins = COALESCE(${input.allowedOrigins || null}, allowed_origins), status = COALESCE(${input.status || null}, status), updated_at = now() WHERE id = ${input.id} AND (created_by = ${session.user.id} OR ${session.user.role} IN ('admin','owner')) RETURNING id, name, status`)
  await audit(session.user.id, 'partner.updated', 'partner', input.id, input)
  revalidatePath('/')
  return result.rows[0]
}

export async function deletePartner(partnerId: string) {
  const session = await requireRole(['admin', 'owner'])
  await db.execute(sql`DELETE FROM public.partners WHERE id = ${partnerId} AND (created_by = ${session.user.id} OR ${session.user.role} IN ('admin','owner'))`)
  await audit(session.user.id, 'partner.deleted', 'partner', partnerId)
  revalidatePath('/')
}

export async function listAuditEvents(limit = 50) {
  const session = await requireRole(['admin', 'owner'])
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const result = await db.execute(sql`SELECT id, actor_id, action, resource_type, resource_id, metadata, created_at FROM public.audit_events WHERE actor_id = ${session.user.id} OR ${session.user.role} IN ('admin','owner') ORDER BY created_at DESC LIMIT ${safeLimit}`)
  return result.rows
}

export async function revokeApiKey(keyId: string) {
  const session = await requireRole(['admin', 'owner'])
  await db.execute(sql`UPDATE public.partner_api_keys SET status = 'revoked' WHERE id = ${keyId}`)
  await audit(session.user.id, 'api_key.revoked', 'partner_api_key', keyId)
  revalidatePath('/')
}

export async function rotateApiKey(keyId: string) {
  const session = await requireRole(['admin', 'owner'])
  const key = `ee_live_${crypto.randomUUID().replaceAll('-', '')}`
  const prefix = key.slice(0, 15)
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  await db.execute(sql`UPDATE public.partner_api_keys SET status = 'revoked' WHERE id = ${keyId}`)
  const result = await db.execute(sql`INSERT INTO public.partner_api_keys (partner_name, key_prefix, key_hash, scopes, environment) SELECT partner_name, ${prefix}, ${hash}, scopes, environment FROM public.partner_api_keys WHERE id = ${keyId} RETURNING id, key_prefix, environment, scopes`)
  await audit(session.user.id, 'api_key.rotated', 'partner_api_key', keyId)
  revalidatePath('/')
  return { ...result.rows[0], secret: key }
}
