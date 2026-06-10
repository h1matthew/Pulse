import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockNextRequest } from '@/__tests__/mocks/next.mock'
import { GET } from '../route'

vi.mock('@/lib/security/rateLimitHelper', () => ({
  enforceRateLimit: vi.fn(async () => null),
}))

function zipRequest(searchParams: Record<string, string>) {
  return createMockNextRequest({
    url: 'http://localhost:3000/api/geo/zip',
    searchParams,
  })
}

const googleResponse = (payload: unknown, ok = true) =>
  ({ ok, json: async () => payload }) as Response

describe('GET /api/geo/zip', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('rejects missing or malformed zip codes', async () => {
    for (const params of [
      {},
      { zip: 'abcde' },
      { zip: '1234' },
      { zip: '123456' },
      { zip: '78205-12' },
    ]) {
      const res = await GET(zipRequest(params as Record<string, string>))
      expect(res.status).toBe(400)
    }
  })

  it('returns coordinates and city for a valid zip', async () => {
    vi.mocked(fetch).mockResolvedValue(
      googleResponse({
        status: 'OK',
        results: [
          {
            geometry: { location: { lat: 29.4252, lng: -98.4946 } },
            address_components: [
              { long_name: '78205', types: ['postal_code'] },
              { long_name: 'San Antonio', types: ['locality', 'political'] },
            ],
          },
        ],
      })
    )

    const res = await GET(zipRequest({ zip: '78205' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      location: { lat: 29.4252, lng: -98.4946 },
      city: 'San Antonio',
    })
  })

  it('accepts zip+4 format and geocodes the 5-digit prefix', async () => {
    vi.mocked(fetch).mockResolvedValue(
      googleResponse({
        status: 'OK',
        results: [
          {
            geometry: { location: { lat: 29.4252, lng: -98.4946 } },
            address_components: [],
          },
        ],
      })
    )

    const res = await GET(zipRequest({ zip: '78205-1234' }))
    expect(res.status).toBe(200)
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('postal_code:78205')
    expect(url).not.toContain('78205-1234')
  })

  it('restricts the geocode to US postal codes', async () => {
    vi.mocked(fetch).mockResolvedValue(
      googleResponse({ status: 'ZERO_RESULTS', results: [] })
    )

    await GET(zipRequest({ zip: '90210' }))
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('country:US')
  })

  it('returns null location when the zip does not exist', async () => {
    vi.mocked(fetch).mockResolvedValue(
      googleResponse({ status: 'ZERO_RESULTS', results: [] })
    )

    const res = await GET(zipRequest({ zip: '00000' }))
    expect(await res.json()).toEqual({ location: null, city: null })
  })

  it('returns null location when the API key is not configured', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', '')

    const res = await GET(zipRequest({ zip: '78205' }))
    expect(await res.json()).toEqual({ location: null, city: null })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns null location when the geocoder request fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))

    const res = await GET(zipRequest({ zip: '78205' }))
    expect(await res.json()).toEqual({ location: null, city: null })
  })
})
