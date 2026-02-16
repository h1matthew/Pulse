/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { BoostMissionWithCategory, MissionProgressDetails } from '@/types/mission'

// Mock data
const mockActiveMissions: BoostMissionWithCategory[] = [
  {
    id: 'mission-1',
    title: 'Coffee Explorer',
    description: 'Visit 3 different local coffee shops',
    mission_type: 'category_explore',
    target_count: 3,
    target_category_id: null,
    reward_deal_id: null,
    reward_description: 'Free pastry',
    start_date: null,
    end_date: null,
    is_active: true,
    created_at: new Date().toISOString(),
    category: { id: 'cat-1', name: 'Food & Drink', slug: 'food-drink', icon: '🍽️' },
  },
  {
    id: 'mission-2',
    title: 'Community Voice',
    description: 'Leave 3 thoughtful reviews',
    mission_type: 'review_count',
    target_count: 3,
    target_category_id: null,
    reward_deal_id: null,
    reward_description: 'Featured badge',
    start_date: null,
    end_date: null,
    is_active: true,
    created_at: new Date().toISOString(),
    category: null,
  },
]

// Mutable mock state
let mockMissionsData: BoostMissionWithCategory[] | undefined = undefined
let mockMissionsLoading = false
let mockMissionsError: Error | null = null
let mockActiveMissionsProgress: MissionProgressDetails[] = []
let mockCompletedMissions: MissionProgressDetails[] = []
let mockClaimedMissions: MissionProgressDetails[] = []
let mockProgressLoading = false
let mockAuthState = { isLoggedIn: false, userId: null as string | null, loading: false }

vi.mock('@/hooks/useMissions', () => ({
  useActiveMissions: () => ({
    data: mockMissionsData,
    isLoading: mockMissionsLoading,
    error: mockMissionsError,
  }),
  useMissionProgressDetails: () => ({
    activeMissions: mockActiveMissionsProgress,
    completedMissions: mockCompletedMissions,
    claimedMissions: mockClaimedMissions,
    isLoading: mockProgressLoading,
  }),
}))

vi.mock('@/types/mission', async () => {
  const actual = await vi.importActual('@/types/mission')
  return actual
})

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => mockAuthState,
}))

vi.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}))

vi.mock('@/components/features/home/AnimatedSection', () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/missions',
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button role="tab" data-value={value}>{children}</button>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
}

function renderPage() {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MissionsPage />
    </QueryClientProvider>
  )
}

// Import after mocks
import MissionsPage from '../page'

describe('MissionsPage', () => {
  beforeEach(() => {
    mockMissionsData = undefined
    mockMissionsLoading = false
    mockMissionsError = null
    mockActiveMissionsProgress = []
    mockCompletedMissions = []
    mockClaimedMissions = []
    mockProgressLoading = false
    mockAuthState = { isLoggedIn: false, userId: null, loading: false }
  })

  it('renders page header and title', () => {
    mockMissionsData = []
    renderPage()

    expect(screen.getByText('Boost Missions')).toBeInTheDocument()
    expect(screen.getByText(/Complete challenges, support local businesses/)).toBeInTheDocument()
  })

  it('shows skeleton loading states while loading', () => {
    mockMissionsLoading = true
    const { container } = renderPage()

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders active missions from hook data', () => {
    mockMissionsData = mockActiveMissions
    renderPage()

    expect(screen.getByText('Coffee Explorer')).toBeInTheDocument()
    expect(screen.getByText('Community Voice')).toBeInTheDocument()
    expect(screen.getByText('Food & Drink')).toBeInTheDocument()
    expect(screen.getByText('Reward: Free pastry')).toBeInTheDocument()
  })

  it('shows correct stats computed from real data', () => {
    mockMissionsData = mockActiveMissions
    renderPage()

    // Active missions count should be 2 (shown in the stats card)
    const statCards = screen.getAllByText('2')
    expect(statCards.length).toBeGreaterThanOrEqual(1)

    // "Active Missions" appears both as a stat label and tab trigger
    const activeLabels = screen.getAllByText('Active Missions')
    expect(activeLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty state when no active missions', () => {
    mockMissionsData = []
    renderPage()

    expect(screen.getByText('No Active Missions')).toBeInTheDocument()
    expect(screen.getByText(/New missions are added regularly/)).toBeInTheDocument()
  })

  it('shows error state when missions fail to load', () => {
    mockMissionsError = new Error('Failed to fetch')
    mockMissionsData = undefined
    renderPage()

    expect(screen.getByText('Failed to load missions')).toBeInTheDocument()
    expect(screen.getByText('Please try refreshing the page.')).toBeInTheDocument()
  })

  it('shows sign-in prompt on completed tab when not logged in', () => {
    mockMissionsData = mockActiveMissions
    mockAuthState = { isLoggedIn: false, userId: null, loading: false }
    renderPage()

    expect(screen.getByText('Sign In to Track Progress')).toBeInTheDocument()
  })

  it('shows empty completed state when logged in with no completions', () => {
    mockMissionsData = mockActiveMissions
    mockAuthState = { isLoggedIn: true, userId: 'user-1', loading: false }
    renderPage()

    expect(screen.getByText('No Completed Missions Yet')).toBeInTheDocument()
  })

  it('shows completed missions for logged-in users', () => {
    mockMissionsData = mockActiveMissions
    mockAuthState = { isLoggedIn: true, userId: 'user-1', loading: false }

    const completedMission: MissionProgressDetails = {
      progress: {
        id: 'progress-1',
        mission_id: 'mission-1',
        user_id: 'user-1',
        current_count: 3,
        is_completed: true,
        completed_at: new Date().toISOString(),
        reward_claimed: false,
        reward_claimed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mission: mockActiveMissions[0],
      },
      percentageComplete: 100,
      remainingCount: 0,
      daysRemaining: null,
    }

    mockCompletedMissions = [completedMission]
    renderPage()

    // The completed tab shows "Completed" badge text
    const completedBadges = screen.getAllByText('Completed')
    expect(completedBadges.length).toBeGreaterThanOrEqual(1)
    // "Coffee Explorer" appears in both active and completed sections
    const titles = screen.getAllByText('Coffee Explorer')
    expect(titles.length).toBeGreaterThanOrEqual(2)
  })

  it('shows progress for active missions when user has progress', () => {
    mockMissionsData = mockActiveMissions
    mockAuthState = { isLoggedIn: true, userId: 'user-1', loading: false }

    const progressDetail: MissionProgressDetails = {
      progress: {
        id: 'progress-1',
        mission_id: 'mission-1',
        user_id: 'user-1',
        current_count: 2,
        is_completed: false,
        completed_at: null,
        reward_claimed: false,
        reward_claimed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mission: mockActiveMissions[0],
      },
      percentageComplete: 67,
      remainingCount: 1,
      daysRemaining: null,
    }

    mockActiveMissionsProgress = [progressDetail]
    renderPage()

    expect(screen.getByText('2/3')).toBeInTheDocument()
    expect(screen.getByText('Continue')).toBeInTheDocument()
  })

  it('shows "Start" button when user has no progress on a mission', () => {
    mockMissionsData = [mockActiveMissions[0]]
    mockAuthState = { isLoggedIn: true, userId: 'user-1', loading: false }
    renderPage()

    expect(screen.getByText('Start')).toBeInTheDocument()
  })

  it('renders tab triggers', () => {
    mockMissionsData = []
    renderPage()

    const tabs = screen.getAllByRole('tab')
    expect(tabs.length).toBe(2)
  })
})
