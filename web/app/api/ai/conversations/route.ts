import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/ai/conversations - List user's conversations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')

    let query = supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (lessonId) {
      query = query.eq('lesson_id', lessonId)
    }

    const { data: conversations, error } = await query

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    return NextResponse.json({ conversations }, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=20',
      },
    })
  } catch (error) {
    console.error('Error in GET /api/ai/conversations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/ai/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { lessonId, moduleId, title } = body

    const { data: conversation, error } = await supabase
      .from('ai_chat_conversations')
      .insert({
        user_id: user.id,
        lesson_id: lessonId || null,
        module_id: moduleId || null,
        title: title || 'New Conversation',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Error in POST /api/ai/conversations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
