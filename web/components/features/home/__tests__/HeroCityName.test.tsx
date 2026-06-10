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

describe('HeroCityName', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(getCachedLocation).mockReturnValue(null)
    vi.mocked(reverseGeocodeCity).mockResolvedValue(null)
  })

  it('defaults to "Your City" in the brand gradient when location is off', () => {
    render(<HeroCityName />)

    const city = screen.getByText('Your City')
    expect(city).toHaveClass('gradient-text')
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
    expect(screen.getByText('Your City')).toBeInTheDocument()
  })
})
