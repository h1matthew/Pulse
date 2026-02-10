import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's full_name and is_admin from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, is_admin')
    .eq('id', user.id)
    .single()

  return (
    <AppShell email={user.email} fullName={profile?.full_name} isAdmin={profile?.is_admin || false}>
      {children}
    </AppShell>
  )
}
