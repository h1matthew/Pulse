import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStreak, updateStreak } from '@/lib/streaks/streakTracker'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const streak = await getStreak(user.id, supabase)
  return NextResponse.json(streak, {
    headers: {
      'Cache-Control': 'private, max-age=120, stale-while-revalidate=240',
    },
  })
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await updateStreak(user.id, supabase)
  return NextResponse.json(result)
}
