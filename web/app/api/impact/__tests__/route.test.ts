import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the server client
const mockCreateClient = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

// Mock the calculator so tests control whether a recalculation "ran"
const mockCalculateUserImpact = vi.fn()

vi.mock('@/lib/impact-calculator', () => ({
  calculateUserImpact: (...args: unknown[]) => mockCalculateUserImpact(...args),
}))

import { GET } from '../route'

const mockUser = {
  id: 'test-user-id-123',
  email: 'test@example.com',
}

function freshImpactRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: mockUser.id,
    estimated_dollars_kept_local: 1250.5,
    businesses_supported: 15,
    jobs_impacted_estimate: 2,
    reviews_left: 8,
    missions_completed: 3,
    deals_claimed: 5,
    total_check_ins: 20,
    community_rank: null,
    last_updated: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Supabase mock supporting the route's two query shapes:
 * - from('user_impact').select('*').eq(...).single() → the user's row
 * - from('user_impact').select('user_id', {count}).gt(...) → rank count
 */
function createSupabaseMock(options: {
  row: unknown
  rowError?: { code: string; message: string } | null
  usersWithMore?: number
}) {
  const { row, rowError = null, usersWithMore = 0 } = options
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn((_cols?: string, opts?: { count?: string }) => {
        if (opts?.count) {
          return {
            gt: vi.fn().mockResolvedValue({ count: usersWithMore, error: null }),
          }
        }
        return {
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: row, error: rowError }),
          })),
        }
      }),
    })),
  }
}

describe('GET /api/impact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCalculateUserImpact.mockResolvedValue({})
  })

  it('returns stored impact data with a computed community rank', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({ row: freshImpactRow(), usersWithMore: 41 })
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user_id).toBe(mockUser.id)
    expect(data.estimated_dollars_kept_local).toBe(1250.5)
    expect(data.businesses_supported).toBe(15)
    // Rank = users with more dollars kept local + 1, from real rows
    expect(data.community_rank).toBe(42)
    // Fresh row → no recalculation
    expect(mockCalculateUserImpact).not.toHaveBeenCalled()
  })

  it('recalculates from real activity when the stored row is stale', async () => {
    const staleDate = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({ row: freshImpactRow({ last_updated: staleDate }) })
    )

    const response = await GET()

    expect(response.status).toBe(200)
    expect(mockCalculateUserImpact).toHaveBeenCalledWith(mockUser.id)
  })

  it('recalculates and returns zero defaults for a brand-new user', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        row: null,
        rowError: { code: 'PGRST116', message: 'No rows returned' },
      })
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockCalculateUserImpact).toHaveBeenCalledWith(mockUser.id)
    expect(data.user_id).toBe(mockUser.id)
    expect(data.estimated_dollars_kept_local).toBe(0)
    expect(data.businesses_supported).toBe(0)
    expect(data.community_rank).toBeNull()
  })

  it('never returns demo data when demo env vars are unset', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({ row: freshImpactRow() })
    )

    const response = await GET()
    const data = await response.json()

    expect(data.is_demo_data).toBeUndefined()
    // The fabricated demo profile is $1,840 / 14 businesses
    expect(data.estimated_dollars_kept_local).not.toBe(1840)
    expect(data.businesses_supported).not.toBe(14)
  })

  it('returns 401 for unauthenticated user', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') }),
      },
      from: vi.fn(),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })
})
