/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreateClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

const mockUpload = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: { from: () => ({ upload: mockUpload }) },
  }),
}))

const mockVerifyReceipt = vi.fn()
vi.mock('@/lib/missions/verify-receipt', () => ({
  verifyReceiptImage: (...args: unknown[]) => mockVerifyReceipt(...args),
}))

vi.mock('@/lib/security/rateLimitHelper', () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(null),
}))

import { POST } from '../checkin/route'
import { NextRequest } from 'next/server'

const mockUser = { id: 'user-1', email: 'test@example.com' }
const business = { id: 'biz-1', name: 'Daily Grind Coffee', category_id: 'cat-food' }

interface SupabaseState {
  user?: typeof mockUser | null
  business?: typeof business | null
  todayCheckIn?: { id: string } | null
  priorCheckIn?: { id: string } | null
  progressRows?: unknown[]
}

const progressUpdates: Array<Record<string, unknown>> = []
const checkInInserts: Array<Record<string, unknown>> = []

function createSupabase(state: SupabaseState = {}) {
  const {
    user = mockUser,
    business: biz = business,
    todayCheckIn = null,
    priorCheckIn = null,
    progressRows = [],
  } = state

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn((table: string) => {
      if (table === 'businesses') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: biz,
            error: biz ? null : { code: 'PGRST116' },
          }),
        }
      }
      if (table === 'business_check_ins') {
        const builder: Record<string, unknown> = {}
        const chain = () => builder
        builder.select = vi.fn(chain)
        builder.eq = vi.fn(chain)
        builder.gte = vi.fn(chain)
        builder.limit = vi.fn(chain)
        builder.insert = vi.fn(chain)
        // gte(...).single() → today's dedupe; limit(1).maybeSingle() → prior
        builder.single = vi.fn().mockImplementation(() => {
          return Promise.resolve(
            (builder as { _inserted?: boolean })._inserted
              ? { data: { id: 'checkin-1' }, error: null }
              : { data: todayCheckIn, error: todayCheckIn ? null : { code: 'PGRST116' } }
          )
        })
        builder.maybeSingle = vi.fn().mockResolvedValue({ data: priorCheckIn, error: null })
        const originalInsert = builder.insert as ReturnType<typeof vi.fn>
        originalInsert.mockImplementation((values: Record<string, unknown>) => {
          ;(builder as { _inserted?: boolean })._inserted = true
          checkInInserts.push(values)
          return builder
        })
        return builder
      }
      if (table === 'user_mission_progress') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation(function (this: unknown, column: string) {
            if (column === 'is_completed') {
              return Promise.resolve({ data: progressRows, error: null })
            }
            if (column === 'id') {
              return Promise.resolve({ data: null, error: null })
            }
            // first eq('user_id') in the select chain — keep chaining
            return {
              eq: (col2: string) =>
                col2 === 'is_completed'
                  ? Promise.resolve({ data: progressRows, error: null })
                  : Promise.resolve({ data: null, error: null }),
            }
          }),
          update: vi.fn((values: Record<string, unknown>) => {
            progressUpdates.push(values)
            return { eq: vi.fn().mockResolvedValue({ error: null }) }
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

function makeRequest(withReceipt = true) {
  const formData = new FormData()
  if (withReceipt) {
    formData.append(
      'receipt',
      new File(['fake-image-bytes'], 'receipt.jpg', { type: 'image/jpeg' })
    )
  }
  return new NextRequest('http://localhost/api/businesses/biz-1/checkin', {
    method: 'POST',
    body: formData,
  })
}

function callRoute(request: NextRequest) {
  return POST(request, { params: Promise.resolve({ id: 'biz-1' }) })
}

describe('POST /api/businesses/[id]/checkin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    progressUpdates.length = 0
    checkInInserts.length = 0
    mockUpload.mockResolvedValue({ data: { path: 'x' }, error: null })
    mockVerifyReceipt.mockResolvedValue({
      verified: true,
      reason: null,
      merchantName: 'Daily Grind',
      total: 18.75,
    })
  })

  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValue(createSupabase({ user: null }))
    const res = await callRoute(makeRequest())
    expect(res.status).toBe(401)
  })

  it('requires a receipt photo', async () => {
    mockCreateClient.mockResolvedValue(createSupabase())
    const res = await callRoute(makeRequest(false))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/receipt photo is required/i)
    expect(mockVerifyReceipt).not.toHaveBeenCalled()
  })

  it('rejects the check-in when receipt verification fails', async () => {
    mockCreateClient.mockResolvedValue(createSupabase())
    mockVerifyReceipt.mockResolvedValue({
      verified: false,
      reason: 'This receipt appears to be from Other Store.',
      merchantName: 'Other Store',
      total: null,
    })

    const res = await callRoute(makeRequest())

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.reason).toContain('Other Store')
  })

  it('returns 503 when the verification service itself fails', async () => {
    mockCreateClient.mockResolvedValue(createSupabase())
    mockVerifyReceipt.mockRejectedValue(new Error('API key expired'))

    const res = await callRoute(makeRequest())

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.reason).toMatch(/try again soon/i)
  })

  it('creates a verified check-in and advances a matching mission', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabase({
        progressRows: [
          {
            id: 'progress-1',
            current_count: 1,
            mission: {
              id: 'mission-1',
              title: 'Coffee Explorer',
              mission_type: 'category_explore',
              target_count: 3,
              target_category_id: 'cat-food',
              is_active: true,
            },
          },
        ],
      })
    )

    const res = await callRoute(makeRequest())

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.verification.total).toBe(18.75)
    expect(body.missionUpdates).toEqual([
      expect.objectContaining({
        title: 'Coffee Explorer',
        currentCount: 2,
        targetCount: 3,
        completed: false,
      }),
    ])
    expect(mockUpload).toHaveBeenCalled()
  })

  it('completes the mission when the target is reached', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabase({
        progressRows: [
          {
            id: 'progress-1',
            current_count: 2,
            mission: {
              id: 'mission-1',
              title: 'Coffee Explorer',
              mission_type: 'category_explore',
              target_count: 3,
              target_category_id: 'cat-food',
              is_active: true,
            },
          },
        ],
      })
    )

    const res = await callRoute(makeRequest())
    const body = await res.json()

    expect(body.missionUpdates[0]).toMatchObject({ currentCount: 3, completed: true })
    expect(progressUpdates[0]).toMatchObject({ is_completed: true })
  })

  it('does not double-count repeat visits to the same business', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabase({
        priorCheckIn: { id: 'old-checkin' },
        progressRows: [
          {
            id: 'progress-1',
            current_count: 1,
            mission: {
              id: 'mission-1',
              title: 'Coffee Explorer',
              mission_type: 'category_explore',
              target_count: 3,
              target_category_id: 'cat-food',
              is_active: true,
            },
          },
        ],
      })
    )

    const res = await callRoute(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.missionUpdates).toEqual([])
  })

  it('skips missions targeting a different category', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabase({
        progressRows: [
          {
            id: 'progress-1',
            current_count: 0,
            mission: {
              id: 'mission-2',
              title: 'Retail Therapy',
              mission_type: 'category_explore',
              target_count: 3,
              target_category_id: 'cat-retail',
              is_active: true,
            },
          },
        ],
      })
    )

    const res = await callRoute(makeRequest())
    const body = await res.json()

    expect(body.missionUpdates).toEqual([])
  })

  it('advances visit_count missions on a verified check-in', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabase({
        progressRows: [
          {
            id: 'progress-1',
            current_count: 0,
            mission: {
              id: 'mission-3',
              title: 'Out and About',
              mission_type: 'visit_count',
              target_count: 5,
              target_category_id: null,
              is_active: true,
            },
          },
        ],
      })
    )

    const res = await callRoute(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.missionUpdates).toEqual([
      expect.objectContaining({
        title: 'Out and About',
        currentCount: 1,
        targetCount: 5,
        completed: false,
      }),
    ])
  })

  it('does not advance review/bookmark missions on check-in', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabase({
        progressRows: [
          {
            id: 'progress-1',
            current_count: 0,
            mission: {
              id: 'mission-4',
              title: 'Community Voice',
              mission_type: 'review_count',
              target_count: 3,
              target_category_id: null,
              is_active: true,
            },
          },
        ],
      })
    )

    const res = await callRoute(makeRequest())
    const body = await res.json()

    expect(body.missionUpdates).toEqual([])
  })

  it('rejects empty receipt images without calling verification', async () => {
    mockCreateClient.mockResolvedValue(createSupabase())
    const formData = new FormData()
    formData.append(
      'receipt',
      new File([], 'receipt.jpg', { type: 'image/jpeg' })
    )
    const request = new NextRequest('http://localhost/api/businesses/biz-1/checkin', {
      method: 'POST',
      body: formData,
    })

    const res = await callRoute(request)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/empty/i)
    expect(mockVerifyReceipt).not.toHaveBeenCalled()
  })

  it('fails closed when receipt storage fails — no check-in without proof', async () => {
    mockCreateClient.mockResolvedValue(createSupabase())
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'bucket unavailable' },
    })

    const res = await callRoute(makeRequest())

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.reason).toMatch(/could not store/i)
    expect(checkInInserts).toEqual([])
  })

  it('stores the receipt path on the check-in record', async () => {
    mockCreateClient.mockResolvedValue(createSupabase())

    const res = await callRoute(makeRequest())

    expect(res.status).toBe(201)
    expect(checkInInserts).toHaveLength(1)
    expect(checkInInserts[0]).toMatchObject({
      verified_by_receipt: true,
      receipt_merchant: 'Daily Grind',
      spend_amount: 18.75,
    })
    expect(checkInInserts[0].receipt_url).toMatch(/^user-1\/biz-1-/)
  })
})
