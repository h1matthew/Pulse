/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Simple chainable builder that properly resolves as a thenable
function createBuilder(data: unknown, error: unknown = null) {
  const result = { data, error }
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.or = vi.fn(chain)
  builder.order = vi.fn(chain)
  builder.limit = vi.fn(chain)
  builder.range = vi.fn(chain)
  builder.then = (resolve: (v: unknown) => void) => {
    resolve(result)
    return Promise.resolve(result)
  }
  return builder
}

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}))

describe('GET /api/missions', () => {
  beforeEach(() => {
    vi.resetModules()
    mockFrom.mockReset()
  })

  it('returns active missions from the database', async () => {
    const mockMissions = [
      { id: 'mission-1', title: 'Coffee Explorer', mission_type: 'category_explore', target_count: 3 },
      { id: 'mission-2', title: 'Community Voice', mission_type: 'review_count', target_count: 3 },
    ]

    mockFrom.mockReturnValue(createBuilder(mockMissions))

    const { GET } = await import('../route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
    expect(data[0].title).toBe('Coffee Explorer')
    expect(data[1].title).toBe('Community Voice')
    expect(mockFrom).toHaveBeenCalledWith('boost_missions')
  })

  it('returns empty array when no missions exist', async () => {
    mockFrom.mockReturnValue(createBuilder([]))

    const { GET } = await import('../route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('returns 500 when database query fails', async () => {
    mockFrom.mockReturnValue(createBuilder(null, { message: 'Database error' }))

    const { GET } = await import('../route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch missions')
  })
})
