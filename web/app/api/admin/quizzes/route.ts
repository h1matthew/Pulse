import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQuizQuestions } from '@/lib/gemini'
import { getLessonContent } from '@/lib/content'
import type { CreateAIQuizRequest } from '@/types/ai-quiz'

/**
 * List AI-generated quizzes for admin review
 * GET /api/admin/quizzes?status=pending&offset=0&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const offset = parseInt(searchParams.get('offset') || '0')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const moduleId = searchParams.get('moduleId')

    // Build query
    let query = supabase
      .from('ai_generated_quizzes')
      .select('*, generated_by:profiles!generated_by(email), reviewed_by:profiles!reviewed_by(email)', { count: 'exact' })
      .eq('status', status)
      .order('generated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (moduleId) {
      query = query.eq('module_id', moduleId)
    }

    const { data: quizzes, count, error } = await query

    if (error) {
      console.error('Error fetching AI quizzes:', error)
      return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 })
    }

    return NextResponse.json({
      quizzes: quizzes || [],
      total: count || 0,
      offset,
      limit,
    })
  } catch (error) {
    console.error('Error in admin quizzes endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Generate new AI quiz questions
 * POST /api/admin/quizzes
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Rate limiting is now handled by middleware

    const body: CreateAIQuizRequest = await request.json()
    const { moduleId, lessonId, count, difficulty, includeEquations } = body

    // Validate input
    if (!moduleId || !count || count < 1 || count > 20) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 })
    }

    // Get lesson content to generate questions from
    let lessonContent = ''
    if (lessonId) {
      const content = getLessonContent(lessonId)
      if (content) {
        lessonContent = content.content.map(block => block.content).join('\n\n')
      }
    }

    if (!lessonContent) {
      return NextResponse.json({ error: 'No lesson content found' }, { status: 400 })
    }

    // Generate quiz questions using Gemini
    const questions = await generateQuizQuestions({
      lessonContent,
      count,
      difficulty,
      includeEquations,
      moduleId,
      lessonId,
    })

    // Store in database as pending
    const { data: quiz, error } = await supabase
      .from('ai_generated_quizzes')
      .insert({
        module_id: moduleId,
        lesson_id: lessonId,
        questions,
        status: 'pending',
        generated_by: user.id,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error storing AI quiz:', error)
      return NextResponse.json({ error: 'Failed to store quiz' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Quiz generated successfully',
      quiz,
    })
  } catch (error) {
    console.error('Error generating AI quiz:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
