/**
 * Gemini AI mock for testing.
 * Provides mock implementations for Gemini API interactions including streaming.
 */
import { vi } from 'vitest'

// Mock response content
export interface MockGeminiResponse {
  text: string
  chunks?: string[]
}

// Create a mock text response
export function createMockTextResponse(text: string) {
  return {
    response: {
      text: () => text,
    },
  }
}

// Create mock chat functions
export function createMockChat(responses: string[] = ['Mock AI response']) {
  let responseIndex = 0

  const mockSendMessage = vi.fn(() => {
    const response = responses[responseIndex] || responses[responses.length - 1]
    responseIndex++
    return Promise.resolve(createMockTextResponse(response))
  })

  const mockStartChat = vi.fn(() => ({
    sendMessage: mockSendMessage,
    sendMessageStream: vi.fn(() => createMockStream(responses[responseIndex] || responses[responses.length - 1])),
  }))

  return { mockStartChat, mockSendMessage }
}

// Create mock streaming response
export function createMockStream(content: string) {
  const chunks = content.split(' ')
  let index = 0

  return {
    stream: {
      [Symbol.asyncIterator]() {
        return {
          async next() {
            if (index >= chunks.length) {
              return { done: true, value: undefined }
            }
            const chunk = chunks[index] + (index < chunks.length - 1 ? ' ' : '')
            index++
            return {
              done: false,
              value: { text: () => chunk },
            }
          },
        }
      },
    },
  }
}

// Create mock GenerativeModel
export function createMockGenerativeModel(options: {
  defaultResponse?: string
  responses?: string[]
} = {}) {
  const { defaultResponse = 'Mock AI response', responses = [defaultResponse] } = options
  const { mockStartChat, mockSendMessage } = createMockChat(responses)

  const mockGenerateContent = vi.fn(() =>
    Promise.resolve(createMockTextResponse(responses[0]))
  )

  const mockGenerateContentStream = vi.fn(() =>
    Promise.resolve(createMockStream(responses[0]))
  )

  return {
    generateContent: mockGenerateContent,
    generateContentStream: mockGenerateContentStream,
    startChat: mockStartChat,
    mockSendMessage,
    mockGenerateContent,
  }
}

// Create full GoogleGenerativeAI mock
export function createMockGoogleGenerativeAI(modelOptions: {
  defaultResponse?: string
  responses?: string[]
} = {}) {
  const model = createMockGenerativeModel(modelOptions)
  const mockGetGenerativeModel = vi.fn(() => model)

  class MockGoogleGenerativeAI {
    getGenerativeModel = mockGetGenerativeModel
  }

  return {
    MockGoogleGenerativeAI,
    mockGetGenerativeModel,
    model,
  }
}

// Setup Gemini mock for vi.mock
export function setupGeminiMock(options: {
  defaultResponse?: string
  responses?: string[]
} = {}) {
  const { MockGoogleGenerativeAI, mockGetGenerativeModel, model } =
    createMockGoogleGenerativeAI(options)

  vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: MockGoogleGenerativeAI,
  }))

  return { mockGetGenerativeModel, model }
}

// Mock SSE stream response for fetch
export function createMockSSEResponse(content: string, suggestions?: string[]) {
  const encoder = new TextEncoder()
  let isClosed = false

  const stream = new ReadableStream({
    start(controller) {
      const chunks = content.split(' ')
      chunks.forEach((chunk, i) => {
        if (!isClosed) {
          const text = chunk + (i < chunks.length - 1 ? ' ' : '')
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`))
        }
      })
      if (suggestions && !isClosed) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ suggestions })}\n\n`))
      }
      if (!isClosed) {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
        isClosed = true
      }
    },
  })

  return {
    ok: true,
    status: 200,
    body: stream,
    json: async () => ({ answer: content }),
    headers: new Headers({ 'Content-Type': 'text/event-stream' }),
  }
}

// Mock rate limited response
export function createMockRateLimitResponse(
  remaining: number,
  resetTime: number,
  dailyRemaining = 100,
  dailyLimit = 100
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      rateLimit: {
        remaining,
        resetTime,
        dailyRemaining,
        dailyLimit,
      },
    }),
  }
}

// Mock error response
export function createMockErrorResponse(status: number, message: string) {
  return {
    ok: false,
    status,
    json: async () => ({ error: message }),
  }
}
