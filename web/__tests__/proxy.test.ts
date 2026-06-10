import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '../proxy'

const mockGetSession = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getSession: () => mockGetSession(),
    },
  }),
}))

function makeRequest(pathname: string) {
  return new NextRequest(`http://localhost:3000${pathname}`)
}

describe('proxy route protection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: { session: null } })
  })

  it('redirects signed-out users from /missions to /login', async () => {
    const res = await proxy(makeRequest('/missions'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('allows signed-in users to access /missions', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    })

    const res = await proxy(makeRequest('/missions'))

    expect(res.status).toBe(200)
  })

  it('still treats /mission (Our Mission page) as public', async () => {
    const res = await proxy(makeRequest('/mission'))

    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })

  it('keeps other public pages accessible without a session', async () => {
    for (const path of ['/', '/discover', '/deals', '/about']) {
      const res = await proxy(makeRequest(path))
      expect(res.status).toBe(200)
    }
  })
})
