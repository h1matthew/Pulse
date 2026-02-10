import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/** Supabase client type returned by createClient */
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Result of auth check - either success with user/supabase or error response
 */
export type AuthResult =
  | { success: true; user: User; supabase: SupabaseServerClient }
  | { success: false; error: NextResponse }

/**
 * Require authentication for an API route.
 * Returns the authenticated user and Supabase client, or an error response.
 *
 * @example
 * export async function POST(req: NextRequest) {
 *   const auth = await requireAuth()
 *   if (!auth.success) return auth.error
 *   const { user, supabase } = auth
 *   // ... use user and supabase
 * }
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { success: true, user, supabase }
}

/**
 * Get auth info without requiring authentication.
 * Returns user and supabase client (user may be null).
 * Useful for routes that support both authenticated and unauthenticated access.
 *
 * @example
 * export async function GET(req: NextRequest) {
 *   const { user, supabase } = await getAuth()
 *   if (user) {
 *     // Show personalized content
 *   }
 * }
 */
export async function getAuth(): Promise<{ user: User | null; supabase: SupabaseServerClient }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { user, supabase }
}
