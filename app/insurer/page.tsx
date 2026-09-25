import { redirect } from 'next/navigation'
import InsurerPortal from '@/components/insurer-portal'
import { requireRole } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export default async function InsurerPage() {
  try {
    await requireRole(['insurer_admin', 'insurer', 'admin', 'owner'])
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') redirect('/forbidden')
    redirect('/sign-in?role=insurer')
  }
  return <InsurerPortal />
}
