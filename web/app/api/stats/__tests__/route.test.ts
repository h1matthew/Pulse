import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'

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

vi.mock('@/lib/constants/modules', () => ({
  COURSE_MODULES: [
    { id: 'module-1', lessons: [{ id: 'lesson-1' }, { id: 'lesson-2' }] },
    { id: 'module-2', lessons: [{ id: 'lesson-3' }] },
  ],
}))

describe('GET /api/stats', () => {
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

  it('returns comprehensive stats for authenticated user', async () => {
    // Mock lesson progress query
    const mockProgress = [
      { lesson_id: 'lesson-1', module_id: 'module-1', completed: true, quiz_score: 5, quiz_total: 5 },
      { lesson_id: 'lesson-2', module_id: 'module-1', completed: true, quiz_score: 4, quiz_total: 5 },
      { lesson_id: 'lesson-3', module_id: 'module-2', completed: true, quiz_score: null, quiz_total: null },
    ]

    const progressQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    progressQuery.eq = vi.fn()
      .mockReturnValueOnce(progressQuery)
      .mockResolvedValueOnce({ data: mockProgress, error: null })

    // Mock profile query
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { ai_questions_asked: 10 }, error: null }),
    }

    // Mock simulator stats query
    const simStatsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          flight_launches: 5,
          orbit_transfers: 3,
          flight_max_altitude: 100000,
          flight_max_speed: 5000,
          orbit_max_distance: 50000,
        },
        error: null,
      }),
    }

    // Mock streak query
    const streakQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { current_streak: 7 }, error: null }),
    }

    mockFrom
      .mockReturnValueOnce(progressQuery)
      .mockReturnValueOnce(profileQuery)
      .mockReturnValueOnce(simStatsQuery)
      .mockReturnValueOnce(streakQuery)

    const response = await GET()

    expect(response.status).toBe(200)
    const json = await response.json()

    expect(json.stats).toEqual({
      lessonsCompleted: 3,
      modulesCompleted: 2, // Both modules have all lessons completed
      quizCount: 2, // Only 2 lessons have quiz scores
      quizPerfectCount: 1, // Only lesson-1 has perfect score
      aiAskedCount: 10,
      modulesVisited: ['module-1', 'module-2'],
      flightLaunches: 5,
      orbitTransfers: 3,
      flightMaxAltitude: 100000,
      flightMaxSpeed: 5000,
      orbitMaxDistance: 50000,
      currentStreak: 7,
    })
  })

  it('handles missing profile data gracefully', async () => {
    const progressQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    progressQuery.eq = vi.fn()
      .mockReturnValueOnce(progressQuery)
      .mockResolvedValueOnce({ data: [], error: null })

    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
    }

    const simStatsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
    }

    const streakQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
    }

    mockFrom
      .mockReturnValueOnce(progressQuery)
      .mockReturnValueOnce(profileQuery)
      .mockReturnValueOnce(simStatsQuery)
      .mockReturnValueOnce(streakQuery)

    const response = await GET()

    expect(response.status).toBe(200)
    const json = await response.json()

    // Should use defaults for missing data
    expect(json.stats.aiAskedCount).toBe(0)
    expect(json.stats.flightLaunches).toBe(0)
    expect(json.stats.currentStreak).toBe(0)
  })

  it('includes cache control headers', async () => {
    const progressQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    progressQuery.eq = vi.fn()
      .mockReturnValueOnce(progressQuery)
      .mockResolvedValueOnce({ data: [], error: null })

    const singleQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }

    mockFrom
      .mockReturnValueOnce(progressQuery)
      .mockReturnValueOnce(singleQuery)
      .mockReturnValueOnce(singleQuery)
      .mockReturnValueOnce(singleQuery)

    const response = await GET()

    expect(response.headers.get('Cache-Control')).toBe('private, max-age=30, stale-while-revalidate=60')
  })
})
