import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncLeaderboardEntry } from '@/lib/leaderboard/syncLeaderboard'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: achievements, error } = await supabase
    .from('user_achievements')
    .select('achievement_id, unlocked_at')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching achievements:', error)
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 })
  }

  return NextResponse.json(
    { achievements: achievements || [] },
    {
      headers: {
        'Cache-Control': 'private, max-age=120, stale-while-revalidate=240',
      },
    }
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { achievementId } = await request.json()

    if (!achievementId) {
      return NextResponse.json({ error: 'Achievement ID required' }, { status: 400 })
    }

    // Check if already unlocked
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', user.id)
      .eq('achievement_id', achievementId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Achievement already unlocked' }, { status: 409 })
    }

    // Insert new achievement
    const { error: insertError } = await supabase
      .from('user_achievements')
      .insert({
        user_id: user.id,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Error inserting achievement:', insertError)
      return NextResponse.json({ error: 'Failed to unlock achievement' }, { status: 500 })
    }

    // Sync leaderboard
    await syncLeaderboardEntry(user.id, supabase)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
