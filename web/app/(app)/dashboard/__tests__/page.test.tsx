/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock next/navigation - redirect must throw like Next.js does to halt execution
const mockRedirect = vi.fn(() => {
  throw new Error('NEXT_REDIRECT')
})

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

// Mock Supabase server client
const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

// Mock COURSE_MODULES
vi.mock('@/lib/constants/modules', () => ({
  COURSE_MODULES: [
    {
      id: 'module-1',
      title: 'How Rockets Fly',
      lessons: [
        { id: 'lesson-1', title: 'Introduction to Thrust', isQuiz: false },
        { id: 'lesson-2', title: 'Quiz', isQuiz: true },
      ],
    },
    {
      id: 'module-2',
      title: 'Orbital Mechanics',
      lessons: [
        { id: 'lesson-3', title: 'Gravity', isQuiz: false },
      ],
    },
  ],
}))

// Mock child components
vi.mock('@/components/features/dashboard/AnimatedStatCard', () => ({
  AnimatedStatCard: ({ label, value }: { label: string; value: number }) => (
    <div data-testid="stat-card">
      <span data-testid="stat-value">{value}</span>
      <span data-testid="stat-label">{label}</span>
    </div>
  ),
}))

vi.mock('@/components/features/home/AnimatedSection', () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/nav-link', () => ({
  NavLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to login if not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    // Import and call the page - redirect throws to halt execution like Next.js
    const DashboardPage = (await import('../page')).default
    await expect(DashboardPage()).rejects.toThrow('NEXT_REDIRECT')

    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('renders dashboard for authenticated user', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    // Mock profile query
    const profileSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', lessons_completed: 2 },
        }),
      }),
    })

    // Mock progress query
    const progressSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [
          { module_id: 'module-1', lesson_id: 'lesson-1', completed: true, quiz_score: null, quiz_total: null, updated_at: new Date().toISOString() },
        ],
      }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: profileSelect }
      if (table === 'user_lesson_progress') return { select: progressSelect }
      return { select: vi.fn() }
    })

    const DashboardPage = (await import('../page')).default
    const Component = await DashboardPage()

    render(Component)

    // Check for page title
    expect(screen.getByText('Your Rocket Science Journey')).toBeInTheDocument()
  })

  it('displays welcome message with user name', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const profileSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-123', email: 'test@example.com', full_name: 'John', lessons_completed: 0 },
        }),
      }),
    })

    const progressSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [] }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: profileSelect }
      if (table === 'user_lesson_progress') return { select: progressSelect }
      return { select: vi.fn() }
    })

    const DashboardPage = (await import('../page')).default
    const Component = await DashboardPage()

    render(Component)

    expect(screen.getByText(/Welcome back, John/)).toBeInTheDocument()
  })

  it('renders stat cards', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const profileSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-123', email: 'test@example.com', full_name: null, lessons_completed: 0 },
        }),
      }),
    })

    const progressSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [] }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: profileSelect }
      if (table === 'user_lesson_progress') return { select: progressSelect }
      return { select: vi.fn() }
    })

    const DashboardPage = (await import('../page')).default
    const Component = await DashboardPage()

    render(Component)

    const statCards = screen.getAllByTestId('stat-card')
    expect(statCards.length).toBe(4) // Lessons, Modules, Quiz Accuracy, Progress
  })

  it('renders quick links section', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const profileSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-123', email: 'test@example.com', full_name: null, lessons_completed: 0 },
        }),
      }),
    })

    const progressSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [] }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: profileSelect }
      if (table === 'user_lesson_progress') return { select: progressSelect }
      return { select: vi.fn() }
    })

    const DashboardPage = (await import('../page')).default
    const Component = await DashboardPage()

    render(Component)

    expect(screen.getByText('Quick Links')).toBeInTheDocument()
    expect(screen.getByText('Learn')).toBeInTheDocument()
    expect(screen.getByText('Practice')).toBeInTheDocument()
    expect(screen.getByText('Simulate')).toBeInTheDocument()
  })
})
