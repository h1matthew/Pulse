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

// Use globalThis to communicate between test and mock factory
const MOCK_KEY = '__test_missions_progress_mock__' as const

interface MockConfig {
  user: unknown;
  from: ReturnType<typeof vi.fn>;
}

function getMockConfig(): MockConfig {
  return (globalThis as Record<string, unknown>)[MOCK_KEY] as MockConfig
}

function setMockConfig(config: MockConfig) {
  (globalThis as Record<string, unknown>)[MOCK_KEY] = config
}

const mockFrom = vi.fn()
const mockUser = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
}

setMockConfig({ user: mockUser, from: mockFrom })

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => {
    const config = getMockConfig()
    return Promise.resolve({
      from: (...args: unknown[]) => config.from(...args),
      auth: {
        getUser: () => Promise.resolve({ data: { user: config.user }, error: null }),
      },
    })
  },
}))

describe('GET /api/missions/progress', () => {
  beforeEach(() => {
    vi.resetModules()
    mockFrom.mockReset()
    setMockConfig({ user: mockUser, from: mockFrom })
  })

  it('returns 401 when user is not authenticated', async () => {
    setMockConfig({ user: null, from: mockFrom })

    const { GET } = await import('../progress/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('returns user mission progress when authenticated', async () => {
    const mockProgress = [
      {
        id: 'progress-1',
        mission_id: 'mission-1',
        user_id: mockUser.id,
        current_count: 2,
        is_completed: false,
        mission: { id: 'mission-1', title: 'Coffee Explorer' },
      },
    ]

    mockFrom.mockReturnValue(createBuilder(mockProgress))

    const { GET } = await import('../progress/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].current_count).toBe(2)
    expect(data[0].mission.title).toBe('Coffee Explorer')
    expect(mockFrom).toHaveBeenCalledWith('user_mission_progress')
  })

  it('returns empty array when user has no mission progress', async () => {
    mockFrom.mockReturnValue(createBuilder([]))

    const { GET } = await import('../progress/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('returns 500 when database query fails', async () => {
    mockFrom.mockReturnValue(createBuilder(null, { message: 'Database error' }))

    const { GET } = await import('../progress/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch mission progress')
  })
})
