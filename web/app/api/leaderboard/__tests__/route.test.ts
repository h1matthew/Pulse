import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'

// Mock the server client
const mockCreateClient = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

describe('GET /api/leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns leaderboard entries with calculated scores', async () => {
    const mockImpactData = [
      {
        user_id: 'user-1',
        estimated_dollars_kept_local: 5000,
        businesses_supported: 25,
        reviews_left: 15,
        missions_completed: 8,
        total_check_ins: 50,
        profiles: [{ full_name: 'Alice Johnson', avatar_url: null }],
      },
      {
        user_id: 'user-2',
        estimated_dollars_kept_local: 3500,
        businesses_supported: 20,
        reviews_left: 10,
        missions_completed: 5,
        total_check_ins: 35,
        profiles: [{ full_name: 'Bob Smith', avatar_url: 'https://example.com/avatar.png' }],
      },
    ]

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        gt: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: mockImpactData, error: null }),
          })),
        })),
      })),
    }))

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('Function not found') }),
      from: mockFrom,
    })

    const request = new Request('http://localhost/api/leaderboard')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.entries).toHaveLength(2)
    expect(json.entries[0].rank).toBe(1)
    expect(json.entries[0].display_name).toBe('Alice Johnson')
    expect(json.entries[0].impact_score).toBeGreaterThan(0)
  })

  it('includes current user rank when authenticated', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' }

    const mockImpactData = [
      {
        user_id: 'user-1',
        estimated_dollars_kept_local: 5000,
        businesses_supported: 25,
        reviews_left: 15,
        missions_completed: 8,
        total_check_ins: 50,
        profiles: [{ full_name: 'Test User', avatar_url: null }],
      },
    ]

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        gt: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: mockImpactData, error: null }),
          })),
        })),
      })),
    }))

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('Function not found') }),
      from: mockFrom,
    })

    const request = new Request('http://localhost/api/leaderboard')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.userRank).toBe(1)
  })

  it('returns empty array when no entries', async () => {
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        gt: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    }))

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('Function not found') }),
      from: mockFrom,
    })

    const request = new Request('http://localhost/api/leaderboard')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.entries).toEqual([])
    expect(json.totalCount).toBe(0)
  })

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        gt: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
          })),
        })),
      })),
    }))

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('Function not found') }),
      from: mockFrom,
    })

    const request = new Request('http://localhost/api/leaderboard')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe('Failed to fetch leaderboard')

    consoleSpy.mockRestore()
  })

  it('includes public cache control headers', async () => {
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        gt: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    }))

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('Function not found') }),
      from: mockFrom,
    })

    const request = new Request('http://localhost/api/leaderboard')
    const response = await GET(request)

    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=300, stale-while-revalidate=600')
  })

  it('uses database function when available', async () => {
    const mockLeaderboardData = [
      {
        rank: 1,
        user_id: 'user-1',
        display_name: 'Alice Johnson',
        impact_score: 2500,
      },
      {
        rank: 2,
        user_id: 'user-2',
        display_name: 'Bob Smith',
        impact_score: 1800,
      },
    ]

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ data: mockLeaderboardData, error: null }),
      from: vi.fn(),
    })

    const request = new Request('http://localhost/api/leaderboard')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.entries).toEqual(mockLeaderboardData)
  })
})
