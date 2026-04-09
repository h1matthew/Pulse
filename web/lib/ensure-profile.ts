import type { User } from '@supabase/supabase-js'

/**
 * Ensure a profile row exists for the given user.
 * Called server-side before any insert into tables that reference profiles(id).
 */
export async function ensureProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  user: User
): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!data) {
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || '',
        is_admin: false,
      },
      { onConflict: 'id' }
    )
  }
}
