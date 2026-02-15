import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from '../route'

// Mock the assistant library
vi.mock('@/lib/assistant', () => ({
  generateAssistantResponse: vi.fn().mockResolvedValue({
    text: 'This is a test response',
    suggestions: ['Follow up 1?', 'Follow up 2?'],
  }),
  getQuickResponse: vi.fn((msg) => {
    if (msg.toLowerCase().includes('hi')) {
      return 'Hello! Welcome to Pulse!'
    }
    return null
  }),
}))

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
}))

describe('Assistant API Route', () => {
  describe('POST /api/assistant', () => {
    it('should return 400 for invalid request body', async () => {
      const request = new Request('http://localhost/api/assistant', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Invalid request')
    })

    it('should return quick response for greetings', async () => {
      const request = new Request('http://localhost/api/assistant', {
        method: 'POST',
        body: JSON.stringify({ message: 'hi there' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.text).toContain('Hello')
      expect(data.suggestions).toBeDefined()
    })

    it('should accept message with history', async () => {
      const request = new Request('http://localhost/api/assistant', {
        method: 'POST',
        body: JSON.stringify({
          message: 'tell me more',
          history: [
            { role: 'user', content: 'hi' },
            { role: 'assistant', content: 'hello!' },
          ],
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should accept message with location', async () => {
      const request = new Request('http://localhost/api/assistant', {
        method: 'POST',
        body: JSON.stringify({
          message: 'find coffee shops',
          location: { lat: 47.6062, lng: -122.3321 },
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should enforce message length limit', async () => {
      const longMessage = 'a'.repeat(3000)
      const request = new Request('http://localhost/api/assistant', {
        method: 'POST',
        body: JSON.stringify({ message: longMessage }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should handle errors gracefully', async () => {
      // Mock a failing scenario
      const { generateAssistantResponse } = await import('@/lib/assistant')
      vi.mocked(generateAssistantResponse).mockRejectedValueOnce(
        new Error('API Error')
      )

      const request = new Request('http://localhost/api/assistant', {
        method: 'POST',
        body: JSON.stringify({ message: 'test query' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Failed to generate response')
    })
  })

  describe('GET /api/assistant', () => {
    it('should return default suggestions', async () => {
      // Mock NextRequest with nextUrl
      const request = {
        nextUrl: new URL('http://localhost/api/assistant'),
      } as unknown as Request

      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.suggestions).toBeInstanceOf(Array)
      expect(data.suggestions.length).toBeGreaterThan(0)
    })

    it('should return category-specific suggestions', async () => {
      const request = {
        nextUrl: new URL('http://localhost/api/assistant?category=discovery'),
      } as unknown as Request

      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.suggestions).toBeInstanceOf(Array)
    })

    it('should return general suggestions for unknown category', async () => {
      const request = {
        nextUrl: new URL('http://localhost/api/assistant?category=unknown'),
      } as unknown as Request

      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.suggestions).toBeInstanceOf(Array)
    })
  })
})
