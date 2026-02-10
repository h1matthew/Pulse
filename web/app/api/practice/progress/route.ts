import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Get practice problem progress for a lesson
 * GET /api/practice/progress?lessonId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 })
    }

    const { data: progress, error } = await supabase
      .from('user_practice_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .order('problem_index', { ascending: true })

    if (error) {
      console.error('Error fetching practice progress:', error)
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
    }

    return NextResponse.json({ progress: progress || [] })
  } catch (error) {
    console.error('Error in practice progress endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Update practice problem progress
 * POST /api/practice/progress
 * Body: { lessonId: string, problemIndex: number, completed: boolean, attempts?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { lessonId, problemIndex, completed, attempts } = body

    if (!lessonId || problemIndex === undefined) {
      return NextResponse.json({ error: 'lessonId and problemIndex are required' }, { status: 400 })
    }

    // Upsert progress record
    const { data: progress, error } = await supabase
      .from('user_practice_progress')
      .upsert(
        {
          user_id: user.id,
          lesson_id: lessonId,
          problem_index: problemIndex,
          completed: completed ?? false,
          attempts: attempts ?? 1,
        },
        {
          onConflict: 'user_id,lesson_id,problem_index',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error updating practice progress:', error)
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Progress updated successfully',
      progress,
    })
  } catch (error) {
    console.error('Error in practice progress endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
