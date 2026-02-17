import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'

const mockCreateClient = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

describe('GET /api/impact/report', () => {
  const mockUser = {
    id: 'test-user-id-123',
    email: 'test@example.com',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createRequest(params: Record<string, string> = {}) {
    const url = new URL('http://localhost:3000/api/impact/report')
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    return new Request(url.toString())
  }

  function createChainableMock(data: unknown = [], error: unknown = null) {
    const result = { data, error }
    const builder: Record<string, unknown> = {}
    const chain = () => builder

    builder.select = vi.fn(chain)
    builder.eq = vi.fn(chain)
    builder.gte = vi.fn(chain)
    builder.lte = vi.fn(chain)
    builder.order = vi.fn(chain)
    builder.limit = vi.fn(chain)
    builder.then = vi.fn((resolve: (val: unknown) => void) => Promise.resolve(result).then(resolve))

    return builder
  }

  it('returns 401 for unauthenticated user', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated'),
        }),
      },
      from: vi.fn(),
    })

    const response = await GET(createRequest())
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns report data for authenticated user with no activity', async () => {
    const emptyBuilder = createChainableMock([])

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => emptyBuilder),
    })

    const response = await GET(createRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.metrics).toBeDefined()
    expect(data.metrics.dollarsKeptLocal).toBe(0)
    expect(data.metrics.businessesSupported).toBe(0)
    expect(data.metrics.totalCheckIns).toBe(0)
    expect(data.businesses).toEqual([])
    expect(data.reviews).toEqual([])
    expect(data.deals).toEqual([])
    expect(data.timeline).toEqual([])
    expect(data.tier.name).toBe('Pulse Newcomer')
  })

  it('returns report data with check-in activity', async () => {
    const checkInsData = [
      {
        id: 'ci-1',
        business_id: 'biz-1',
        check_in_at: '2026-02-15T10:00:00Z',
        spend_amount: 50,
        businesses: { name: 'Local Cafe', categories: { name: 'Food & Drink' } },
      },
      {
        id: 'ci-2',
        business_id: 'biz-1',
        check_in_at: '2026-02-14T10:00:00Z',
        spend_amount: 30,
        businesses: { name: 'Local Cafe', categories: { name: 'Food & Drink' } },
      },
    ]

    const checkInBuilder = createChainableMock(checkInsData)
    const emptyBuilder = createChainableMock([])
    let callCount = 0

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'business_check_ins') return checkInBuilder
        return emptyBuilder
      }),
    })

    const response = await GET(createRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.metrics.totalCheckIns).toBe(2)
    // (50+30) * 0.68 = 54.4, rounded to 54
    expect(data.metrics.dollarsKeptLocal).toBe(54)
    expect(data.metrics.businessesSupported).toBe(1)
    expect(data.businesses.length).toBe(1)
    expect(data.businesses[0].name).toBe('Local Cafe')
    expect(data.categoryBreakdown.length).toBe(1)
    expect(data.categoryBreakdown[0].category).toBe('Food & Drink')
  })

  it('passes date parameters to queries', async () => {
    const emptyBuilder = createChainableMock([])

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => emptyBuilder),
    })

    const response = await GET(createRequest({ from: '2026-01-01', to: '2026-02-16' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.dateRange.from).toBe('2026-01-01')
    expect(data.dateRange.to).toBe('2026-02-16')
  })

  it('handles database errors gracefully', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => {
        throw new Error('Database connection failed')
      }),
    })

    const response = await GET(createRequest())
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
