import { describe, it, expect, vi, beforeEach } from 'vitest'

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

const mockVerifyCaptcha = vi.fn()
vi.mock('@/lib/captcha', () => ({
  verifyCaptcha: (...args: unknown[]) => mockVerifyCaptcha(...args),
}))

vi.mock('@/lib/ensure-profile', () => ({
  ensureProfile: vi.fn(() => Promise.resolve()),
}))

import { POST } from '../route'

function makeChain(finalResult: unknown = { data: null, error: null }) {
  const chain: Record<string, unknown> = {}
  const handler = () => chain
  chain.select = vi.fn(handler)
  chain.insert = vi.fn(handler)
  chain.eq = vi.fn(handler)
  chain.limit = vi.fn(handler)
  chain.single = vi.fn(() => Promise.resolve(finalResult))
  return chain
}

describe('POST /api/reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockVerifyCaptcha.mockResolvedValue({ success: true })
    mockRpc.mockResolvedValue({ data: null, error: null })
    // Default: no existing review, successful insert
    mockFrom.mockImplementation((table: string) => {
      if (table === 'reviews') {
        return makeChain({ data: { id: 'review-1', business_id: 'b1', rating: 5 }, error: null })
      }
      if (table === 'business_check_ins') {
        return makeChain({ data: null, error: null })
      }
      return makeChain()
    })
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })

    const request = new Request('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        business_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: 5,
        content: 'Great place to visit!',
        captchaToken: 'test-token',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('allows review creation when captchaToken is missing', async () => {
    const request = new Request('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        business_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: 5,
        content: 'Great place to visit!',
      }),
    })

    const response = await POST(request)
    expect([201, 409]).toContain(response.status)
    expect(mockVerifyCaptcha).not.toHaveBeenCalled()
  })

  it('returns 400 when CAPTCHA verification fails', async () => {
    mockVerifyCaptcha.mockResolvedValueOnce({
      success: false,
      error: 'CAPTCHA verification failed',
    })

    const request = new Request('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        business_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: 5,
        content: 'Great place to visit!',
        captchaToken: 'invalid-token',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toContain('CAPTCHA')
  })

  it('returns 400 for invalid review data', async () => {
    const request = new Request('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        business_id: 'not-a-uuid',
        rating: 6,
        content: 'Hi',
        captchaToken: 'valid-token',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('calls verifyCaptcha with the provided token', async () => {
    const request = new Request('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        business_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: 5,
        content: 'This is a great local business!',
        captchaToken: 'my-captcha-token',
      }),
    })

    await POST(request)

    expect(mockVerifyCaptcha).toHaveBeenCalledWith('my-captcha-token')
  })
})
