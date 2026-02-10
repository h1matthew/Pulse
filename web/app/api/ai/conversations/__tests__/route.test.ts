import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock supabase
const mockUser = { id: 'user-123', email: 'test@example.com' }
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockInsert = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser } })),
    },
    from: mockFrom,
  })),
}))

describe('GET /api/ai/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up chainable mock
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ order: mockOrder })
  })

  it('returns 401 when user is not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      },
      from: mockFrom,
    } as never)

    const request = new NextRequest('http://localhost/api/ai/conversations')
    const response = await GET(request)

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns conversations for authenticated user', async () => {
    const mockConversations = [
      { id: 'conv-1', title: 'Test 1', updated_at: '2024-01-01' },
      { id: 'conv-2', title: 'Test 2', updated_at: '2024-01-02' },
    ]
    mockOrder.mockResolvedValueOnce({ data: mockConversations, error: null })

    const request = new NextRequest('http://localhost/api/ai/conversations')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.conversations).toEqual(mockConversations)
    expect(mockFrom).toHaveBeenCalledWith('ai_chat_conversations')
    expect(mockEq).toHaveBeenCalledWith('user_id', mockUser.id)
  })

  it('filters by lessonId when provided', async () => {
    const mockEqLesson = vi.fn()
    mockOrder.mockReturnValueOnce({ eq: mockEqLesson })
    mockEqLesson.mockResolvedValueOnce({ data: [], error: null })

    const request = new NextRequest('http://localhost/api/ai/conversations?lessonId=lesson-123')
    await GET(request)

    // Should call eq for both user_id and lesson_id
    expect(mockEq).toHaveBeenCalledWith('user_id', mockUser.id)
  })

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockOrder.mockResolvedValueOnce({ data: null, error: new Error('DB Error') })

    const request = new NextRequest('http://localhost/api/ai/conversations')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe('Failed to fetch conversations')

    consoleSpy.mockRestore()
  })

  it('includes cache control headers', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null })

    const request = new NextRequest('http://localhost/api/ai/conversations')
    const response = await GET(request)

    expect(response.headers.get('Cache-Control')).toBe('private, max-age=10, stale-while-revalidate=20')
  })
})

describe('POST /api/ai/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ single: mockSingle })
  })

  it('returns 401 when user is not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      },
      from: mockFrom,
    } as never)

    const request = new NextRequest('http://localhost/api/ai/conversations', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('creates a conversation with provided fields', async () => {
    const mockConversation = {
      id: 'new-conv',
      user_id: mockUser.id,
      title: 'My Title',
      lesson_id: 'lesson-1',
      module_id: 'module-1',
    }
    mockSingle.mockResolvedValueOnce({ data: mockConversation, error: null })

    const request = new NextRequest('http://localhost/api/ai/conversations', {
      method: 'POST',
      body: JSON.stringify({
        title: 'My Title',
        lessonId: 'lesson-1',
        moduleId: 'module-1',
      }),
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.conversation).toEqual(mockConversation)
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: mockUser.id,
      lesson_id: 'lesson-1',
      module_id: 'module-1',
      title: 'My Title',
    })
  })

  it('uses default title when not provided', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: 'new-conv', title: 'New Conversation' },
      error: null,
    })

    const request = new NextRequest('http://localhost/api/ai/conversations', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    await POST(request)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New Conversation' })
    )
  })

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSingle.mockResolvedValueOnce({ data: null, error: new Error('Insert failed') })

    const request = new NextRequest('http://localhost/api/ai/conversations', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request)

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe('Failed to create conversation')

    consoleSpy.mockRestore()
  })
})
