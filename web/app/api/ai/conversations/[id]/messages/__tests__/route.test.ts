import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock dependencies
const mockUser = { id: 'user-123', email: 'test@example.com' }
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser } })),
    },
    from: mockFrom,
  })),
}))

vi.mock('@/lib/gemini', () => ({
  explainRocketConcept: vi.fn(() => Promise.resolve('AI response here')),
  explainRocketConceptStream: vi.fn(function* () {
    yield { type: 'chunk', data: 'Streamed ' }
    yield { type: 'chunk', data: 'response' }
    yield { type: 'suggestions', data: ['Follow-up 1', 'Follow-up 2'] }
  }),
}))

vi.mock('@/lib/rateLimit', () => ({
  getRateLimitInfo: vi.fn(() => Promise.resolve({ remaining: 10, dailyRemaining: 100 })),
}))

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

describe('POST /api/ai/conversations/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      },
      from: mockFrom,
    } as never)

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'Hello' }),
    })
    const response = await POST(request, createParams('conv-1'))

    expect(response.status).toBe(401)
  })

  it('returns 400 when content is missing', async () => {
    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1/messages', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request, createParams('11111111-1111-1111-1111-111111111111'))

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Message content is required')
  })

  it('returns 400 when content is too long', async () => {
    const longContent = 'a'.repeat(10001)
    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1/messages', {
      method: 'POST',
      body: JSON.stringify({ content: longContent }),
    })
    const response = await POST(request, createParams('11111111-1111-1111-1111-111111111111'))

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('too long')
  })

  it('returns 400 for invalid conversation ID format', async () => {
    const request = new NextRequest('http://localhost/api/ai/conversations/not-a-uuid/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'Hello' }),
    })
    const response = await POST(request, createParams('not-a-uuid'))

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Invalid conversation ID')
  })

  it('saves message with skipAI flag', async () => {
    const mockInsertedMessage = { id: 'msg-1', role: 'user', content: 'Hello' }
    const mockInsertQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockInsertedMessage, error: null }),
    }
    mockFrom.mockReturnValueOnce(mockInsertQuery)

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'Hello', skipAI: true }),
    })
    const response = await POST(request, createParams('11111111-1111-1111-1111-111111111111'))

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.skipped).toBe(true)
    expect(json.message).toEqual(mockInsertedMessage)
  })

  it('returns 404 when conversation not found', async () => {
    const mockConvQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
    }
    mockFrom.mockReturnValueOnce(mockConvQuery)

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'Hello' }),
    })
    const response = await POST(request, createParams('11111111-1111-1111-1111-111111111111'))

    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe('Conversation not found')
  })

  it('sends message and gets AI response (non-streaming)', async () => {
    const mockConversation = {
      id: '11111111-1111-1111-1111-111111111111',
      user_id: mockUser.id,
      title: 'Test',
      message_count: 1,
    }
    const mockUserMessage = { id: 'msg-1', role: 'user', content: 'What is thrust?' }
    const mockAiMessage = { id: 'msg-2', role: 'model', content: 'AI response here' }

    // Query 1: Get conversation
    const mockConvQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockConversation, error: null }),
    }

    // Query 2: Get existing messages
    const mockMsgListQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }

    // Query 3: Insert user message
    const mockInsertUserQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUserMessage, error: null }),
    }

    // Query 4: Insert AI message
    const mockInsertAiQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockAiMessage, error: null }),
    }

    mockFrom
      .mockReturnValueOnce(mockConvQuery)
      .mockReturnValueOnce(mockMsgListQuery)
      .mockReturnValueOnce(mockInsertUserQuery)
      .mockReturnValueOnce(mockInsertAiQuery)

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'What is thrust?' }),
    })
    const response = await POST(request, createParams('11111111-1111-1111-1111-111111111111'))

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.answer).toBe('AI response here')
    expect(json.userMessage).toEqual(mockUserMessage)
    expect(json.aiMessage).toEqual(mockAiMessage)
    expect(json.rateLimit).toBeDefined()
  })

  it('auto-generates title from first message', async () => {
    const mockConversation = {
      id: '11111111-1111-1111-1111-111111111111',
      user_id: mockUser.id,
      title: 'New Conversation',
      message_count: 0, // First message
    }

    // Query 1: Get conversation
    const mockConvQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockConversation, error: null }),
    }

    // Query 2: Get existing messages
    const mockMsgListQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }

    // Query 3: Insert user message
    const mockInsertUserQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'msg-1' }, error: null }),
    }

    // Query 4: Update title
    const mockUpdateTitleQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }

    // Query 5: Insert AI message
    const mockInsertAiQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'msg-2' }, error: null }),
    }

    mockFrom
      .mockReturnValueOnce(mockConvQuery)
      .mockReturnValueOnce(mockMsgListQuery)
      .mockReturnValueOnce(mockInsertUserQuery)
      .mockReturnValueOnce(mockUpdateTitleQuery)
      .mockReturnValueOnce(mockInsertAiQuery)

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'What is rocket thrust and how does it work?' }),
    })
    await POST(request, createParams('11111111-1111-1111-1111-111111111111'))

    // Check that title was updated
    expect(mockUpdateTitleQuery.update).toHaveBeenCalledWith({
      title: 'What is rocket thrust and how does it work?',
    })
  })

  it('returns streaming response when stream flag is true', async () => {
    const mockConversation = {
      id: '11111111-1111-1111-1111-111111111111',
      user_id: mockUser.id,
      title: 'Test',
      message_count: 1,
    }

    // Query 1: Get conversation
    const mockConvQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockConversation, error: null }),
    }

    // Query 2: Get existing messages
    const mockMsgListQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }

    // Query 3: Insert user message
    const mockInsertUserQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'msg-1' }, error: null }),
    }

    mockFrom
      .mockReturnValueOnce(mockConvQuery)
      .mockReturnValueOnce(mockMsgListQuery)
      .mockReturnValueOnce(mockInsertUserQuery)
      .mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'ai-msg' }, error: null }),
      })

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'Hello', stream: true }),
    })
    const response = await POST(request, createParams('11111111-1111-1111-1111-111111111111'))

    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    expect(response.headers.get('Cache-Control')).toBe('no-cache')
  })
})
