import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { geocodeZipCode } from '../location'

const apiResponse = (payload: unknown, ok = true) =>
  ({ ok, json: async () => payload }) as Response

describe('geocodeZipCode', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null for malformed zip codes without calling the API', async () => {
    for (const zip of ['', 'abcde', '1234', '123456', '78205-12']) {
      expect(await geocodeZipCode(zip)).toBeNull()
    }
    expect(fetch).not.toHaveBeenCalled()
  })

  it('geocodes a zip through the /api/geo/zip route', async () => {
    vi.mocked(fetch).mockResolvedValue(
      apiResponse({ location: { lat: 29.4252, lng: -98.4946 }, city: 'San Antonio' })
    )

    const location = await geocodeZipCode('78205')
    expect(location).toEqual({ lat: 29.4252, lng: -98.4946 })
    expect(fetch).toHaveBeenCalledWith('/api/geo/zip?zip=78205')
  })

  it('caches successful lookups in localStorage', async () => {
    vi.mocked(fetch).mockResolvedValue(
      apiResponse({ location: { lat: 29.4252, lng: -98.4946 }, city: 'San Antonio' })
    )

    await geocodeZipCode('78205')
    const second = await geocodeZipCode('78205')

    expect(second).toEqual({ lat: 29.4252, lng: -98.4946 })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns null when the route reports no match', async () => {
    vi.mocked(fetch).mockResolvedValue(apiResponse({ location: null, city: null }))
    expect(await geocodeZipCode('00000')).toBeNull()
  })

  it('returns null when the route request fails', async () => {
    vi.mocked(fetch).mockResolvedValue(apiResponse({}, false))
    expect(await geocodeZipCode('78205')).toBeNull()

    vi.mocked(fetch).mockRejectedValue(new Error('network down'))
    expect(await geocodeZipCode('78205')).toBeNull()
  })
})
