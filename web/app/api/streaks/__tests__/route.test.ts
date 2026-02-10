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

const mockGetStreak = vi.fn()
const mockUpdateStreak = vi.fn()

vi.mock('@/lib/streaks/streakTracker', () => ({
  getStreak: (...args: unknown[]) => mockGetStreak(...args),
  updateStreak: (...args: unknown[]) => mockUpdateStreak(...args),
}))

describe('GET /api/streaks', () => {
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

  it('returns streak data for authenticated user', async () => {
    const mockStreakData = {
      currentStreak: 5,
      longestStreak: 10,
      lastActivityDate: '2024-01-15',
      isActiveToday: true,
    }

    mockGetStreak.mockResolvedValueOnce(mockStreakData)

    const response = await GET()

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual(mockStreakData)
    expect(mockGetStreak).toHaveBeenCalledWith(mockUser.id, expect.any(Object))
  })

  it('includes cache control headers', async () => {
    mockGetStreak.mockResolvedValueOnce({
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      isActiveToday: false,
    })

    const response = await GET()

    expect(response.headers.get('Cache-Control')).toBe('private, max-age=120, stale-while-revalidate=240')
  })
})

describe('POST /api/streaks', () => {
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

    const response = await POST()

    expect(response.status).toBe(401)
  })

  it('updates streak and returns result', async () => {
    const mockUpdateResult = {
      currentStreak: 6,
      longestStreak: 10,
      isNewStreak: true,
    }

    mockUpdateStreak.mockResolvedValueOnce(mockUpdateResult)

    const response = await POST()

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual(mockUpdateResult)
    expect(mockUpdateStreak).toHaveBeenCalledWith(mockUser.id, expect.any(Object))
  })
})
