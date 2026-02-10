import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { explainRocketConcept, explainRocketConceptStream } from '@/lib/gemini'
import { getRateLimitInfo } from '@/lib/rateLimit'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/ai/conversations/[id]/messages - Add message and get AI response
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get rate limit info from Redis (stored by middleware)
    const rateLimit = await getRateLimitInfo(request)

    const body = await request.json()
    const { content, lessonContext, stream, skipAI, role } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    // Input validation to prevent abuse
    if (content.length > 10000) {
      return NextResponse.json(
        { error: 'Message is too long. Maximum 10000 characters.' },
        { status: 400 }
      )
    }

    if (lessonContext && lessonContext.length > 10000) {
      return NextResponse.json(
        { error: 'Lesson context is too long. Maximum 10000 characters.' },
        { status: 400 }
      )
    }

    // Validate conversation ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 })
    }

    // If skipAI is true, just save the message without calling AI
    if (skipAI) {
      const messageRole = role || 'user'
      const { data: insertedMessage, error: insertError } = await supabase
        .from('ai_chat_messages')
        .insert({
          conversation_id: id,
          role: messageRole,
          content,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting message:', insertError)
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
      }

      return NextResponse.json({ message: insertedMessage, skipped: true, rateLimit })
    }

    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Fetch existing messages for context
    const { data: existingMessages } = await supabase
      .from('ai_chat_messages')
      .select('role, content')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    // Insert user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('ai_chat_messages')
      .insert({
        conversation_id: id,
        role: 'user',
        content,
      })
      .select()
      .single()

    if (userMsgError) {
      console.error('Error inserting user message:', userMsgError)
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    // Auto-generate title from first user message if still "New Conversation"
    if (conversation.title === 'New Conversation' && conversation.message_count === 0) {
      const autoTitle = content.slice(0, 50) + (content.length > 50 ? '...' : '')
      await supabase
        .from('ai_chat_conversations')
        .update({ title: autoTitle })
        .eq('id', id)
    }

    // Build history for Gemini
    const history = (existingMessages || []).map((m) => ({
      role: m.role as 'user' | 'model',
      content: m.content,
    }))

    // Handle streaming response
    if (stream) {
      const encoder = new TextEncoder()
      let fullResponse = ''
      let suggestions: string[] = []

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            const generator = explainRocketConceptStream({
              concept: lessonContext || 'Rocket Science',
              lessonContext: lessonContext || 'General rocket science and aerospace engineering questions',
              studentQuestion: content,
              history: history.length > 0 ? history : undefined,
            })

            for await (const chunk of generator) {
              if (chunk.type === 'chunk') {
                fullResponse += chunk.data
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: chunk.data })}\n\n`))
              } else if (chunk.type === 'suggestions') {
                suggestions = chunk.data as string[]
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ suggestions: chunk.data })}\n\n`))
              }
            }

            // Clean up the response by removing suggestion tags
            const cleanResponse = fullResponse.replace(/<suggestions>[\s\S]*?<\/suggestions>/g, '').trim()

            // Save AI message to database
            const { data: aiMessage, error: aiMsgError } = await supabase
              .from('ai_chat_messages')
              .insert({
                conversation_id: id,
                role: 'model',
                content: cleanResponse,
              })
              .select()
              .single()

            if (aiMsgError) {
              console.error('Error inserting AI message:', aiMsgError)
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, messageId: aiMessage?.id })}\n\n`))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
            console.error('Streaming error:', error)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`))
            controller.close()
          }
        },
      })

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Non-streaming response (fallback)
    let aiResponse: string
    try {
      aiResponse = await explainRocketConcept({
        concept: lessonContext || 'Rocket Science',
        lessonContext: lessonContext || 'General rocket science and aerospace engineering questions',
        studentQuestion: content,
        history: history.length > 0 ? history : undefined,
      })
    } catch (aiError) {
      console.error('Error getting AI response:', aiError)
      aiResponse = 'Sorry, I couldn\'t generate a response. Please try again.'
    }

    // Insert AI response
    const { data: aiMessage, error: aiMsgError } = await supabase
      .from('ai_chat_messages')
      .insert({
        conversation_id: id,
        role: 'model',
        content: aiResponse,
      })
      .select()
      .single()

    if (aiMsgError) {
      console.error('Error inserting AI message:', aiMsgError)
    }

    return NextResponse.json({
      userMessage,
      aiMessage,
      answer: aiResponse,
      rateLimit,
    })
  } catch (error) {
    console.error('Error in POST /api/ai/conversations/[id]/messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
