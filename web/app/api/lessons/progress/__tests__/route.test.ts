import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock supabase
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

vi.mock('@/lib/streaks/streakTracker', () => ({
  updateStreak: vi.fn(() => Promise.resolve({ currentStreak: 1, longestStreak: 1, isNewStreak: false })),
}))

vi.mock('@/lib/leaderboard/syncLeaderboard', () => ({
  syncLeaderboardEntry: vi.fn(() => Promise.resolve()),
}))

describe('POST /api/lessons/progress', () => {
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

    const request = new NextRequest('http://localhost/api/lessons/progress', {
      method: 'POST',
      body: JSON.stringify({ lessonId: 'lesson-1', moduleId: 'module-1' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('returns 400 when lessonId is missing', async () => {
    const request = new NextRequest('http://localhost/api/lessons/progress', {
      method: 'POST',
      body: JSON.stringify({ moduleId: 'module-1' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('lessonId')
  })

  it('returns 400 when moduleId is missing', async () => {
    const request = new NextRequest('http://localhost/api/lessons/progress', {
      method: 'POST',
      body: JSON.stringify({ lessonId: 'lesson-1' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('moduleId')
  })

  it('returns 400 for non-string lessonId', async () => {
    const request = new NextRequest('http://localhost/api/lessons/progress', {
      method: 'POST',
      body: JSON.stringify({ lessonId: 123, moduleId: 'module-1' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('format')
  })

  it('returns 400 for too long lessonId', async () => {
    const request = new NextRequest('http://localhost/api/lessons/progress', {
      method: 'POST',
      body: JSON.stringify({ lessonId: 'a'.repeat(101), moduleId: 'module-1' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('length')
  })

  it('validates quiz scores - both must be provided together', async () => {
    // Mock lesson query
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    })

    const request = new NextRequest('http://localhost/api/lessons/progress', {
      method: 'POST',
      body: JSON.stringify({ lessonId: 'lesson-1', moduleId: 'module-1', quizScore: 5 }),
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('quizScore and quizTotal')
  })

  it('validates quiz score cannot exceed total', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    })

    const request = new NextRequest('http://localhost/api/lessons/progress', {
      method: 'POST',
      body: JSON.stringify({ lessonId: 'lesson-1', moduleId: 'module-1', quizScore: 10, quizTotal: 5 }),
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('cannot exceed')
  })

  it('validates quiz scores must be non-negative', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    })

    const request = new NextRequest('http://localhost/api/lessons/progress', {
      method: 'POST',
      body: JSON.stringify({ lessonId: 'lesson-1', moduleId: 'module-1', quizScore: -1, quizTotal: 5 }),
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('non-negative')
  })

  it('validates quiz total has reasonable limit', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    })

    const request = new NextRequest('http://localhost/api/lessons/progress', {
      method: 'POST',
      body: JSON.stringify({ lessonId: 'lesson-1', moduleId: 'module-1', quizScore: 50, quizTotal: 150 }),
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('Invalid quiz total')
  })

  it('updates progress successfully', async () => {
    // Mock lesson query (not found in DB, using static content)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    })

    // Mock upsert
    mockFrom.mockReturnValueOnce({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })

    // Mock count query
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 5 }),
      }),
    })

    // Mock profile update
    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const request = new NextRequest('http://localhost/api/lessons/progress', {
      method: 'POST',
      body: JSON.stringify({ lessonId: 'lesson-1', moduleId: 'module-1', completed: true }),
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
  })
})

describe('GET /api/lessons/progress', () => {
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

    const request = new NextRequest('http://localhost/api/lessons/progress')
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('returns all progress for user', async () => {
    const mockProgress = [
      { lesson_id: 'lesson-1', module_id: 'module-1', completed: true },
      { lesson_id: 'lesson-2', module_id: 'module-1', completed: true },
    ]

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: mockProgress, error: null }),
    })

    const request = new NextRequest('http://localhost/api/lessons/progress')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.progress).toEqual(mockProgress)
  })

  it('filters by moduleId when provided', async () => {
    const mockProgress = [
      { lesson_id: 'lesson-1', module_id: 'module-1', completed: true },
    ]

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    // Chain eq calls
    mockQuery.eq = vi.fn()
      .mockReturnValueOnce(mockQuery) // First eq (user_id)
      .mockResolvedValueOnce({ data: mockProgress, error: null }) // Second eq (module_id)

    mockFrom.mockReturnValueOnce(mockQuery)

    const request = new NextRequest('http://localhost/api/lessons/progress?moduleId=module-1')
    const response = await GET(request)

    expect(response.status).toBe(200)
  })

  it('includes cache control headers', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const request = new NextRequest('http://localhost/api/lessons/progress')
    const response = await GET(request)

    expect(response.headers.get('Cache-Control')).toBe('private, max-age=10, stale-while-revalidate=30')
  })
})
