/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const mockStartMutateAsync = vi.fn()
let mockStartPending = false

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
  useStartMission: () => ({
    mutateAsync: mockStartMutateAsync,
    isPending: mockStartPending,
  }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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
  underlineTabsListClass: '',
  underlineTabsTriggerClass: '',
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
    mockStartPending = false
    mockStartMutateAsync.mockReset()
    mockStartMutateAsync.mockResolvedValue({ id: 'progress-new' })
  })

  it('renders page header and title', () => {
    mockMissionsData = []
    renderPage()

    expect(screen.getByText('Boost Missions')).toBeInTheDocument()
    expect(screen.getByText(/Check in at local businesses to complete challenges/)).toBeInTheDocument()
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

    // Stats read as one mono line under the heading, not as three stat cards
    expect(screen.getByTestId('stat-active')).toHaveTextContent('2 active')
    expect(screen.getByTestId('stat-completed')).toHaveTextContent('0 completed')
    expect(screen.getByTestId('stat-in-progress')).toHaveTextContent('0 in progress')
    expect(screen.getByTestId('stat-active').parentElement).toHaveClass('font-mono')

    // "Active Missions" survives only as the tab trigger
    expect(screen.getAllByText('Active Missions')).toHaveLength(1)
  })

  it('has no eyebrow label above the heading', () => {
    mockMissionsData = []
    renderPage()

    expect(screen.queryByText(/challenges & rewards/i)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Boost Missions' })).toHaveClass('font-medium')
  })

  it('drops the unsourced hotspot and group check-in sections', () => {
    mockMissionsData = mockActiveMissions
    renderPage()

    expect(screen.queryByText('Hotspots')).not.toBeInTheDocument()
    expect(screen.queryByText('Group Check-ins')).not.toBeInTheDocument()
    expect(screen.queryByText(/2× POINTS/i)).not.toBeInTheDocument()
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

  it('deep-links Continue to discover filtered by the mission category', () => {
    mockMissionsData = [mockActiveMissions[0]]
    mockAuthState = { isLoggedIn: true, userId: 'user-1', loading: false }
    mockActiveMissionsProgress = [
      {
        progress: {
          id: 'progress-1',
          mission_id: 'mission-1',
          user_id: 'user-1',
          current_count: 0,
          is_completed: false,
          completed_at: null,
          reward_claimed: false,
          reward_claimed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          mission: mockActiveMissions[0],
        },
        percentageComplete: 0,
        remainingCount: 3,
        daysRemaining: null,
      },
    ]
    renderPage()

    const continueLink = screen.getByRole('link', {
      name: /continue mission: coffee explorer/i,
    })
    expect(continueLink).toHaveAttribute('href', '/discover?category=food-drink')
  })

  it('shows "Start" button when user has no progress on a mission', () => {
    mockMissionsData = [mockActiveMissions[0]]
    mockAuthState = { isLoggedIn: true, userId: 'user-1', loading: false }
    renderPage()

    expect(screen.getByText('Start')).toBeInTheDocument()
  })

  it('starts the mission when a signed-in user clicks Start', async () => {
    mockMissionsData = [mockActiveMissions[0]]
    mockAuthState = { isLoggedIn: true, userId: 'user-1', loading: false }
    renderPage()

    fireEvent.click(
      screen.getByRole('button', { name: /start mission: coffee explorer/i })
    )

    await waitFor(() => {
      expect(mockStartMutateAsync).toHaveBeenCalledWith('mission-1')
    })
  })

  it('routes signed-out users to login instead of starting', () => {
    mockMissionsData = [mockActiveMissions[0]]
    renderPage()

    const link = screen.getByRole('link', {
      name: /sign in to start mission: coffee explorer/i,
    })
    expect(link).toHaveAttribute('href', '/login')
    expect(mockStartMutateAsync).not.toHaveBeenCalled()
  })

  it('exposes mission progress to assistive tech with an accessible name', () => {
    mockMissionsData = [mockActiveMissions[0]]
    mockAuthState = { isLoggedIn: true, userId: 'user-1', loading: false }
    renderPage()

    expect(
      screen.getByRole('progressbar', { name: /coffee explorer progress: 0 of 3/i })
    ).toBeInTheDocument()
  })

  it('announces loading state to screen readers', () => {
    mockMissionsLoading = true
    renderPage()

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
    expect(screen.getByText('Loading missions…')).toBeInTheDocument()
  })

  it('counts started-but-unfinished missions as in progress', () => {
    mockMissionsData = [mockActiveMissions[0]]
    mockAuthState = { isLoggedIn: true, userId: 'user-1', loading: false }
    mockActiveMissionsProgress = [
      {
        progress: {
          id: 'progress-1',
          mission_id: 'mission-1',
          user_id: 'user-1',
          current_count: 0,
          is_completed: false,
          completed_at: null,
          reward_claimed: false,
          reward_claimed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          mission: mockActiveMissions[0],
        },
        percentageComplete: 0,
        remainingCount: 3,
        daysRemaining: null,
      },
    ]
    renderPage()

    // The freshly started 0/3 mission counts toward "in progress"
    expect(screen.getByTestId('stat-in-progress')).toHaveTextContent('1 in progress')
  })

  it('renders tab triggers', () => {
    mockMissionsData = []
    renderPage()

    const tabs = screen.getAllByRole('tab')
    expect(tabs.length).toBe(2)
  })
})
