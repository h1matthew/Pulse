import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateStreak } from '@/lib/streaks/streakTracker'
import { syncLeaderboardEntry } from '@/lib/leaderboard/syncLeaderboard'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { lessonId, moduleId, completed, quizScore, quizTotal } = body

  if (!lessonId || !moduleId) {
    return NextResponse.json(
      { error: 'Missing required fields: lessonId, moduleId' },
      { status: 400 }
    )
  }

  // Validate IDs are strings and have reasonable length
  if (typeof lessonId !== 'string' || typeof moduleId !== 'string') {
    return NextResponse.json(
      { error: 'Invalid lessonId or moduleId format' },
      { status: 400 }
    )
  }

  if (lessonId.length > 100 || moduleId.length > 100) {
    return NextResponse.json(
      { error: 'Invalid lessonId or moduleId length' },
      { status: 400 }
    )
  }

  // Verify the lesson and module exist in the database using a single query
  // This avoids N+1 by joining lesson with its module in one request
  const { data: dbLesson } = await supabase
    .from('lessons')
    .select('id, module_id, module:modules!inner(id)')
    .eq('id', lessonId)
    .single()

  // If lesson exists in DB, verify the module_id matches
  if (dbLesson) {
    if (dbLesson.module_id !== moduleId) {
      return NextResponse.json(
        { error: 'Lesson does not belong to the specified module' },
        { status: 400 }
      )
    }
    // Module existence is verified by the !inner join - if module doesn't exist, query returns null
  }
  // If lesson not in DB, it might be from static content (COURSE_MODULES)
  // In that case, we allow progress tracking but with the original validation
  // This maintains backwards compatibility with file-based content

  // Validate quiz score if provided
  if (quizScore !== undefined || quizTotal !== undefined) {
    // Both must be provided together
    if (quizScore === undefined || quizTotal === undefined) {
      return NextResponse.json(
        { error: 'Both quizScore and quizTotal must be provided together' },
        { status: 400 }
      )
    }
    // Validate they are non-negative integers
    if (!Number.isInteger(quizScore) || !Number.isInteger(quizTotal) || quizScore < 0 || quizTotal < 0) {
      return NextResponse.json(
        { error: 'Quiz scores must be non-negative integers' },
        { status: 400 }
      )
    }
    // Validate score doesn't exceed total
    if (quizScore > quizTotal) {
      return NextResponse.json(
        { error: 'Quiz score cannot exceed quiz total' },
        { status: 400 }
      )
    }
    // Validate reasonable limits (max 100 questions per quiz)
    if (quizTotal > 100) {
      return NextResponse.json(
        { error: 'Invalid quiz total' },
        { status: 400 }
      )
    }
  }

  const { error } = await supabase
    .from('user_lesson_progress')
    .upsert({
      user_id: user.id,
      lesson_id: lessonId,
      module_id: moduleId,
      completed: completed ?? true,
      completed_at: completed ? new Date().toISOString() : null,
      quiz_score: quizScore ?? null,
      quiz_total: quizTotal ?? null,
    }, {
      onConflict: 'user_id,lesson_id',
    })

  if (error) {
    console.error('Error updating lesson progress:', error)
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
  }

  // Update lessons_completed count on profile and streak
  if (completed) {
    const { count } = await supabase
      .from('user_lesson_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('completed', true)

    await supabase
      .from('profiles')
      .update({ lessons_completed: count || 0 })
      .eq('id', user.id)

    // Update streak
    await updateStreak(user.id, supabase)

    // Sync leaderboard
    await syncLeaderboardEntry(user.id, supabase)
  }

  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const moduleId = searchParams.get('moduleId')

  let query = supabase
    .from('user_lesson_progress')
    .select('*')
    .eq('user_id', user.id)

  if (moduleId) {
    query = query.eq('module_id', moduleId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching lesson progress:', error)
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }

  return NextResponse.json(
    { progress: data },
    {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    }
  )
}
