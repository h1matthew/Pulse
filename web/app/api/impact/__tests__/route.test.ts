import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'

// Mock the server client
const mockCreateClient = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

describe('GET /api/impact', () => {
  const mockUser = {
    id: 'test-user-id-123',
    email: 'test@example.com',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns impact data for authenticated user', async () => {
    const mockImpact = {
      user_id: mockUser.id,
      estimated_dollars_kept_local: 1250.50,
      businesses_supported: 15,
      jobs_impacted_estimate: 2,
      reviews_left: 8,
      missions_completed: 3,
      deals_claimed: 5,
      total_check_ins: 20,
      community_rank: 42,
      last_updated: new Date().toISOString(),
    }

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockImpact, error: null }),
          })),
        })),
      })),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user_id).toBe(mockUser.id)
    expect(data.estimated_dollars_kept_local).toBe(1250.50)
    expect(data.businesses_supported).toBe(15)
  })

  it('returns default values when no impact data exists', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows returned' },
            }),
          })),
        })),
      })),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user_id).toBe(mockUser.id)
    expect(data.estimated_dollars_kept_local).toBe(0)
    expect(data.businesses_supported).toBe(0)
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
