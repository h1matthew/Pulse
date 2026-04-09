import { GoogleGenerativeAI } from '@google/generative-ai'
import { sanitizeForPrompt } from '@/lib/gemini-business'

export interface StreamChunk {
  type: 'chunk' | 'suggestions'
  data: string | string[]
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const PULSE_SYSTEM_PROMPT = `You are the Pulse AI Assistant — a friendly, knowledgeable guide for a local business discovery platform called Pulse.

## What Pulse Does
Pulse helps users discover and support small, local businesses. Users can:
- Browse and search for local businesses by category, rating, or distance
- Leave reviews and ratings for businesses they visit
- Bookmark favorite businesses
- Claim special deals and coupons from local businesses
- Complete "Boost Missions" (challenges like "Try 3 new coffee shops this month")
- Track their economic impact on the local community through a personal dashboard

## Your Role
You help users with:
1. **Business Recommendations** — Suggest types of businesses or categories based on what they're looking for
2. **Feature Explanations** — Explain how Pulse features work (bookmarks, deals, missions, impact tracking)
3. **Impact Education** — Explain why supporting local businesses matters (local multiplier effect, job creation, community investment)
4. **General Guidance** — Help users navigate the platform and get the most out of Pulse

## Guidelines
- Be warm, enthusiastic, and concise (2-3 paragraphs max)
- Focus on local business discovery — redirect off-topic questions politely
- When recommending businesses, suggest categories or types rather than specific businesses (you don't have access to the database)
- If the user mentions their location, acknowledge it and suggest exploring nearby businesses on the Discover page
- Always end responses with an actionable suggestion (e.g., "Check out the Discover page to find coffee shops near you!")
- Never make up specific business names, addresses, or phone numbers`

interface AssistantOptions {
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  userContext?: {
    userId?: string
    location?: { lat: number; lng: number }
  }
}

/**
 * Check if a message matches a quick-response pattern.
 * Returns a canned response for greetings, thanks, and help requests,
 * or null if the message needs full AI processing.
 */
export function getQuickResponse(message: string): string | null {
  const lower = message.toLowerCase().trim()

  // Greetings
  if (/^(hi|hello|hey|howdy|yo|sup|what'?s up|hiya)\b/.test(lower)) {
    return "Hey there! Welcome to Pulse — your guide to discovering amazing local businesses. I can help you find great spots nearby, explain how your support impacts the local economy, or walk you through any of Pulse's features. What would you like to explore?"
  }

  // Thanks
  if (/^(thanks|thank you|thx|ty|cheers|appreciated)\b/.test(lower)) {
    return "You're welcome! Happy to help. If you have more questions about local businesses or Pulse features, just ask. Keep supporting local — every visit makes a difference!"
  }

  // Goodbye
  if (/^(bye|goodbye|see ya|later|cya|peace)\b/.test(lower)) {
    return "See you later! Remember, every time you visit a local business, you're making a real impact on your community. Happy exploring!"
  }

  // Help
  if (lower === 'help' || lower === '?' || lower === 'what can you do') {
    return "I'm the Pulse AI Assistant! Here's what I can help with:\n\n- **Find businesses** — Tell me what you're looking for (coffee, restaurants, shops, etc.)\n- **Explain features** — Ask about bookmarks, deals, missions, or impact tracking\n- **Impact info** — Learn how supporting local businesses helps your community\n- **Get started** — I'll walk you through how to use Pulse\n\nWhat sounds interesting?"
  }

  return null
}

/**
 * Generate a full AI response using Google Gemini.
 * Handles multi-turn conversations and location context.
 */
export async function generateAssistantResponse(
  message: string,
  options: AssistantOptions = {}
): Promise<{ text: string; suggestions?: string[] }> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
  const sanitizedMessage = sanitizeForPrompt(message, 2000)
  const { history = [], userContext } = options

  let contextNote = ''
  if (userContext?.location) {
    contextNote = `\n\nNote: The user has shared their location (lat: ${userContext.location.lat}, lng: ${userContext.location.lng}). You can acknowledge they're searching locally but don't reveal exact coordinates.`
  }

  if (history.length > 0) {
    const sanitizedHistory = history.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.role === 'user' ? sanitizeForPrompt(msg.content, 1000) : msg.content }],
    }))

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: `[System context: ${PULSE_SYSTEM_PROMPT}${contextNote}]\n\nI have a question about local businesses.` }],
        },
        {
          role: 'model',
          parts: [{ text: "Of course! I'd love to help you discover great local businesses. What are you looking for?" }],
        },
        ...sanitizedHistory,
      ],
    })

    const result = await chat.sendMessage(sanitizedMessage)
    const text = result.response.text()

    return {
      text,
      suggestions: extractSuggestions(text),
    }
  }

  const prompt = `${PULSE_SYSTEM_PROMPT}${contextNote}

## Additional Instructions
After your main response, include exactly 3 follow-up questions the user might want to ask. Format them at the very end like this:
<suggestions>
["First question?", "Second question?", "Third question?"]
</suggestions>

## User's Message
${sanitizedMessage}`

  const result = await model.generateContent(prompt)
  const fullText = result.response.text()

  // Strip the suggestions tag from the visible text
  const cleanText = fullText.replace(/<suggestions>[\s\S]*?<\/suggestions>/g, '').trim()
  const suggestions = extractSuggestions(fullText)

  return {
    text: cleanText,
    suggestions,
  }
}

/**
 * Streaming version of generateAssistantResponse.
 * Yields text chunks in real-time, then follow-up suggestions at the end.
 */
export async function* generateAssistantResponseStream(
  message: string,
  options: AssistantOptions = {}
): AsyncGenerator<StreamChunk> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
  const sanitizedMessage = sanitizeForPrompt(message, 2000)
  const { history = [], userContext } = options

  let contextNote = ''
  if (userContext?.location) {
    contextNote = `\n\nNote: The user has shared their location (lat: ${userContext.location.lat}, lng: ${userContext.location.lng}). You can acknowledge they're searching locally but don't reveal exact coordinates.`
  }

  let fullResponse = ''

  if (history.length > 0) {
    const sanitizedHistory = history.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.role === 'user' ? sanitizeForPrompt(msg.content, 1000) : msg.content }],
    }))

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: `[System context: ${PULSE_SYSTEM_PROMPT}${contextNote}]\n\nI have a question about local businesses.` }],
        },
        {
          role: 'model',
          parts: [{ text: "Of course! I'd love to help you discover great local businesses. What are you looking for?" }],
        },
        ...sanitizedHistory,
      ],
    })

    const result = await chat.sendMessageStream(sanitizedMessage)
    for await (const chunk of result.stream) {
      const chunkText = chunk.text()
      if (chunkText) {
        fullResponse += chunkText
        yield { type: 'chunk', data: chunkText }
      }
    }
  } else {
    const prompt = `${PULSE_SYSTEM_PROMPT}${contextNote}

## Additional Instructions
After your main response, include exactly 3 follow-up questions the user might want to ask. Format them at the very end like this:
<suggestions>
["First question?", "Second question?", "Third question?"]
</suggestions>

## User's Message
${sanitizedMessage}`

    const result = await model.generateContentStream(prompt)
    for await (const chunk of result.stream) {
      const chunkText = chunk.text()
      if (chunkText) {
        fullResponse += chunkText
        yield { type: 'chunk', data: chunkText }
      }
    }
  }

  // Extract and yield suggestions from the accumulated response
  const suggestions = extractSuggestions(fullResponse)
  if (suggestions.length > 0) {
    yield { type: 'suggestions', data: suggestions }
  }
}

/**
 * Extract follow-up suggestions from a response that contains a <suggestions> tag.
 */
function extractSuggestions(text: string): string[] {
  const match = text.match(/<suggestions>\s*\[([\s\S]*?)\]\s*<\/suggestions>/)
  if (!match) return []

  try {
    const parsed = JSON.parse(`[${match[1]}]`)
    if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === 'string')
  } catch {
    // Fallback: extract quoted strings
    const quoted = match[1].match(/"([^"]+)"/g)
    if (quoted) return quoted.map((s) => s.slice(1, -1))
  }

  return []
}
