/**
 * Pulse Assistant Library
 *
 * Main exports for the assistant functionality
 */

export * from './prompts'
export * from './rag'

import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  createRecommendationPrompt,
  createImpactPrompt,
  createGeneralPrompt,
  PULSE_ASSISTANT_SYSTEM_PROMPT,
} from './prompts'
import { retrieveContext, type UserContext } from './rag'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantResponse {
  text: string
  suggestions?: string[]
}

/**
 * Sanitize user input for safe inclusion in AI prompts
 */
function sanitizeForPrompt(input: string, maxLength = 2000): string {
  if (!input || typeof input !== 'string') return ''

  return input
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/^#{1,6}\s/gm, '\\# ')
    .replace(/^##\s*(System|Instructions|Rules|Context|IMPORTANT)/gim, '[Section: $1]')
    .replace(/ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|rules?|context)/gi, '[filtered]')
    .replace(/disregard\s+(all\s+)?(previous|above|prior)/gi, '[filtered]')
    .replace(/new\s+instructions?:/gi, '[filtered]:')
    .replace(/you\s+are\s+now/gi, '[filtered]')
    .replace(/from\s+now\s+on/gi, '[filtered]')
    .replace(/forget\s+(everything|all)/gi, '[filtered]')
    .trim()
}

/**
 * Generate a response from the Pulse Assistant
 */
export async function generateAssistantResponse(
  userQuery: string,
  options: {
    history?: AssistantMessage[]
    userContext?: UserContext
  } = {}
): Promise<AssistantResponse> {
  const { history = [], userContext } = options

  // Sanitize the query
  const sanitizedQuery = sanitizeForPrompt(userQuery, 1000)

  // Retrieve relevant context from the database
  const context = await retrieveContext(userQuery, userContext)

  // Determine the type of query and create appropriate prompt
  const lowerQuery = userQuery.toLowerCase()

  let systemPrompt: string

  if (
    context.hasRelevantBusinesses &&
    (lowerQuery.includes('find') ||
      lowerQuery.includes('recommend') ||
      lowerQuery.includes('suggest') ||
      lowerQuery.includes('where') ||
      lowerQuery.includes('looking for'))
  ) {
    // Business discovery query
    systemPrompt = createRecommendationPrompt(
      sanitizedQuery,
      context.businessContext,
      userContext?.city
    )
  } else if (
    lowerQuery.includes('impact') ||
    lowerQuery.includes('dollar') ||
    lowerQuery.includes('help') ||
    lowerQuery.includes('difference') ||
    lowerQuery.includes('why local')
  ) {
    // Impact education query
    systemPrompt = createImpactPrompt(
      sanitizedQuery,
      context.userImpactContext
    )
  } else {
    // General query
    systemPrompt = createGeneralPrompt(sanitizedQuery)
  }

  // Initialize the model
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    },
  })

  // Build the conversation
  const chat = model.startChat({
    history: [
      // System context as first user message (Gemini doesn't have system role)
      {
        role: 'user',
        parts: [{ text: `[System Context: ${PULSE_ASSISTANT_SYSTEM_PROMPT}]\n\nBegin conversation.` }],
      },
      {
        role: 'model',
        parts: [{ text: "Hi. Ask for a place, a category, a deal, or how Pulse records your check-ins." }],
      },
      // Add conversation history
      ...history.flatMap((msg) => [
        {
          role: msg.role === 'user' ? 'user' : 'model' as const,
          parts: [{ text: sanitizeForPrompt(msg.content, 2000) }],
        },
      ]),
    ],
  })

  // Generate response
  const result = await chat.sendMessage(systemPrompt)
  const responseText = result.response.text()

  // Extract suggestions if present (formatted as <!-- suggestions: [...] -->)
  const suggestionsMatch = responseText.match(/<!--\s*suggestions:\s*([\s\S]*?)\s*-->$/)
  let text = responseText
  let suggestions: string[] | undefined

  if (suggestionsMatch) {
    try {
      suggestions = JSON.parse(suggestionsMatch[1])
      text = responseText.slice(0, -suggestionsMatch[0].length).trim()
    } catch {
      // Keep original text if parsing fails
    }
  }

  return {
    text,
    suggestions,
  }
}

/**
 * Generate a streaming response from the Pulse Assistant
 */
export async function* generateAssistantResponseStream(
  userQuery: string,
  options: {
    history?: AssistantMessage[]
    userContext?: UserContext
  } = {}
): AsyncGenerator<{ type: 'chunk'; data: string } | { type: 'complete'; data: AssistantResponse }> {
  const { history = [], userContext } = options

  // Sanitize the query
  const sanitizedQuery = sanitizeForPrompt(userQuery, 1000)

  // Retrieve relevant context from the database
  const context = await retrieveContext(userQuery, userContext)

  // Determine the type of query and create appropriate prompt
  const lowerQuery = userQuery.toLowerCase()

  let systemPrompt: string

  if (
    context.hasRelevantBusinesses &&
    (lowerQuery.includes('find') ||
      lowerQuery.includes('recommend') ||
      lowerQuery.includes('suggest') ||
      lowerQuery.includes('where') ||
      lowerQuery.includes('looking for'))
  ) {
    systemPrompt = createRecommendationPrompt(
      sanitizedQuery,
      context.businessContext,
      userContext?.city
    )
  } else if (
    lowerQuery.includes('impact') ||
    lowerQuery.includes('dollar') ||
    lowerQuery.includes('help') ||
    lowerQuery.includes('difference') ||
    lowerQuery.includes('why local')
  ) {
    systemPrompt = createImpactPrompt(
      sanitizedQuery,
      context.userImpactContext
    )
  } else {
    systemPrompt = createGeneralPrompt(sanitizedQuery)
  }

  // Initialize the model
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    },
  })

  // Build the conversation
  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: `[System Context: ${PULSE_ASSISTANT_SYSTEM_PROMPT}]\n\nBegin conversation.` }],
      },
      {
        role: 'model',
        parts: [{ text: "Hi. Ask for a place, a category, a deal, or how Pulse records your check-ins." }],
      },
      ...history.flatMap((msg) => [
        {
          role: msg.role === 'user' ? 'user' : 'model' as const,
          parts: [{ text: sanitizeForPrompt(msg.content, 2000) }],
        },
      ]),
    ],
  })

  // Generate streaming response
  let fullText = ''
  const result = await chat.sendMessageStream(systemPrompt)

  for await (const chunk of result.stream) {
    const chunkText = chunk.text()
    if (chunkText) {
      fullText += chunkText
      yield { type: 'chunk', data: chunkText }
    }
  }

  // Extract suggestions if present
  const suggestionsMatch = fullText.match(/<!--\s*suggestions:\s*([\s\S]*?)\s*-->$/)
  let text = fullText
  let suggestions: string[] | undefined

  if (suggestionsMatch) {
    try {
      suggestions = JSON.parse(suggestionsMatch[1])
      text = fullText.slice(0, -suggestionsMatch[0].length).trim()
    } catch {
      // Keep original text if parsing fails
    }
  }

  yield {
    type: 'complete',
    data: {
      text,
      suggestions,
    },
  }
}

/**
 * Quick responses for common questions (no AI needed)
 */
export function getQuickResponse(query: string): string | null {
  const lowerQuery = query.toLowerCase()

  // Greetings
  if (/^(hi|hello|hey|greetings)/.test(lowerQuery)) {
    return "Hi. Ask for a place, a category, a deal, or how Pulse records your check-ins."
  }

  // Thanks
  if (/^(thanks|thank you|thx)/.test(lowerQuery)) {
    return "You're welcome. Ask me for a place, a category, a deal, or how Pulse works."
  }

  // Goodbye
  if (/^(bye|goodbye|see you|later)/.test(lowerQuery)) {
    return "See you later."
  }

  // What can you do
  if (lowerQuery.includes('what can you do') || lowerQuery.includes('help me with')) {
    return `I can help you with several things:

**Business discovery**
- Find local businesses by category, vibe, or feature (WiFi, family-friendly, etc.)
- Get recommendations based on what you're looking for
- Learn about specific businesses in our database

**Local-spend ledger**
- Explain how local spending is estimated
- Share facts about the local multiplier effect
- Show you how your actions make a difference

**Using Pulse**
- Answer questions about bookmarks, check-ins, and missions
- Help you understand your impact dashboard
- Guide you through claiming deals

Ask for a place or a feature.`
  }

  return null
}
