import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockNextRequest } from '@/__tests__/mocks/next.mock'
import { GET } from '../route'

vi.mock('@/lib/security/rateLimitHelper', () => ({
  enforceRateLimit: vi.fn(async () => null),
}))

function geoRequest(searchParams: Record<string, string>) {
  return createMockNextRequest({
    url: 'http://localhost:3000/api/geo/city',
    searchParams,
  })
}

const googleResponse = (payload: unknown, ok = true) =>
  ({ ok, json: async () => payload }) as Response

describe('GET /api/geo/city', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('rejects missing or malformed coordinates', async () => {
    for (const params of [
      {},
      { lat: 'abc', lng: '10' },
      { lat: '95', lng: '10' },
      { lat: '10', lng: '200' },
    ]) {
      const res = await GET(geoRequest(params as Record<string, string>))
      expect(res.status).toBe(400)
    }
  })

  it('returns the locality name from the geocoder', async () => {
    vi.mocked(fetch).mockResolvedValue(
      googleResponse({
        status: 'OK',
        results: [
          {
            address_components: [
              { long_name: '123', types: ['street_number'] },
              { long_name: 'Diamond Bar', types: ['locality', 'political'] },
            ],
          },
        ],
      })
    )

    const res = await GET(geoRequest({ lat: '34.0286', lng: '-117.8208' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ city: 'Diamond Bar' })
  })

  it('returns null city when the geocoder has no result', async () => {
    vi.mocked(fetch).mockResolvedValue(
      googleResponse({ status: 'ZERO_RESULTS', results: [] })
    )

    const res = await GET(geoRequest({ lat: '0', lng: '0' }))
    expect(await res.json()).toEqual({ city: null })
  })

  it('returns null city when the API key is not configured', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', '')

    const res = await GET(geoRequest({ lat: '34', lng: '-117' }))
    expect(await res.json()).toEqual({ city: null })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns null city when the geocoder request fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))

    const res = await GET(geoRequest({ lat: '34', lng: '-117' }))
    expect(await res.json()).toEqual({ city: null })
  })
})
