import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSignInWithPassword = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { signInWithPassword: mockSignInWithPassword },
    })
  ),
}))

const mockCheckRateLimit = vi.fn()
vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIP: () => '1.2.3.4',
}))

import { POST } from '../route'

const allowed = {
  success: true,
  remaining: 9,
  retryAfterMs: 0,
  limit: 10,
  reset: Date.now() + 600000,
}

const blocked = {
  success: false,
  remaining: 0,
  retryAfterMs: 120000,
  limit: 10,
  reset: Date.now() + 120000,
}

function createRequest(body?: unknown) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    body: body === undefined ? 'not json' : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue(allowed)
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'a@b.com' },
        session: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
      },
      error: null,
    })
  })

  it('signs in successfully within the rate limit', async () => {
    const res = await POST(createRequest({ email: 'a@b.com', password: 'secret' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.user.id).toBe('user-1')
    expect(json.session.access_token).toBe('mock-token')
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret',
    })
  })

  it('rate limits by IP and account email', async () => {
    await POST(createRequest({ email: 'A@B.com', password: 'secret' }))
    expect(mockCheckRateLimit).toHaveBeenCalledWith('ip:1.2.3.4', 'login')
    expect(mockCheckRateLimit).toHaveBeenCalledWith('email:a@b.com', 'login')
  })

  it('returns 429 with Retry-After when the IP limit is exceeded', async () => {
    mockCheckRateLimit.mockImplementation((id: string) =>
      Promise.resolve(id.startsWith('ip:') ? blocked : allowed)
    )

    const res = await POST(createRequest({ email: 'a@b.com', password: 'secret' }))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('120')
    const json = await res.json()
    expect(json.retryAfter).toBe(120)
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  it('returns 429 when the email limit is exceeded even from a new IP', async () => {
    mockCheckRateLimit.mockImplementation((id: string) =>
      Promise.resolve(id.startsWith('email:') ? blocked : allowed)
    )

    const res = await POST(createRequest({ email: 'a@b.com', password: 'secret' }))
    expect(res.status).toBe(429)
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  it('returns 401 on invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    const res = await POST(createRequest({ email: 'a@b.com', password: 'wrong' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Invalid login credentials')
  })

  it('returns 400 when email or password is missing', async () => {
    const res = await POST(createRequest({ email: 'a@b.com' }))
    expect(res.status).toBe(400)
    expect(mockCheckRateLimit).not.toHaveBeenCalled()
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  it('returns 400 on a malformed JSON body', async () => {
    const res = await POST(createRequest())
    expect(res.status).toBe(400)
  })
})
