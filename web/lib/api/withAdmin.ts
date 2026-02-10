import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/** Supabase client type returned by createClient */
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Result of admin auth check - either success with user/supabase or error response
 */
export type AdminAuthResult =
  | { success: true; user: User; supabase: SupabaseServerClient }
  | { success: false; error: NextResponse }

/**
 * Require admin authentication for an API route.
 * Returns the authenticated admin user and Supabase client, or an error response.
 *
 * @example
 * export async function POST(req: NextRequest) {
 *   const auth = await requireAdmin()
 *   if (!auth.success) return auth.error
 *   const { user, supabase } = auth
 *   // ... use user and supabase
 * }
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return {
      success: false,
      error: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 }),
    }
  }

  return { success: true, user, supabase }
}
