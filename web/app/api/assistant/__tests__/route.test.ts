import { describe, it, expect, vi } from 'vitest'
import { POST, GET } from '../route'

// Mock the assistant library
vi.mock('@/lib/assistant', () => ({
  generateAssistantResponse: vi.fn().mockResolvedValue({
    text: 'This is a test response',
    suggestions: ['Follow up 1?', 'Follow up 2?'],
  }),
  generateAssistantResponseStream: vi.fn(),
  generateFallbackResponse: vi.fn().mockResolvedValue({
    text: 'Here are some top-rated local spots:\n\n• Little Skewer — 4.8 stars (212 reviews), Diamond Bar',
    suggestions: ['What are Boost Missions?', 'How does supporting local help?', 'Find me a coffee shop'],
    degraded: true,
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

      const response = await POST(request as never)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Invalid request')
    })

    it('should return quick response for greetings', async () => {
      const request = new Request('http://localhost/api/assistant', {
        method: 'POST',
        body: JSON.stringify({ message: 'hi there' }),
      })

      const response = await POST(request as never)
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

      const response = await POST(request as never)
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

      const response = await POST(request as never)
      expect(response.status).toBe(200)
    })

    it('should enforce message length limit', async () => {
      const longMessage = 'a'.repeat(3000)
      const request = new Request('http://localhost/api/assistant', {
        method: 'POST',
        body: JSON.stringify({ message: longMessage }),
      })

      const response = await POST(request as never)
      expect(response.status).toBe(400)
    })

    it('should return a non-degraded response when the LLM works', async () => {
      const request = new Request('http://localhost/api/assistant', {
        method: 'POST',
        body: JSON.stringify({ message: 'test query' }),
      })

      const response = await POST(request as never)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.text).toBe('This is a test response')
      expect(data.suggestions).toEqual(['Follow up 1?', 'Follow up 2?'])
      expect(data.degraded).toBeUndefined()
    })

    it('should fall back to a degraded 200 response when the LLM fails', async () => {
      const { generateAssistantResponse, generateFallbackResponse } =
        await import('@/lib/assistant')
      vi.mocked(generateAssistantResponse).mockRejectedValueOnce(
        new Error('API key expired. Please renew the API key.')
      )

      const request = new Request('http://localhost/api/assistant', {
        method: 'POST',
        body: JSON.stringify({ message: 'find me a restaurant' }),
      })

      const response = await POST(request as never)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.degraded).toBe(true)
      expect(data.text).toContain('Little Skewer')
      expect(data.suggestions).toHaveLength(3)
      expect(generateFallbackResponse).toHaveBeenCalledWith(
        'find me a restaurant',
        { location: undefined }
      )
    })

    it('should pass location to the fallback when the LLM fails', async () => {
      const { generateAssistantResponse, generateFallbackResponse } =
        await import('@/lib/assistant')
      vi.mocked(generateAssistantResponse).mockRejectedValueOnce(
        new Error('API key expired')
      )

      const request = new Request('http://localhost/api/assistant', {
        method: 'POST',
        body: JSON.stringify({
          message: 'food near me',
          location: { lat: 34.0286, lng: -117.8103 },
        }),
      })

      const response = await POST(request as never)
      expect(response.status).toBe(200)
      expect(generateFallbackResponse).toHaveBeenCalledWith('food near me', {
        location: { lat: 34.0286, lng: -117.8103 },
      })
    })

    it('should stream SSE chunks when the LLM works with stream:true', async () => {
      const { generateAssistantResponseStream } = await import('@/lib/assistant')
      vi.mocked(generateAssistantResponseStream).mockImplementationOnce(
        async function* () {
          yield { type: 'chunk', data: 'Hello ' }
          yield { type: 'chunk', data: 'world' }
          yield { type: 'suggestions', data: ['Q1?', 'Q2?', 'Q3?'] }
        }
      )

      const request = new Request('http://localhost/api/assistant', {
        method: 'POST',
        body: JSON.stringify({ message: 'test query', stream: true }),
      })

      const response = await POST(request as never)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')

      const body = await response.text()
      expect(body).toContain('Hello ')
      expect(body).toContain('world')
      expect(body).toContain('suggestions')
    })

    it('should return non-streamed fallback JSON when stream setup fails', async () => {
      const { generateAssistantResponseStream, generateFallbackResponse } =
        await import('@/lib/assistant')
      vi.mocked(generateAssistantResponseStream).mockImplementationOnce(
        async function* () {
          throw new Error('API key expired. Please renew the API key.')
        }
      )

      const request = new Request('http://localhost/api/assistant', {
        method: 'POST',
        body: JSON.stringify({ message: 'find dinner spots', stream: true }),
      })

      const response = await POST(request as never)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('application/json')

      const data = await response.json()
      expect(data.degraded).toBe(true)
      expect(data.text).toContain('Little Skewer')
      expect(generateFallbackResponse).toHaveBeenCalledWith('find dinner spots', {
        location: undefined,
      })
    })
  })

  describe('GET /api/assistant', () => {
    it('should return default suggestions', async () => {
      // Mock NextRequest with nextUrl
      const request = {
        nextUrl: new URL('http://localhost/api/assistant'),
      } as unknown as Request

      const response = await GET(request as never)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.suggestions).toBeInstanceOf(Array)
      expect(data.suggestions.length).toBeGreaterThan(0)
    })

    it('should return category-specific suggestions', async () => {
      const request = {
        nextUrl: new URL('http://localhost/api/assistant?category=discovery'),
      } as unknown as Request

      const response = await GET(request as never)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.suggestions).toBeInstanceOf(Array)
    })

    it('should return general suggestions for unknown category', async () => {
      const request = {
        nextUrl: new URL('http://localhost/api/assistant?category=unknown'),
      } as unknown as Request

      const response = await GET(request as never)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.suggestions).toBeInstanceOf(Array)
    })
  })
})
