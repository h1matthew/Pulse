import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockNextRequest } from '@/__tests__/mocks/next.mock'
import { GET } from '../route'

vi.mock('@/lib/security/rateLimitHelper', () => ({
  enforceRateLimit: vi.fn(async () => null),
}))

function placeRequest(searchParams: Record<string, string>) {
  return createMockNextRequest({
    url: 'http://localhost:3000/api/geo/place',
    searchParams,
  })
}

const okJson = (payload: unknown, ok = true) =>
  ({ ok, json: async () => payload }) as Response

describe('GET /api/geo/place', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('rejects missing or malformed place ids', async () => {
    for (const params of [{}, { placeId: 'has spaces' }, { placeId: 'bad!id' }]) {
      const res = await GET(placeRequest(params as Record<string, string>))
      expect(res.status).toBe(400)
    }
    expect(fetch).not.toHaveBeenCalled()
  })

  it('resolves a place id to coordinates and a "City, ST" label', async () => {
    vi.mocked(fetch).mockResolvedValue(
      okJson({
        status: 'OK',
        results: [
          {
            geometry: { location: { lat: 29.4252, lng: -98.4946 } },
            formatted_address: 'San Antonio, TX, USA',
            address_components: [
              { long_name: 'San Antonio', short_name: 'San Antonio', types: ['locality', 'political'] },
              { long_name: 'Texas', short_name: 'TX', types: ['administrative_area_level_1', 'political'] },
            ],
          },
        ],
      })
    )

    const res = await GET(placeRequest({ placeId: 'ChIJrw7QBK9YXIYRvBagEDvhVgg' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      location: { lat: 29.4252, lng: -98.4946 },
      label: 'San Antonio, TX',
    })
  })

  it('falls back to a zip-style label when there is no locality', async () => {
    vi.mocked(fetch).mockResolvedValue(
      okJson({
        status: 'OK',
        results: [
          {
            geometry: { location: { lat: 29.42, lng: -98.49 } },
            formatted_address: '78205, USA',
            address_components: [
              { long_name: '78205', short_name: '78205', types: ['postal_code'] },
              { long_name: 'Texas', short_name: 'TX', types: ['administrative_area_level_1'] },
            ],
          },
        ],
      })
    )

    const res = await GET(placeRequest({ placeId: 'ChIJ_zip_code_place' }))
    expect(await res.json()).toEqual({
      location: { lat: 29.42, lng: -98.49 },
      label: '78205, TX',
    })
  })

  it('returns null when the API key is missing', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', '')
    const res = await GET(placeRequest({ placeId: 'ChIJsomething' }))
    expect(await res.json()).toEqual({ location: null, label: null })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns null when the place id does not resolve', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({ status: 'ZERO_RESULTS', results: [] }))
    const res = await GET(placeRequest({ placeId: 'ChIJunknown' }))
    expect(await res.json()).toEqual({ location: null, label: null })
  })
})
