import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock supabase
const mockUser = { id: 'user-123', email: 'test@example.com' }
const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser } })),
    },
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

vi.mock('@/lib/gemini', () => ({
  explainRocketConcept: vi.fn(() => Promise.resolve('This is an AI answer about rockets.')),
  explainRocketConceptStream: vi.fn(function* () {
    yield { type: 'chunk', data: 'Streamed ' }
    yield { type: 'chunk', data: 'answer' }
    yield { type: 'suggestions', data: ['Follow-up 1'] }
  }),
}))

vi.mock('@/lib/rateLimit', () => ({
  getRateLimitInfo: vi.fn(() => Promise.resolve({ remaining: 10, dailyRemaining: 100 })),
}))

describe('POST /api/gemini/ask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ error: null })
  })

  it('returns 401 when user is not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      },
      from: mockFrom,
      rpc: mockRpc,
    } as never)

    const request = new NextRequest('http://localhost/api/gemini/ask', {
      method: 'POST',
      body: JSON.stringify({ question: 'What is thrust?' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe('Sign in to ask questions')
  })

  it('returns 400 when question is missing', async () => {
    const request = new NextRequest('http://localhost/api/gemini/ask', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('question')
  })

  it('returns 400 when question is too long', async () => {
    const request = new NextRequest('http://localhost/api/gemini/ask', {
      method: 'POST',
      body: JSON.stringify({ question: 'a'.repeat(5001) }),
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('too long')
  })

  it('returns 400 when lesson context is too long', async () => {
    const request = new NextRequest('http://localhost/api/gemini/ask', {
      method: 'POST',
      body: JSON.stringify({ question: 'What is thrust?', lessonContext: 'a'.repeat(10001) }),
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('Lesson context')
  })

  it('returns 400 when history is too long', async () => {
    const request = new NextRequest('http://localhost/api/gemini/ask', {
      method: 'POST',
      body: JSON.stringify({ question: 'What is thrust?', history: Array(51).fill({ role: 'user', content: 'hi' }) }),
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('history')
  })

  it('returns answer for valid question', async () => {
    const request = new NextRequest('http://localhost/api/gemini/ask', {
      method: 'POST',
      body: JSON.stringify({ question: 'What is thrust?' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.answer).toBe('This is an AI answer about rockets.')
    expect(json.rateLimit).toBeDefined()
  })

  it('increments AI questions count', async () => {
    const request = new NextRequest('http://localhost/api/gemini/ask', {
      method: 'POST',
      body: JSON.stringify({ question: 'What is thrust?' }),
    })
    await POST(request)

    expect(mockRpc).toHaveBeenCalledWith('increment_ai_questions', { user_id: mockUser.id })
  })

  it('returns streaming response when stream=true', async () => {
    const request = new NextRequest('http://localhost/api/gemini/ask', {
      method: 'POST',
      body: JSON.stringify({ question: 'What is thrust?', stream: true }),
    })
    const response = await POST(request)

    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    expect(response.headers.get('Cache-Control')).toBe('no-cache')
  })

  it('passes concept and lessonContext to AI', async () => {
    const { explainRocketConcept } = await import('@/lib/gemini')

    const request = new NextRequest('http://localhost/api/gemini/ask', {
      method: 'POST',
      body: JSON.stringify({
        question: 'How does it work?',
        concept: 'Rocket Propulsion',
        lessonContext: 'We are studying Newton\'s Third Law',
      }),
    })
    await POST(request)

    expect(explainRocketConcept).toHaveBeenCalledWith({
      concept: 'Rocket Propulsion',
      lessonContext: 'We are studying Newton\'s Third Law',
      studentQuestion: 'How does it work?',
      history: [],
    })
  })

  it('returns 500 on AI error', async () => {
    const { explainRocketConcept } = await import('@/lib/gemini')
    vi.mocked(explainRocketConcept).mockRejectedValueOnce(new Error('AI failed'))

    const request = new NextRequest('http://localhost/api/gemini/ask', {
      method: 'POST',
      body: JSON.stringify({ question: 'What is thrust?' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toContain('Failed to generate answer')
  })
})
