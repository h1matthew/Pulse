import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from '../route'

// Mock supabase
const mockUser = { id: 'user-123', email: 'test@example.com' }
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockSingle = vi.fn()
const mockRange = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser } })),
    },
    from: mockFrom,
  })),
}))

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/ai/conversations/[id]', () => {
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

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1')
    const response = await GET(request, createParams('conv-1'))

    expect(response.status).toBe(401)
  })

  it('returns 404 when conversation not found', async () => {
    // Set up conversation query to return null
    mockFrom.mockReturnValueOnce({ select: mockSelect })
    mockSelect.mockReturnValueOnce({ eq: mockEq })
    mockEq.mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ single: mockSingle }) })
    mockSingle.mockResolvedValueOnce({ data: null, error: new Error('Not found') })

    const request = new NextRequest('http://localhost/api/ai/conversations/not-found')
    const response = await GET(request, createParams('not-found'))

    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe('Conversation not found')
  })

  it('returns conversation with messages', async () => {
    const mockConversation = { id: 'conv-1', title: 'Test', user_id: mockUser.id }
    const mockMessages = [
      { id: 'msg-1', role: 'user', content: 'Hello' },
      { id: 'msg-2', role: 'model', content: 'Hi there' },
    ]

    // First query: get conversation
    const mockConvQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockConversation, error: null }),
    }

    // Second query: get messages
    const mockMsgQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
    }

    mockFrom
      .mockReturnValueOnce(mockConvQuery)
      .mockReturnValueOnce(mockMsgQuery)

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1')
    const response = await GET(request, createParams('conv-1'))

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.conversation.id).toBe('conv-1')
    expect(json.conversation.messages).toEqual(mockMessages)
    expect(json.pagination).toEqual({
      limit: 100,
      offset: 0,
      hasMore: false,
    })
  })

  it('respects pagination parameters', async () => {
    const mockConversation = { id: 'conv-1', title: 'Test', user_id: mockUser.id }
    const mockMessages = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i}`,
      role: 'user',
      content: `Message ${i}`,
    }))

    const mockConvQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockConversation, error: null }),
    }

    const mockRangeFn = vi.fn().mockResolvedValue({ data: mockMessages, error: null })
    const mockMsgQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: mockRangeFn,
    }

    mockFrom
      .mockReturnValueOnce(mockConvQuery)
      .mockReturnValueOnce(mockMsgQuery)

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1?limit=50&offset=10')
    const response = await GET(request, createParams('conv-1'))

    expect(response.status).toBe(200)
    expect(mockRangeFn).toHaveBeenCalledWith(10, 59) // offset to offset+limit-1
  })

  it('caps limit at 500', async () => {
    const mockConversation = { id: 'conv-1', title: 'Test', user_id: mockUser.id }

    const mockConvQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockConversation, error: null }),
    }

    const mockRangeFn = vi.fn().mockResolvedValue({ data: [], error: null })
    const mockMsgQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: mockRangeFn,
    }

    mockFrom
      .mockReturnValueOnce(mockConvQuery)
      .mockReturnValueOnce(mockMsgQuery)

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1?limit=1000')
    await GET(request, createParams('conv-1'))

    expect(mockRangeFn).toHaveBeenCalledWith(0, 499) // Capped at 500
  })
})

describe('PATCH /api/ai/conversations/[id]', () => {
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

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'New Title' }),
    })
    const response = await PATCH(request, createParams('conv-1'))

    expect(response.status).toBe(401)
  })

  it('returns 400 when title is missing', async () => {
    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1', {
      method: 'PATCH',
      body: JSON.stringify({}),
    })
    const response = await PATCH(request, createParams('conv-1'))

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Title is required')
  })

  it('returns 400 when title is not a string', async () => {
    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 123 }),
    })
    const response = await PATCH(request, createParams('conv-1'))

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Title is required')
  })

  it('updates conversation title', async () => {
    const updatedConversation = { id: 'conv-1', title: 'New Title' }

    const mockQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedConversation, error: null }),
    }

    mockFrom.mockReturnValueOnce(mockQuery)

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'New Title' }),
    })
    const response = await PATCH(request, createParams('conv-1'))

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.conversation.title).toBe('New Title')
  })

  it('truncates title to 100 characters', async () => {
    const longTitle = 'a'.repeat(150)
    const mockUpdateFn = vi.fn().mockReturnThis()

    const mockQuery = {
      update: mockUpdateFn,
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'conv-1', title: longTitle.slice(0, 100) }, error: null }),
    }

    mockFrom.mockReturnValueOnce(mockQuery)

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: longTitle }),
    })
    await PATCH(request, createParams('conv-1'))

    expect(mockUpdateFn).toHaveBeenCalledWith({ title: 'a'.repeat(100) })
  })

  it('returns 404 when conversation not found', async () => {
    const mockQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
    }

    mockFrom.mockReturnValueOnce(mockQuery)

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'New Title' }),
    })
    const response = await PATCH(request, createParams('conv-1'))

    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/ai/conversations/[id]', () => {
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

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1', {
      method: 'DELETE',
    })
    const response = await DELETE(request, createParams('conv-1'))

    expect(response.status).toBe(401)
  })

  it('deletes conversation successfully', async () => {
    const mockQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    // Last eq call should resolve
    mockQuery.eq = vi.fn()
      .mockReturnValueOnce(mockQuery) // First eq (id)
      .mockResolvedValueOnce({ error: null }) // Second eq (user_id)

    mockFrom.mockReturnValueOnce({ delete: vi.fn().mockReturnValue(mockQuery) })

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1', {
      method: 'DELETE',
    })
    const response = await DELETE(request, createParams('conv-1'))

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
  })

  it('returns 500 on delete error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const mockQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn()
        .mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: new Error('Delete failed') }) }),
    }

    mockFrom.mockReturnValueOnce(mockQuery)

    const request = new NextRequest('http://localhost/api/ai/conversations/conv-1', {
      method: 'DELETE',
    })
    const response = await DELETE(request, createParams('conv-1'))

    expect(response.status).toBe(500)

    consoleSpy.mockRestore()
  })
})
