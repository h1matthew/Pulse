/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

const mockUseNearby = vi.fn()
const mockGetCachedLocation = vi.fn()

vi.mock('@/hooks/useBusinesses', () => ({
  useNearbyBusinesses: (...args: unknown[]) => mockUseNearby(...args),
}))

vi.mock('@/hooks/useLocation', () => ({
  // Deterministic distance/format helpers
  calculateDistance: () => 1.2,
  formatDistance: (mi: number) => `${mi} mi`,
}))

vi.mock('@/lib/location', () => ({
  getCachedLocation: () => mockGetCachedLocation(),
  reverseGeocodeCity: vi.fn(async () => null),
}))

// NavLink relies on the Next router, which isn't mounted in unit tests.
vi.mock('@/components/ui/nav-link', () => ({
  NavLink: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Deterministic open-now: businesses tagged "OPEN" in their hours are open.
vi.mock('@/lib/business/hours', () => ({
  isOpenNow: (hours: unknown) =>
    Array.isArray(hours) && hours.includes('OPEN') ? true : false,
}))

import { HeroPreview } from '../HeroPreview'

interface Row {
  id: string
  name: string
  average_rating: number
  review_count: number
  latitude: number
  longitude: number
  hours: string[]
  is_chain: boolean | null
  tags: string[]
  category: { name: string; slug: string }
}

function biz(overrides: Partial<Row>): Row {
  return {
    id: Math.random().toString(36),
    name: 'Test',
    average_rating: 4.5,
    review_count: 100,
    latitude: 34.03,
    longitude: -117.81,
    hours: ['OPEN'],
    is_chain: false,
    tags: [],
    category: { name: 'Food & Drink', slug: 'food-drink' },
    ...overrides,
  }
}

const ROWS: Row[] = [
  biz({ id: '1', name: 'Tacitas Coffee', average_rating: 4.8, review_count: 69, hours: ['OPEN'], is_chain: false }),
  biz({ id: '2', name: 'Subway', average_rating: 4.0, review_count: 33, hours: [], is_chain: true }),
  biz({ id: '3', name: 'Basil And Co', average_rating: 4.7, review_count: 673, hours: ['OPEN'], is_chain: false }),
  biz({ id: '4', name: 'Makomae', average_rating: 4.6, review_count: 432, hours: ['OPEN'], is_chain: false }),
]

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCachedLocation.mockReturnValue(null)
  mockUseNearby.mockReturnValue({ data: ROWS, isLoading: false })
})

describe('HeroPreview', () => {
  it('renders the loading skeleton before mount / while loading', () => {
    mockUseNearby.mockReturnValue({ data: undefined, isLoading: true })
    const { container } = render(<HeroPreview />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.getByText('Today near you')).toBeInTheDocument()
  })

  it('shows the top-rated real businesses after mount', async () => {
    render(<HeroPreview />)
    await waitFor(() => {
      // Top 3 by rating: Tacitas (4.8), Basil (4.7), Makomae (4.6) — Subway (4.0) drops off
      expect(screen.getByText('Tacitas Coffee')).toBeInTheDocument()
    })
    expect(screen.getByText('Basil And Co')).toBeInTheDocument()
    expect(screen.getByText('Makomae')).toBeInTheDocument()
    expect(screen.queryByText('Subway')).not.toBeInTheDocument()
  })

  it('computes real counts: open now, independent, and total', async () => {
    const { container } = render(<HeroPreview />)
    await waitFor(() => expect(screen.getByText('Tacitas Coffee')).toBeInTheDocument())

    // 4 total businesses, 1 chain (Subway) -> 3 independent, 3 open (have 'OPEN')
    expect(screen.getByText('4 places')).toBeInTheDocument()

    const footer = container.querySelector('.grid-cols-3')
    expect(footer).not.toBeNull()
    const blocks = Array.from(footer!.children)
    expect(blocks[0]).toHaveTextContent('3')
    expect(blocks[0]).toHaveTextContent('Open now')
    expect(blocks[1]).toHaveTextContent('3')
    expect(blocks[1]).toHaveTextContent('Independent')
    expect(blocks[2]).toHaveTextContent('Avg rating')
  })

  it('labels the location "Near you" when the visitor shared their location', async () => {
    mockGetCachedLocation.mockReturnValue({ lat: 34.0, lng: -117.8 })
    render(<HeroPreview />)
    await waitFor(() => expect(screen.getByText('Near you')).toBeInTheDocument())
  })

  it('falls back to a skeleton when there are no rated businesses', () => {
    mockUseNearby.mockReturnValue({ data: [], isLoading: false })
    const { container } = render(<HeroPreview />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})
