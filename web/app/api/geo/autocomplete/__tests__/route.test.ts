import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockNextRequest } from '@/__tests__/mocks/next.mock'
import { GET } from '../route'

vi.mock('@/lib/security/rateLimitHelper', () => ({
  enforceRateLimit: vi.fn(async () => null),
}))

function autocompleteRequest(searchParams: Record<string, string>) {
  return createMockNextRequest({
    url: 'http://localhost:3000/api/geo/autocomplete',
    searchParams,
  })
}

const okJson = (payload: unknown, ok = true) =>
  ({ ok, json: async () => payload }) as Response

describe('GET /api/geo/autocomplete', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns an empty list for short queries without calling Google', async () => {
    for (const q of ['', ' ', 'a']) {
      const res = await GET(autocompleteRequest({ q }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ suggestions: [] })
    }
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps place predictions to id/label suggestions', async () => {
    vi.mocked(fetch).mockResolvedValue(
      okJson({
        suggestions: [
          { placePrediction: { placeId: 'place-1', text: { text: 'San Antonio, TX, USA' } } },
          { placePrediction: { placeId: 'place-2', text: { text: 'San Antonio Heights, CA, USA' } } },
          { placePrediction: { placeId: '', text: { text: 'no id, dropped' } } },
        ],
      })
    )

    const res = await GET(autocompleteRequest({ q: 'san anto' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      suggestions: [
        { id: 'place-1', label: 'San Antonio, TX, USA' },
        { id: 'place-2', label: 'San Antonio Heights, CA, USA' },
      ],
    })
  })

  it('restricts results to US regions', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({ suggestions: [] }))
    await GET(autocompleteRequest({ q: 'austin' }))
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)
    expect(body.includedRegionCodes).toEqual(['us'])
    expect(body.includedPrimaryTypes).toEqual(['(regions)'])
  })

  it('returns an empty list when the API key is missing', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', '')
    const res = await GET(autocompleteRequest({ q: 'dallas' }))
    expect(await res.json()).toEqual({ suggestions: [] })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns an empty list when Google fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))
    const res = await GET(autocompleteRequest({ q: 'houston' }))
    expect(await res.json()).toEqual({ suggestions: [] })
  })
})
