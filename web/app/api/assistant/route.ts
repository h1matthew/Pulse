/**
 * Pulse Assistant API Route
 *
 * Handles AI chat requests with RAG (Retrieval Augmented Generation)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  generateAssistantResponse,
  generateAssistantResponseStream,
  generateFallbackResponse,
  getQuickResponse,
} from '@/lib/assistant'

// Validation schema for chat requests
const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(50)
    .optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  stream: z.boolean().optional(),
})

export type ChatRequest = z.infer<typeof chatRequestSchema>

/**
 * POST /api/assistant
 * Generate an AI response to a user message
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = chatRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues,
        },
        { status: 400 }
      )
    }

    const { message, history = [], location, stream = false } = validation.data

    // Check for quick responses (greetings, thanks, etc.)
    const quickResponse = getQuickResponse(message)
    if (quickResponse) {
      return NextResponse.json({
        text: quickResponse,
        suggestions: getFollowUpSuggestions(message),
      })
    }

    // Get user context if authenticated
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userContext = {
      userId: user?.id,
      location,
    }

    // Handle streaming response
    if (stream) {
      try {
        const iterator = generateAssistantResponseStream(message, {
          history,
          userContext,
        })[Symbol.asyncIterator]()

        // Pull the first chunk eagerly so LLM setup failures (e.g. an
        // expired API key) can fall back to a non-streamed response.
        const firstChunk = await iterator.next()

        const encoder = new TextEncoder()
        const sseStream = new ReadableStream({
          async start(controller) {
            try {
              let current = firstChunk
              while (!current.done) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(current.value)}\n\n`)
                )
                current = await iterator.next()
              }
              controller.close()
            } catch (error) {
              controller.error(error)
            }
          },
        })

        return new NextResponse(sseStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      } catch (llmError) {
        console.error('Assistant stream setup failed, using fallback:', llmError)
        const fallback = await generateFallbackResponse(message, { location })
        return NextResponse.json(fallback)
      }
    }

    // Handle non-streaming response; never 500 on LLM unavailability —
    // degrade to a database-backed answer instead.
    try {
      const response = await generateAssistantResponse(message, {
        history,
        userContext,
      })

      return NextResponse.json({
        ...response,
        suggestions: response.suggestions || getFollowUpSuggestions(message),
      })
    } catch (llmError) {
      console.error('Assistant LLM unavailable, using fallback:', llmError)
      const fallback = await generateFallbackResponse(message, { location })
      return NextResponse.json(fallback)
    }
  } catch (error) {
    console.error('Assistant API error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate response',
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

/**
 * Get follow-up suggestions based on the conversation
 */
function getFollowUpSuggestions(message: string): string[] {
  const lowerMessage = message.toLowerCase()

  // Discovery-related follow-ups
  if (
    lowerMessage.includes('coffee') ||
    lowerMessage.includes('cafe') ||
    lowerMessage.includes('wifi') ||
    lowerMessage.includes('work')
  ) {
    return [
      'What are some quiet places to work?',
      'Show me cafes with outdoor seating',
      'Find top-rated local coffee',
    ]
  }

  if (
    lowerMessage.includes('restaurant') ||
    lowerMessage.includes('food') ||
    lowerMessage.includes('eat')
  ) {
    return [
      'What are family-friendly restaurants?',
      'Show me dinner spots',
      'Where can I find vegan options?',
    ]
  }

  // Impact-related follow-ups
  if (
    lowerMessage.includes('impact') ||
    lowerMessage.includes('help') ||
    lowerMessage.includes('difference')
  ) {
    return [
      'How much have I kept local?',
      'What is the local multiplier effect?',
      'How do check-ins affect my ledger?',
    ]
  }

  // Default suggestions
  return [
    'Find me a cozy coffee shop',
    'How does local spending get counted?',
    'How do missions work?',
  ]
}

/**
 * GET /api/assistant/suggestions
 * Get suggested questions for the user
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category') || 'general'

  const suggestions: Record<string, string[]> = {
    discovery: [
      'Find me a quiet coffee shop with WiFi',
      'Show family-friendly restaurants nearby',
      'Show me unique local gift shops',
      'Find a brunch spot',
      'Find a local bookstore',
    ],
    impact: [
      'How does local spending get counted?',
      'What is the local multiplier effect?',
      'How much have I kept local?',
      'Why should I choose local over chains?',
      'How do check-ins affect my ledger?',
    ],
    features: [
      'How do missions work?',
      'What happens when I bookmark a business?',
      'How is my impact score calculated?',
      'How do I claim a deal?',
      'What does a check-in record?',
    ],
    general: [
      'Find me a cozy coffee shop',
      'How does local spending get counted?',
      'How do missions work?',
      'Tell me about Pulse',
      'What makes local businesses special?',
    ],
  }

  return NextResponse.json({
    suggestions: suggestions[category] || suggestions.general,
  })
}
