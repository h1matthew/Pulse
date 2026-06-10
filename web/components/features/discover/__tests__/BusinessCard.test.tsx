import { describe, it, expect, vi } from 'vitest'

// Mock matchMedia before importing components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn()
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
})

// Mock the hooks
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ user: null }),
}))

vi.mock('@/hooks/useBookmarks', () => ({
  useIsBookmarked: () => ({ data: false }),
  useToggleBookmark: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/discover',
}))

import { render, screen } from '@testing-library/react'
import { BusinessCard, BusinessCardSkeleton } from '../BusinessCard'
import type { BusinessWithCategory } from '@/types/business'

const mockBusiness: BusinessWithCategory = {
  id: 'test-id',
  name: 'Test Business',
  slug: 'test-business',
  category_id: 'cat-1',
  description: 'A test business description',
  short_description: 'Short description',
  address: '123 Test St',
  city: 'Test City',
  state: 'TC',
  zip_code: '12345',
  phone: '555-1234',
  email: null,
  website: 'https://test.com',
  latitude: 40.7128,
  longitude: -74.0060,
  hours: { monday: '9:00 AM - 5:00 PM' },
  photos: ['https://example.com/photo.jpg'],
  logo_url: null,
  owner_id: null,
  is_verified: true,
  is_featured: false,
  price_range: 2,
  tags: ['restaurant', 'food'],
  amenities: [],
  average_rating: 4.5,
  review_count: 100,
  bookmark_count: 10,
  place_id: 'place-123',
  data_source: 'google',
  last_synced_at: new Date().toISOString(),
  sync_status: 'active',
  claimed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  category: {
    id: 'cat-1',
    slug: 'food-drink',
    name: 'Food & Drink',
    description: 'Restaurants and cafes',
    icon: '🍽️',
    color: 'oklch(0.7 0.16 45)',
    sort_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
  },
}

describe('BusinessCardSkeleton', () => {
  it('renders skeleton loader', () => {
    const { container } = render(<BusinessCardSkeleton index={0} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })
})

describe('BusinessCard', () => {
  it('renders business name', () => {
    render(<BusinessCard business={mockBusiness} index={0} />)
    expect(screen.getByText('Test Business')).toBeInTheDocument()
  })

  it('renders category name', () => {
    render(<BusinessCard business={mockBusiness} index={0} />)
    expect(screen.getByText('Food & Drink')).toBeInTheDocument()
  })

  it('renders rating', () => {
    render(<BusinessCard business={mockBusiness} index={0} />)
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })

  it('renders price range', () => {
    render(<BusinessCard business={mockBusiness} index={0} />)
    expect(screen.getByText('$$')).toBeInTheDocument()
  })

  it('renders verified badge when business is verified', () => {
    render(<BusinessCard business={mockBusiness} index={0} />)
    expect(screen.getByText('✓ Verified')).toBeInTheDocument()
  })

  it('renders city and state', () => {
    render(<BusinessCard business={mockBusiness} index={0} />)
    expect(screen.getByText('Test City, TC')).toBeInTheDocument()
  })

  it('renders tags', () => {
    render(<BusinessCard business={mockBusiness} index={0} />)
    // Tags are rendered via formatTagLabel, which Title-cases snake_case tags
    expect(screen.getByText('Restaurant')).toBeInTheDocument()
    expect(screen.getByText('Food')).toBeInTheDocument()
  })
})
