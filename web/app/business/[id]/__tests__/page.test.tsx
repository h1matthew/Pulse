/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React, { Suspense } from 'react'

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

// Track fetch calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock hooks and dependencies
const mockRefetch = vi.fn()
let mockBusinessData: Record<string, unknown> | undefined = undefined
let mockIsLoading = false

vi.mock('@/hooks/useBusinesses', () => ({
  useBusiness: () => ({
    data: mockBusinessData,
    isLoading: mockIsLoading,
    refetch: mockRefetch,
  }),
}))

vi.mock('@/hooks/useBookmarks', () => ({
  useIsBookmarked: () => ({ data: false }),
  useToggleBookmark: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/hooks/useDeals', () => ({
  useClaimDeal: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

let mockUser: Record<string, unknown> | null = null
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser }),
}))

vi.mock('@/lib/reviews/sync-shared', () => ({
  getSyncStatus: () => ({
    canSync: true,
    lastSyncedText: 'Never synced',
    isStale: false,
  }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/business/test-id',
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, priority, ...rest } = props
    return <img {...rest} />
  },
}))

vi.mock('@/components/features/business/PhotoGallery', () => ({
  PhotoGallery: () => <div data-testid="photo-gallery">Photo Gallery</div>,
}))

// Mock CaptchaWidget - auto-verifies with a test token
vi.mock('@/components/features/bot/CaptchaWidget', () => ({
  CaptchaWidget: ({ onVerify }: { onVerify: (token: string) => void }) => {
    return (
      <div data-testid="captcha-widget">
        <button type="button" onClick={() => onVerify('test-captcha-token')}>
          Complete CAPTCHA
        </button>
      </div>
    )
  },
}))

// Mock AnimatedSection to render children immediately
vi.mock('@/components/features/home/AnimatedSection', () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock Header
vi.mock('@/components/layout/Header', () => ({
  Header: () => <header>Header</header>,
}))

// Mock NavLink
vi.mock('@/components/ui/nav-link', () => ({
  NavLink: ({ children, ...props }: { children: React.ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}))

// Mock Tabs to render all tab content (Radix tabs don't switch in jsdom)
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  TabsList: ({ children, ...props }: { children: React.ReactNode }) => <div role="tablist" {...props}>{children}</div>,
  TabsTrigger: ({ children, value, ...props }: { children: React.ReactNode; value: string }) => (
    <button role="tab" data-value={value} {...props}>{children}</button>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import BusinessDetailPage from '../page'

function createMockBusiness(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-id',
    name: 'Test Business',
    slug: 'test-business',
    category_id: 'cat-1',
    description: 'A test business',
    short_description: 'Short desc',
    address: '123 Test St',
    city: 'Test City',
    state: 'TC',
    zip_code: '12345',
    phone: '555-1234',
    email: null,
    website: 'https://test.com',
    latitude: 40.7128,
    longitude: -74.006,
    hours: { monday: '9:00 AM - 5:00 PM' },
    photos: [],
    logo_url: null,
    owner_id: null,
    is_verified: false,
    is_featured: false,
    price_range: 2,
    tags: [],
    amenities: [],
    average_rating: 4.5,
    review_count: 0,
    bookmark_count: 0,
    place_id: null,
    data_source: 'google' as const,
    last_synced_at: null,
    sync_status: 'active' as const,
    claimed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ai_description: null,
    ai_description_generated_at: null,
    ai_description_source: null,
    editorial_summary: null,
    ai_business_summary: null,
    category: {
      id: 'cat-1',
      slug: 'food-drink',
      name: 'Food & Drink',
      description: 'Restaurants',
      icon: '🍽️',
      color: 'oklch(0.7 0.16 45)',
      sort_order: 1,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    reviews: [],
    deals: [],
    is_bookmarked: false,
    ...overrides,
  }
}

function renderPage() {
  return render(
    <Suspense fallback={<div>Loading...</div>}>
      <BusinessDetailPage params={Promise.resolve({ id: 'test-id' })} />
    </Suspense>
  )
}

describe('BusinessDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ description: 'Generated AI description', cached: false }),
    })
    mockIsLoading = false
    mockBusinessData = undefined
    mockUser = null
  })

  describe('AI Description', () => {
    it('displays ai_description from business data without making a POST request', async () => {
      mockBusinessData = createMockBusiness({
        ai_description: 'Stored AI description from database',
      })

      await act(async () => {
        renderPage()
      })

      await waitFor(() => {
        expect(screen.getByText('Stored AI description from database')).toBeInTheDocument()
      })

      // Should NOT have made a POST request to generate
      const postCalls = mockFetch.mock.calls.filter(
        (call: unknown[]) => {
          const options = call[1] as { method?: string } | undefined
          return options?.method === 'POST' && String(call[0]).includes('generate-description')
        }
      )
      expect(postCalls).toHaveLength(0)
    })

    it('auto-generates AI description via POST when ai_description is null', async () => {
      mockBusinessData = createMockBusiness({
        ai_description: null,
      })

      await act(async () => {
        renderPage()
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('generate-description'),
          expect.objectContaining({ method: 'POST' })
        )
      })
    })

    it('shows AI Generated badge when ai_description is available', async () => {
      mockBusinessData = createMockBusiness({
        ai_description: 'A wonderful local business',
      })

      await act(async () => {
        renderPage()
      })

      await waitFor(() => {
        expect(screen.getByText('AI Generated')).toBeInTheDocument()
      })
    })
  })

  describe('Review Tab Count', () => {
    it('shows review_count from business data in the tab', async () => {
      mockBusinessData = createMockBusiness({
        review_count: 642,
        reviews: [],
      })

      await act(async () => {
        renderPage()
      })

      await waitFor(() => {
        expect(screen.getByText(/Reviews \(642\)/)).toBeInTheDocument()
      })
    })

    it('shows 0 when review_count is 0', async () => {
      mockBusinessData = createMockBusiness({
        review_count: 0,
        reviews: [],
      })

      await act(async () => {
        renderPage()
      })

      await waitFor(() => {
        expect(screen.getByText(/Reviews \(0\)/)).toBeInTheDocument()
      })
    })
  })

  describe('Reviews Empty State', () => {
    it('shows "reviews available on Google" when review_count > 0 but reviews array is empty', async () => {
      mockBusinessData = createMockBusiness({
        review_count: 642,
        reviews: [],
        place_id: 'ChIJ123',
      })

      await act(async () => {
        renderPage()
      })

      // With mocked Tabs, all tab content is visible
      await waitFor(() => {
        expect(screen.getByText('642 reviews available on Google')).toBeInTheDocument()
      })
    })

    it('shows "No reviews yet" when review_count is 0 and reviews array is empty', async () => {
      mockBusinessData = createMockBusiness({
        review_count: 0,
        reviews: [],
      })

      await act(async () => {
        renderPage()
      })

      // With mocked Tabs, all tab content is visible
      await waitFor(() => {
        expect(screen.getByText('No reviews yet')).toBeInTheDocument()
      })
    })
  })

  describe('Auto-sync Reviews', () => {
    it('auto-syncs reviews when review_count > 0 but reviews array is empty', async () => {
      mockBusinessData = createMockBusiness({
        review_count: 642,
        reviews: [],
        place_id: 'ChIJ123',
      })

      await act(async () => {
        renderPage()
      })

      // Should have triggered a POST to the reviews sync endpoint
      await waitFor(() => {
        const syncCalls = mockFetch.mock.calls.filter(
          (call: unknown[]) => {
            const options = call[1] as { method?: string } | undefined
            return options?.method === 'POST' && String(call[0]).includes('reviews/sync')
          }
        )
        expect(syncCalls).toHaveLength(1)
      })
    })

    it('does not auto-sync reviews when review_count is 0', async () => {
      mockBusinessData = createMockBusiness({
        review_count: 0,
        reviews: [],
        place_id: 'ChIJ123',
      })

      await act(async () => {
        renderPage()
      })

      // Should NOT have triggered a sync
      const syncCalls = mockFetch.mock.calls.filter(
        (call: unknown[]) => {
          const options = call[1] as { method?: string } | undefined
          return options?.method === 'POST' && String(call[0]).includes('reviews/sync')
        }
      )
      expect(syncCalls).toHaveLength(0)
    })

    it('does not auto-sync reviews when place_id is null', async () => {
      mockBusinessData = createMockBusiness({
        review_count: 100,
        reviews: [],
        place_id: null,
      })

      await act(async () => {
        renderPage()
      })

      const syncCalls = mockFetch.mock.calls.filter(
        (call: unknown[]) => {
          const options = call[1] as { method?: string } | undefined
          return options?.method === 'POST' && String(call[0]).includes('reviews/sync')
        }
      )
      expect(syncCalls).toHaveLength(0)
    })
  })

  describe('UI Elements', () => {
    it('renders star icons and rating in the header', async () => {
      mockBusinessData = createMockBusiness({
        average_rating: 4.5,
      })

      await act(async () => {
        renderPage()
      })

      // Rating 4.5 appears in header and sidebar — use getAllByText
      await waitFor(() => {
        expect(screen.getByText('Test Business')).toBeInTheDocument()
        const ratingElements = screen.getAllByText('4.5')
        expect(ratingElements.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('shows AI description in About card', async () => {
      mockBusinessData = createMockBusiness({
        ai_description: 'A great place to visit',
      })

      await act(async () => {
        renderPage()
      })

      // "About" appears in both the tab trigger and the card header
      await waitFor(() => {
        const aboutElements = screen.getAllByText('About')
        expect(aboutElements.length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText('A great place to visit')).toBeInTheDocument()
      })
    })
  })

  describe('Review Form Validation', () => {
    beforeEach(() => {
      mockUser = { id: 'user-1', email: 'test@test.com' }
    })

    it('shows character count below the review textarea', async () => {
      mockBusinessData = createMockBusiness()

      await act(async () => {
        renderPage()
      })

      await waitFor(() => {
        expect(screen.getByText('0/2000')).toBeInTheDocument()
      })
    })

    it('shows validation error for too-short review content', async () => {
      mockBusinessData = createMockBusiness()

      await act(async () => {
        renderPage()
      })

      // Type a short review
      const textarea = screen.getByPlaceholderText(/Share your experience/i)
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Short' } })
      })

      // Complete CAPTCHA first so we don't get blocked by that
      const captchaButton = screen.getByText('Complete CAPTCHA')
      await act(async () => {
        fireEvent.click(captchaButton)
      })

      // Click submit
      const submitButton = screen.getByText('Submit Review')
      await act(async () => {
        fireEvent.click(submitButton)
      })

      // Should show inline error
      await waitFor(() => {
        expect(screen.getByText(/Review must be at least 10 characters/i)).toBeInTheDocument()
      })
    })

    it('renders the CAPTCHA widget in the review form', async () => {
      mockBusinessData = createMockBusiness()

      await act(async () => {
        renderPage()
      })

      await waitFor(() => {
        expect(screen.getByTestId('captcha-widget')).toBeInTheDocument()
      })
    })

    it('disables submit button until CAPTCHA is completed', async () => {
      mockBusinessData = createMockBusiness()

      await act(async () => {
        renderPage()
      })

      await waitFor(() => {
        const submitButton = screen.getByText('Submit Review')
        expect(submitButton).toBeDisabled()
      })

      // Complete CAPTCHA
      const captchaButton = screen.getByText('Complete CAPTCHA')
      await act(async () => {
        fireEvent.click(captchaButton)
      })

      await waitFor(() => {
        const submitButton = screen.getByText('Submit Review')
        expect(submitButton).not.toBeDisabled()
      })
    })
  })
})
