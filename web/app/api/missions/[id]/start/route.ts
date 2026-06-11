/**
 * Start Mission API — POST /api/missions/[id]/start
 *
 * Enrolls the signed-in user in a boost mission by creating their
 * user_mission_progress row (current_count 0). Idempotent: starting a
 * mission you already started returns the existing row instead of an error,
 * so double-clicks and retries are safe.
 *
 * INPUT VALIDATION: [id] must reference an active, non-expired mission.
 * AUTH: required — guests get 401 (the UI routes them to /login instead).
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // The mission must exist, be active, and not have ended
    const { data: mission, error: missionError } = await supabase
      .from('boost_missions')
      .select('id, is_active, end_date')
      .eq('id', id)
      .single()

    if (missionError || !mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 })
    }

    const ended =
      mission.end_date !== null && new Date(mission.end_date) < new Date()
    if (!mission.is_active || ended) {
      return NextResponse.json(
        { error: 'Mission is no longer active' },
        { status: 409 }
      )
    }

    // Idempotent start: return the existing row if the user already started
    const { data: existing } = await supabase
      .from('user_mission_progress')
      .select('*')
      .eq('mission_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(existing, { status: 200 })
    }

    const { data: progress, error: insertError } = await supabase
      .from('user_mission_progress')
      .insert({
        mission_id: id,
        user_id: user.id,
        current_count: 0,
        is_completed: false,
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Database error starting mission:', insertError)
      return NextResponse.json(
        { error: 'Failed to start mission' },
        { status: 500 }
      )
    }

    return NextResponse.json(progress, { status: 201 })
  } catch (error) {
    console.error('Error starting mission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
