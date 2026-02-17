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

// Mock the hook
const mockUseCommunityPulse = vi.fn()

vi.mock('@/hooks/useImpact', () => ({
  useCommunityPulse: () => mockUseCommunityPulse(),
}))

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
  })

  it('shows skeleton cards while loading', () => {
    mockUseCommunityPulse.mockReturnValue({ data: undefined, isLoading: true })

    const { container } = render(<HeroStats />, { wrapper: createTestWrapper() })

    // Skeletons render as divs with animate-pulse class
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders formatted dollars kept local', () => {
    mockUseCommunityPulse.mockReturnValue({ data: mockPulseData, isLoading: false })

    render(<HeroStats />, { wrapper: createTestWrapper() })

    expect(screen.getByText('$2.4M')).toBeInTheDocument()
    expect(screen.getByText('Kept Local')).toBeInTheDocument()
  })

  it('renders businesses count', () => {
    mockUseCommunityPulse.mockReturnValue({ data: mockPulseData, isLoading: false })

    render(<HeroStats />, { wrapper: createTestWrapper() })

    expect(screen.getByText('847')).toBeInTheDocument()
    expect(screen.getByText('Businesses')).toBeInTheDocument()
  })

  it('renders reviews in compact form', () => {
    mockUseCommunityPulse.mockReturnValue({ data: mockPulseData, isLoading: false })

    render(<HeroStats />, { wrapper: createTestWrapper() })

    expect(screen.getByText('12.5K')).toBeInTheDocument()
    expect(screen.getByText('Reviews')).toBeInTheDocument()
  })

  it('renders community members in compact form', () => {
    mockUseCommunityPulse.mockReturnValue({ data: mockPulseData, isLoading: false })

    render(<HeroStats />, { wrapper: createTestWrapper() })

    expect(screen.getByText('3.2K')).toBeInTheDocument()
    expect(screen.getByText('Community Members')).toBeInTheDocument()
  })

  it('shows zero values when data is undefined', () => {
    mockUseCommunityPulse.mockReturnValue({ data: undefined, isLoading: false })

    render(<HeroStats />, { wrapper: createTestWrapper() })

    expect(screen.getByText('$0')).toBeInTheDocument()
    // Businesses, Reviews, and Community Members all show "0"
    expect(screen.getAllByText('0')).toHaveLength(3)
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

  it('renders zero values when data is undefined', () => {
    mockUseCommunityPulse.mockReturnValue({ data: undefined, isLoading: false })

    render(<CommunityPulseCard />, { wrapper: createTestWrapper() })

    // Pulse score, businesses, and jobs all show "0"; dollars shows "$0"
    expect(screen.getAllByText('0')).toHaveLength(3)
    expect(screen.getByText('$0')).toBeInTheDocument()
    expect(screen.getByText('Community Pulse Score')).toBeInTheDocument()
  })
})
