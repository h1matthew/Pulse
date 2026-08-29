/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroCityName } from '../HeroCityName'
import { getCachedLocation, reverseGeocodeCity } from '@/lib/location'

vi.mock('@/lib/location', () => ({
  getCachedLocation: vi.fn(() => null),
  reverseGeocodeCity: vi.fn(async () => null),
}))

// Neither jsdom 27 nor Node exposes a usable localStorage here, so stub one.
const store = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
})

describe('HeroCityName', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(getCachedLocation).mockReturnValue(null)
    vi.mocked(reverseGeocodeCity).mockResolvedValue(null)
  })

  it('defaults to "San Antonio" when no location is set', () => {
    render(<HeroCityName />)

    expect(screen.getByText('San Antonio')).toBeInTheDocument()
  })

  it('shows the cached city name, capitalized', () => {
    localStorage.setItem(
      'user_city_name',
      JSON.stringify({ city: 'diamond bar', timestamp: Date.now() })
    )

    render(<HeroCityName />)
    expect(screen.getByText('Diamond Bar')).toBeInTheDocument()
  })

  it('resolves the city from cached coordinates and caches the result', async () => {
    vi.mocked(getCachedLocation).mockReturnValue({ lat: 34.0286, lng: -117.8208 })
    vi.mocked(reverseGeocodeCity).mockResolvedValue('Diamond Bar')

    render(<HeroCityName />)

    expect(await screen.findByText('Diamond Bar')).toBeInTheDocument()
    const cached = JSON.parse(localStorage.getItem('user_city_name') ?? '{}')
    expect(cached.city).toBe('Diamond Bar')
  })

  it('ignores stale cached city names', () => {
    localStorage.setItem(
      'user_city_name',
      JSON.stringify({ city: 'Old Town', timestamp: Date.now() - 2 * 60 * 60 * 1000 })
    )

    render(<HeroCityName />)
    expect(screen.getByText('San Antonio')).toBeInTheDocument()
  })
})
