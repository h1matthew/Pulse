/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use globalThis to communicate between test and the hoisted mock factory
const MOCK_KEY = '__test_mission_start_mock__' as const

interface MockConfig {
  user: unknown
  from: (table: string) => unknown
}

function getMockConfig(): MockConfig {
  return (globalThis as Record<string, unknown>)[MOCK_KEY] as MockConfig
}

function setMockConfig(config: MockConfig) {
  ;(globalThis as Record<string, unknown>)[MOCK_KEY] = config
}

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
}

/**
 * Chainable builder whose terminal calls (single / maybeSingle / thenable)
 * resolve with the provided result.
 */
function createBuilder(data: unknown, error: unknown = null) {
  const result = { data, error }
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.insert = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.single = vi.fn(() => Promise.resolve(result))
  builder.maybeSingle = vi.fn(() => Promise.resolve(result))
  builder.then = (resolve: (v: unknown) => void) => {
    resolve(result)
    return Promise.resolve(result)
  }
  return builder
}

setMockConfig({ user: mockUser, from: () => createBuilder(null) })

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => {
    const config = getMockConfig()
    return Promise.resolve({
      from: (table: string) => config.from(table),
      auth: {
        getUser: () => Promise.resolve({ data: { user: config.user }, error: null }),
      },
    })
  },
}))

import { POST } from '../start/route'

const activeMission = { id: 'mission-1', is_active: true, end_date: null }
const progressRow = {
  id: 'progress-1',
  mission_id: 'mission-1',
  user_id: 'user-123',
  current_count: 0,
  is_completed: false,
}

function callRoute(id = 'mission-1') {
  return POST(new Request(`http://localhost/api/missions/${id}/start`, { method: 'POST' }), {
    params: Promise.resolve({ id }),
  })
}

describe('POST /api/missions/[id]/start', () => {
  beforeEach(() => {
    setMockConfig({ user: mockUser, from: () => createBuilder(null) })
  })

  it('returns 401 when not authenticated', async () => {
    setMockConfig({ user: null, from: () => createBuilder(null) })

    const res = await callRoute()
    expect(res.status).toBe(401)
  })

  it('returns 404 when the mission does not exist', async () => {
    setMockConfig({
      user: mockUser,
      from: (table) =>
        table === 'boost_missions'
          ? createBuilder(null, { message: 'not found' })
          : createBuilder(null),
    })

    const res = await callRoute('nope')
    expect(res.status).toBe(404)
  })

  it('returns 409 when the mission is inactive', async () => {
    setMockConfig({
      user: mockUser,
      from: (table) =>
        table === 'boost_missions'
          ? createBuilder({ ...activeMission, is_active: false })
          : createBuilder(null),
    })

    const res = await callRoute()
    expect(res.status).toBe(409)
  })

  it('returns 409 when the mission has ended', async () => {
    setMockConfig({
      user: mockUser,
      from: (table) =>
        table === 'boost_missions'
          ? createBuilder({ ...activeMission, end_date: '2000-01-01T00:00:00Z' })
          : createBuilder(null),
    })

    const res = await callRoute()
    expect(res.status).toBe(409)
  })

  it('is idempotent: returns the existing progress row with 200', async () => {
    setMockConfig({
      user: mockUser,
      from: (table) =>
        table === 'boost_missions' ? createBuilder(activeMission) : createBuilder(progressRow),
    })

    const res = await callRoute()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('progress-1')
  })

  it('creates a new progress row with 201', async () => {
    let progressCall = 0
    setMockConfig({
      user: mockUser,
      from: (table) => {
        if (table === 'boost_missions') return createBuilder(activeMission)
        // First progress access is the existence check (none), second is insert
        progressCall += 1
        return progressCall === 1 ? createBuilder(null) : createBuilder(progressRow)
      },
    })

    const res = await callRoute()
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.mission_id).toBe('mission-1')
    expect(body.current_count).toBe(0)
  })
})
