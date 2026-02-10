import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { explainRocketConcept, explainRocketConceptStream } from '@/lib/gemini'
import { getRateLimitInfo } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to ask questions' }, { status: 401 })
  }

  // Get rate limit info from Redis (stored by middleware)
  const rateLimit = await getRateLimitInfo(req)

  const body = await req.json()
  const { concept, lessonContext, question, history, stream } = body

  if (!question) {
    return NextResponse.json(
      { error: 'Missing required field: question' },
      { status: 400 }
    )
  }

  // Input validation to prevent abuse
  if (question.length > 5000) {
    return NextResponse.json(
      { error: 'Question is too long. Maximum 5000 characters.' },
      { status: 400 }
    )
  }

  if (lessonContext && lessonContext.length > 10000) {
    return NextResponse.json(
      { error: 'Lesson context is too long. Maximum 10000 characters.' },
      { status: 400 }
    )
  }

  if (history && history.length > 50) {
    return NextResponse.json(
      { error: 'Conversation history is too long. Maximum 50 messages.' },
      { status: 400 }
    )
  }

  // Increment AI questions count on profile (don't wait for it)
  void supabase.rpc('increment_ai_questions', { user_id: user.id })

  // Handle streaming response
  if (stream) {
    try {
      const encoder = new TextEncoder()
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            const generator = explainRocketConceptStream({
              concept: concept || 'rocket science',
              lessonContext: lessonContext || '',
              studentQuestion: question,
              history: history || [],
            })

            for await (const chunk of generator) {
              if (chunk.type === 'chunk') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: chunk.data })}\n\n`))
              } else if (chunk.type === 'suggestions') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ suggestions: chunk.data })}\n\n`))
              }
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
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
    } catch {
      return NextResponse.json(
        { error: 'Failed to start stream. Please try again.' },
        { status: 500 }
      )
    }
  }

  // Non-streaming response (fallback)
  try {
    const answer = await explainRocketConcept({
      concept: concept || 'rocket science',
      lessonContext: lessonContext || '',
      studentQuestion: question,
      history: history || [],
    })

    return NextResponse.json({ answer, rateLimit })
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate answer. Please try again.' },
      { status: 500 }
    )
  }
}
