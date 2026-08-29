import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Google Generative AI module
const mockGenerateContent = vi.fn()
const mockGenerateContentStream = vi.fn()
const mockSendMessage = vi.fn()
const mockSendMessageStream = vi.fn()
const mockStartChat = vi.fn()

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream,
        startChat: mockStartChat,
      }
    }
  },
}))

vi.mock('@/lib/gemini-business', () => ({
  sanitizeForPrompt: vi.fn((input: string) => input),
}))

import {
  getQuickResponse,
  generateAssistantResponse,
  generateAssistantResponseStream,
} from '../assistant'

describe('assistant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStartChat.mockReturnValue({
      sendMessage: mockSendMessage,
      sendMessageStream: mockSendMessageStream,
    })
  })

  describe('getQuickResponse', () => {
    it('should return a greeting response for "hi"', () => {
      const result = getQuickResponse('hi')
      expect(result).toBeTruthy()
      expect(result).toContain('Welcome to Pulse')
    })

    it('should return a greeting response for "hello"', () => {
      const result = getQuickResponse('Hello there!')
      expect(result).toBeTruthy()
      expect(result).toContain('Welcome to Pulse')
    })

    it('should return a thanks response', () => {
      const result = getQuickResponse('thanks!')
      expect(result).toBeTruthy()
      expect(result).toContain('welcome')
    })

    it('should return a goodbye response', () => {
      const result = getQuickResponse('bye')
      expect(result).toBeTruthy()
      expect(result).toContain('See you')
    })

    it('should return a help response for "help"', () => {
      const result = getQuickResponse('help')
      expect(result).toBeTruthy()
      expect(result).toContain('Pulse assistant')
    })

    it('should return null for non-matching messages', () => {
      expect(getQuickResponse('find me a coffee shop')).toBeNull()
      expect(getQuickResponse('what is the local multiplier effect?')).toBeNull()
      expect(getQuickResponse('how do missions work?')).toBeNull()
    })

    it('should return null for empty string', () => {
      expect(getQuickResponse('')).toBeNull()
    })
  })

  describe('generateAssistantResponse', () => {
    it('should return text and suggestions for a simple message', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Here are some great options!\n\n<suggestions>\n["Try the Discover page", "Search by category", "Check deals"]\n</suggestions>',
        },
      })

      const result = await generateAssistantResponse('find me a coffee shop')

      expect(result.text).toBe('Here are some great options!')
      expect(result.suggestions).toEqual([
        'Try the Discover page',
        'Search by category',
        'Check deals',
      ])
    })

    it('should handle response without suggestions tag', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Here is a helpful response without suggestions.',
        },
      })

      const result = await generateAssistantResponse('tell me about Pulse')

      expect(result.text).toBe('Here is a helpful response without suggestions.')
      expect(result.suggestions).toEqual([])
    })

    it('should use chat history for multi-turn conversations', async () => {
      mockSendMessage.mockResolvedValue({
        response: {
          text: () => 'Based on your previous question, here is more info.',
        },
      })

      const result = await generateAssistantResponse('tell me more', {
        history: [
          { role: 'user', content: 'find coffee shops' },
          { role: 'assistant', content: 'Here are some options!' },
        ],
      })

      expect(mockStartChat).toHaveBeenCalled()
      expect(mockSendMessage).toHaveBeenCalledWith('tell me more')
      expect(result.text).toBe('Based on your previous question, here is more info.')
    })

    it('should pass location context when provided', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Great local spots near you!',
        },
      })

      await generateAssistantResponse('nearby restaurants', {
        userContext: {
          location: { lat: 47.6, lng: -122.3 },
        },
      })

      expect(mockGenerateContent).toHaveBeenCalled()
      const prompt = mockGenerateContent.mock.calls[0][0]
      expect(prompt).toContain('location')
    })
  })

  describe('generateAssistantResponseStream', () => {
    it('should yield text chunks and then suggestions', async () => {
      const mockStream = {
        stream: (async function* () {
          yield { text: () => 'Hello ' }
          yield { text: () => 'world!' }
          yield { text: () => '\n<suggestions>\n["Q1?", "Q2?", "Q3?"]\n</suggestions>' }
        })(),
      }

      mockGenerateContentStream.mockResolvedValue(mockStream)

      const chunks: Array<{ type: string; data: string | string[] }> = []
      for await (const chunk of generateAssistantResponseStream('test message')) {
        chunks.push(chunk)
      }

      // Should have text chunks and a final suggestions chunk
      const textChunks = chunks.filter((c) => c.type === 'chunk')
      const suggestionChunks = chunks.filter((c) => c.type === 'suggestions')

      expect(textChunks.length).toBeGreaterThanOrEqual(2)
      expect(suggestionChunks).toHaveLength(1)
      expect(suggestionChunks[0].data).toEqual(['Q1?', 'Q2?', 'Q3?'])
    })

    it('should use chat for multi-turn streaming', async () => {
      const mockStream = {
        stream: (async function* () {
          yield { text: () => 'Streaming response' }
        })(),
      }

      mockSendMessageStream.mockResolvedValue(mockStream)

      const chunks: Array<{ type: string; data: string | string[] }> = []
      for await (const chunk of generateAssistantResponseStream('more info', {
        history: [
          { role: 'user', content: 'initial question' },
          { role: 'assistant', content: 'initial answer' },
        ],
      })) {
        chunks.push(chunk)
      }

      expect(mockStartChat).toHaveBeenCalled()
      expect(mockSendMessageStream).toHaveBeenCalledWith('more info')
      expect(chunks.some((c) => c.type === 'chunk')).toBe(true)
    })
  })
})
