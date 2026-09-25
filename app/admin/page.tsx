import { redirect } from 'next/navigation'
import AdminConsole from '@/components/admin-console'
import { requireRole } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  try {
    await requireRole(['admin', 'owner'])
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') redirect('/forbidden')
    redirect('/sign-in?role=admin')
  }
  return <AdminConsole />
}
