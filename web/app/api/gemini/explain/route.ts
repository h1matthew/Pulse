import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { explainSelectedText, explainSelectedTextStream } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to use AI explanations' }, { status: 401 })
  }

  // Rate limiting is now handled by middleware

  const body = await req.json()
  const { text, lessonContext, lessonTitle, stream } = body

  if (!text) {
    return NextResponse.json(
      { error: 'Missing required field: text' },
      { status: 400 }
    )
  }

  // Limit text length to prevent abuse
  if (text.length > 1000) {
    return NextResponse.json(
      { error: 'Selected text is too long. Please select a shorter passage.' },
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
            const generator = explainSelectedTextStream({
              text,
              lessonContext: lessonContext || '',
              lessonTitle: lessonTitle || 'Rocket Science',
            })

            for await (const chunk of generator) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`))
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
    const explanation = await explainSelectedText({
      text,
      lessonContext: lessonContext || '',
      lessonTitle: lessonTitle || 'Rocket Science',
    })

    return NextResponse.json({ explanation })
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate explanation. Please try again.' },
      { status: 500 }
    )
  }
}
