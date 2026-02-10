import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock supabase
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
    },
    from: mockFrom,
  })),
}))

describe('GET /api/leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns leaderboard entries', async () => {
    const mockEntries = [
      {
        id: '1',
        user_id: 'user-1',
        display_name: 'User 1',
        avatar_url: null,
        total_score: 1000,
        achievements_count: 10,
        lessons_completed: 20,
        quizzes_perfect: 5,
        updated_at: '2024-01-01',
      },
      {
        id: '2',
        user_id: 'user-2',
        display_name: 'User 2',
        avatar_url: 'https://example.com/avatar.png',
        total_score: 800,
        achievements_count: 8,
        lessons_completed: 15,
        quizzes_perfect: 3,
        updated_at: '2024-01-02',
      },
    ]

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockEntries, error: null }),
    })

    const request = new NextRequest('http://localhost/api/leaderboard')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.entries).toEqual(mockEntries)
  })

  it('sorts by total_score by default', async () => {
    const mockOrder = vi.fn().mockReturnThis()
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: mockOrder,
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const request = new NextRequest('http://localhost/api/leaderboard')
    await GET(request)

    expect(mockOrder).toHaveBeenCalledWith('total_score', { ascending: false })
  })

  it('sorts by achievements_count when requested', async () => {
    const mockOrder = vi.fn().mockReturnThis()
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: mockOrder,
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const request = new NextRequest('http://localhost/api/leaderboard?sortBy=achievements_count')
    await GET(request)

    expect(mockOrder).toHaveBeenCalledWith('achievements_count', { ascending: false })
  })

  it('sorts by lessons_completed when requested', async () => {
    const mockOrder = vi.fn().mockReturnThis()
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: mockOrder,
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const request = new NextRequest('http://localhost/api/leaderboard?sortBy=lessons_completed')
    await GET(request)

    expect(mockOrder).toHaveBeenCalledWith('lessons_completed', { ascending: false })
  })

  it('uses total_score for invalid sortBy values', async () => {
    const mockOrder = vi.fn().mockReturnThis()
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: mockOrder,
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const request = new NextRequest('http://localhost/api/leaderboard?sortBy=invalid_field')
    await GET(request)

    expect(mockOrder).toHaveBeenCalledWith('total_score', { ascending: false })
  })

  it('limits results to 100', async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null })
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: mockLimit,
    })

    const request = new NextRequest('http://localhost/api/leaderboard')
    await GET(request)

    expect(mockLimit).toHaveBeenCalledWith(100)
  })

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    })

    const request = new NextRequest('http://localhost/api/leaderboard')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe('Failed to fetch leaderboard')

    consoleSpy.mockRestore()
  })

  it('returns empty array when no entries', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const request = new NextRequest('http://localhost/api/leaderboard')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.entries).toEqual([])
  })

  it('includes public cache control headers', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const request = new NextRequest('http://localhost/api/leaderboard')
    const response = await GET(request)

    // Leaderboard is public, so should have public cache
    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=300, stale-while-revalidate=600')
  })
})
