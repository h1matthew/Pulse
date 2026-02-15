import { describe, it, expect, vi } from 'vitest'
import {
  getQuickResponse,
} from '../index'

// Mock the entire module to avoid constructor issues
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return {
        startChat: () => ({
          sendMessage: () =>
            Promise.resolve({
              response: {
                text: () => 'This is a test AI response',
              },
            }),
        }),
      }
    }
  },
}))

// Mock the RAG module
vi.mock('../rag', () => ({
  retrieveContext: vi.fn().mockResolvedValue({
    businessContext: 'Test business data',
    userImpactContext: undefined,
    hasRelevantBusinesses: true,
  }),
}))

describe('Assistant Core Functions', () => {
  describe('getQuickResponse', () => {
    it('returns greeting for hi', () => {
      const response = getQuickResponse('hi there')
      expect(response).toContain('Hello')
      expect(response).toContain('Pulse')
    })

    it('returns greeting for hello', () => {
      const response = getQuickResponse('hello!')
      expect(response).toContain('Hello')
    })

    it('returns thanks response', () => {
      const response = getQuickResponse('thanks!')
      expect(response).toContain('welcome')
    })

    it('returns goodbye response', () => {
      const response = getQuickResponse('bye')
      expect(response).toContain('Goodbye')
    })

    it('returns capabilities for "what can you do"', () => {
      const response = getQuickResponse('what can you do?')
      expect(response).toContain('Business Discovery')
      expect(response).toContain('Impact')
    })

    it('returns null for unrecognized queries', () => {
      const response = getQuickResponse('find me a coffee shop')
      expect(response).toBeNull()
    })
  })
})

// Note: Full integration tests for generateAssistantResponse would require
// more sophisticated mocking of the Gemini API streaming responses
// and the Supabase database interactions. The above tests cover
// the quick response path which doesn't require API calls.
