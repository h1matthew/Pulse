import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroStats, CommunityPulseCard } from '../CommunityStatsIsland'
import { createTestWrapper } from '@/__tests__/mocks/providers.mock'

// matchMedia stub (needed for jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
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

// Mock the hooks
const mockUseCommunityPulse = vi.fn()
const mockUseLocation = vi.fn()
const mockUseNearby = vi.fn()

vi.mock('@/hooks/useImpact', () => ({
  useCommunityPulse: () => mockUseCommunityPulse(),
}))

vi.mock('@/hooks/useLocation', () => ({
  useLocation: () => mockUseLocation(),
}))

vi.mock('@/hooks/useBusinesses', () => ({
  useNearbyBusinesses: (...args: unknown[]) => mockUseNearby(...args),
}))

interface NearbyBiz {
  id: string
  name: string
  review_count: number
  is_chain: boolean | null
  tags: string[]
}

function nearbyBiz(overrides: Partial<NearbyBiz>): NearbyBiz {
  return { id: Math.random().toString(36), name: 'Test', review_count: 0, is_chain: false, tags: [], ...overrides }
}

// 3 independent shops (Subway is a chain and is excluded), reviews 120+0+4080 = 4200,
// 2 of the independents have activity (review_count > 0).
const NEARBY: NearbyBiz[] = [
  nearbyBiz({ id: '1', name: 'Indie Cafe', review_count: 120, is_chain: false }),
  nearbyBiz({ id: '2', name: 'Subway', review_count: 9000, is_chain: true }),
  nearbyBiz({ id: '3', name: 'Corner Books', review_count: 0, is_chain: false }),
  nearbyBiz({ id: '4', name: 'Basil And Co', review_count: 4080, is_chain: false }),
]

const mockPulseData = {
  id: 'test-id',
  date: '2026-02-16',
  pulse_score: 8742,
  total_dollars_kept_local: 2400000,
  total_businesses_supported: 847,
  total_reviews_left: 12500,
  active_users: 3200,
  new_businesses_added: 10,
  total_missions_completed: 50,
  created_at: '2026-02-16T00:00:00Z',
  updated_at: '2026-02-16T00:00:00Z',
}

describe('HeroStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCommunityPulse.mockReturnValue({ data: mockPulseData, isLoading: false })
    mockUseLocation.mockReturnValue({ location: null })
    mockUseNearby.mockReturnValue({ data: NEARBY, isLoading: false })
  })

  it('shows skeleton cards while community data is loading', () => {
    mockUseCommunityPulse.mockReturnValue({ data: undefined, isLoading: true })

    const { container } = render(<HeroStats />, { wrapper: createTestWrapper() })

    // Skeletons render as divs with animate-pulse class
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows skeleton cards while nearby businesses are loading', () => {
    mockUseNearby.mockReturnValue({ data: undefined, isLoading: true })

    const { container } = render(<HeroStats />, { wrapper: createTestWrapper() })

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders the count of independent businesses nearby', () => {
    render(<HeroStats />, { wrapper: createTestWrapper() })

    // 3 independents (Subway, a chain, is excluded)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Businesses')).toBeInTheDocument()
  })

  it('renders the summed nearby reviews in compact form', () => {
    render(<HeroStats />, { wrapper: createTestWrapper() })

    // 120 + 0 + 4080 = 4200 across the independents
    expect(screen.getByText('4.2K')).toBeInTheDocument()
    expect(screen.getByText('Reviews')).toBeInTheDocument()
  })

  it('renders the count of nearby places with activity', () => {
    render(<HeroStats />, { wrapper: createTestWrapper() })

    // 2 independents have reviews (Indie Cafe, Basil And Co)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Places Supported')).toBeInTheDocument()
  })

  it('renders community members from the community-wide total', () => {
    render(<HeroStats />, { wrapper: createTestWrapper() })

    expect(screen.getByText('3.2K')).toBeInTheDocument()
    expect(screen.getByText('Community Members')).toBeInTheDocument()
  })

  it('shows fallback values when there is no nearby or community data', () => {
    mockUseCommunityPulse.mockReturnValue({ data: undefined, isLoading: false })
    mockUseNearby.mockReturnValue({ data: [], isLoading: false })

    render(<HeroStats />, { wrapper: createTestWrapper() })

    // Fallback stats: businesses 312, reviews 1.8K, supported 96, members 2.3K
    expect(screen.getByText('312')).toBeInTheDocument()
    expect(screen.getByText('1.8K')).toBeInTheDocument()
    expect(screen.getByText('96')).toBeInTheDocument()
    expect(screen.getByText('2.3K')).toBeInTheDocument()
  })
})

describe('CommunityPulseCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows skeleton while loading', () => {
    mockUseCommunityPulse.mockReturnValue({ data: undefined, isLoading: true })

    const { container } = render(<CommunityPulseCard />, { wrapper: createTestWrapper() })

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders pulse score with locale formatting', () => {
    mockUseCommunityPulse.mockReturnValue({ data: mockPulseData, isLoading: false })

    render(<CommunityPulseCard />, { wrapper: createTestWrapper() })

    expect(screen.getByText('8,742')).toBeInTheDocument()
    expect(screen.getByText('Community Pulse Score')).toBeInTheDocument()
  })

  it('renders formatted dollars in metric row', () => {
    mockUseCommunityPulse.mockReturnValue({ data: mockPulseData, isLoading: false })

    render(<CommunityPulseCard />, { wrapper: createTestWrapper() })

    expect(screen.getByText('Dollars Kept Local')).toBeInTheDocument()
    expect(screen.getByText('$2.4M')).toBeInTheDocument()
  })

  it('renders businesses count in metric row', () => {
    mockUseCommunityPulse.mockReturnValue({ data: mockPulseData, isLoading: false })

    render(<CommunityPulseCard />, { wrapper: createTestWrapper() })

    expect(screen.getByText('Businesses Supported')).toBeInTheDocument()
    expect(screen.getByText('847')).toBeInTheDocument()
  })

  it('computes and renders jobs impacted from dollars', () => {
    mockUseCommunityPulse.mockReturnValue({ data: mockPulseData, isLoading: false })

    render(<CommunityPulseCard />, { wrapper: createTestWrapper() })

    // $2,400,000 / 15,000 = 160 jobs
    expect(screen.getByText('Jobs Impacted')).toBeInTheDocument()
    expect(screen.getByText('160')).toBeInTheDocument()
  })

  it('renders fallback values when data is undefined', () => {
    mockUseCommunityPulse.mockReturnValue({ data: undefined, isLoading: false })

    render(<CommunityPulseCard />, { wrapper: createTestWrapper() })

    // Fallback stats: pulseScore=7420, dollars=284600, businesses=312
    expect(screen.getByText('7,420')).toBeInTheDocument()
    expect(screen.getByText('Community Pulse Score')).toBeInTheDocument()
    expect(screen.getByText('$284.6K')).toBeInTheDocument()
    expect(screen.getByText('312')).toBeInTheDocument()
  })
})
