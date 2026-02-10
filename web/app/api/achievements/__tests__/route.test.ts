import { describe, it, expect, vi, beforeEach } from 'vitest'
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

vi.mock('@/lib/leaderboard/syncLeaderboard', () => ({
  syncLeaderboardEntry: vi.fn(() => Promise.resolve()),
}))

describe('GET /api/achievements', () => {
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

    const response = await GET()

    expect(response.status).toBe(401)
  })

  it('returns user achievements', async () => {
    const mockAchievements = [
      { achievement_id: 'first-lesson', unlocked_at: '2024-01-01' },
      { achievement_id: 'quiz-perfect', unlocked_at: '2024-01-02' },
    ]

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: mockAchievements, error: null }),
    })

    const response = await GET()

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.achievements).toEqual(mockAchievements)
  })

  it('returns empty array when no achievements', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const response = await GET()

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.achievements).toEqual([])
  })

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    })

    const response = await GET()

    expect(response.status).toBe(500)

    consoleSpy.mockRestore()
  })

  it('includes cache control headers', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const response = await GET()

    expect(response.headers.get('Cache-Control')).toBe('private, max-age=120, stale-while-revalidate=240')
  })
})

describe('POST /api/achievements', () => {
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

    const request = new Request('http://localhost/api/achievements', {
      method: 'POST',
      body: JSON.stringify({ achievementId: 'test-achievement' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('returns 400 when achievementId is missing', async () => {
    const request = new Request('http://localhost/api/achievements', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Achievement ID required')
  })

  it('returns 409 when achievement already unlocked', async () => {
    // Mock check for existing achievement
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'existing' }, error: null }),
    })

    const request = new Request('http://localhost/api/achievements', {
      method: 'POST',
      body: JSON.stringify({ achievementId: 'already-unlocked' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(409)
    const json = await response.json()
    expect(json.error).toBe('Achievement already unlocked')
  })

  it('unlocks achievement successfully', async () => {
    // Mock check for existing achievement (not found)
    const checkQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
    }

    // Mock insert
    const insertQuery = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    }

    mockFrom
      .mockReturnValueOnce(checkQuery)
      .mockReturnValueOnce(insertQuery)

    const request = new Request('http://localhost/api/achievements', {
      method: 'POST',
      body: JSON.stringify({ achievementId: 'new-achievement' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
  })

  it('returns 500 on insert error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Mock check for existing (not found)
    const checkQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
    }

    // Mock insert failure
    const insertQuery = {
      insert: vi.fn().mockResolvedValue({ error: new Error('Insert failed') }),
    }

    mockFrom
      .mockReturnValueOnce(checkQuery)
      .mockReturnValueOnce(insertQuery)

    const request = new Request('http://localhost/api/achievements', {
      method: 'POST',
      body: JSON.stringify({ achievementId: 'new-achievement' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(500)

    consoleSpy.mockRestore()
  })

  it('returns 400 for invalid JSON', async () => {
    const request = new Request('http://localhost/api/achievements', {
      method: 'POST',
      body: 'not valid json',
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Invalid request')
  })
})
