import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

interface AuthResult {
  user: { id: string; email?: string } | null
  supabase: SupabaseClient | null
  error: NextResponse | null
}

interface AdminResult extends AuthResult {
  profile: { is_admin: boolean } | null
}

/**
 * Middleware to require authentication.
 * Returns user and supabase client if authenticated, or 401 error response.
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const { user, supabase, error } = await requireAuth()
 *   if (error) return error
 *
 *   // user and supabase are now available
 *   const { data } = await supabase.from('table').select()
 * }
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null,
    }
  }

  return { user, supabase, error: null }
}

/**
 * Middleware to require admin role.
 * Checks authentication AND is_admin flag in profiles table.
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const { user, supabase, profile, error } = await requireAdmin()
 *   if (error) return error
 *
 *   // user is authenticated and is an admin
 * }
 */
export async function requireAdmin(): Promise<AdminResult> {
  const result = await requireAuth()
  if (result.error) return { ...result, profile: null }

  const { data: profile } = await result.supabase!
    .from('profiles')
    .select('is_admin')
    .eq('id', result.user!.id)
    .single()

  if (!profile?.is_admin) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
      profile: null,
    }
  }

  return { ...result, profile, error: null }
}
