import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
      rpc: mockRpc,
    })
  ),
}))

const mockEnforceRateLimit = vi.fn()
vi.mock('@/lib/security/rateLimitHelper', () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}))

import { POST } from '../route'

function makeChain(finalResult: unknown = { data: null, error: null }) {
  const chain: Record<string, unknown> = {}
  const handler = () => chain
  chain.select = vi.fn(handler)
  chain.insert = vi.fn(handler)
  chain.eq = vi.fn(handler)
  chain.gte = vi.fn(handler)
  chain.limit = vi.fn(handler)
  chain.order = vi.fn(handler)
  chain.single = vi.fn(() => Promise.resolve(finalResult))
  return chain
}

function createRequest() {
  return new NextRequest('http://localhost/api/businesses/test-id/checkin', {
    method: 'POST',
  })
}

describe('POST /api/businesses/[id]/checkin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockEnforceRateLimit.mockResolvedValue(null)
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'businesses') {
        return makeChain({ data: { id: 'test-id', name: 'Test Biz' }, error: null })
      }
      if (table === 'business_check_ins') {
        // Default: no existing check-in, successful insert
        const chain = makeChain({ data: { id: 'ci-1' }, error: null })
        // First .single() call = existing check-in lookup (null = no existing)
        // Second .single() call = insert result
        let callCount = 0
        chain.single = vi.fn(() => {
          callCount++
          if (callCount === 1) return Promise.resolve({ data: null, error: null })
          return Promise.resolve({ data: { id: 'ci-1', check_in_at: new Date().toISOString() }, error: null })
        })
        return chain
      }
      return makeChain()
    })
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })

    const response = await POST(createRequest(), {
      params: Promise.resolve({ id: 'test-id' }),
    })

    expect(response.status).toBe(401)
  })

  it('calls enforceRateLimit with the progress category', async () => {
    await POST(createRequest(), {
      params: Promise.resolve({ id: 'test-id' }),
    })

    expect(mockEnforceRateLimit).toHaveBeenCalledWith(
      expect.any(NextRequest),
      'progress'
    )
  })

  it('returns 429 when rate limit is exceeded', async () => {
    mockEnforceRateLimit.mockResolvedValueOnce(
      NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.', retryAfter: 60 },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    )

    const response = await POST(createRequest(), {
      params: Promise.resolve({ id: 'test-id' }),
    })

    expect(response.status).toBe(429)
    const data = await response.json()
    expect(data.error).toContain('Rate limit')
  })
})
