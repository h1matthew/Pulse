import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQuizQuestions } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { context, count, difficulty, includeEquations } = await request.json()

    if (!context || typeof context !== 'string') {
      return NextResponse.json({ error: 'Context is required' }, { status: 400 })
    }

    const questions = await generateQuizQuestions({
      lessonContent: context,
      count: count || 5,
      difficulty: difficulty || 'intermediate',
      includeEquations: includeEquations !== false,
      moduleId: 'admin-generated',
    })

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error generating quiz:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz questions' },
      { status: 500 }
    )
  }
}
