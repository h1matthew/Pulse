/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

// Mock next/navigation
const mockRedirect = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() })),
  usePathname: vi.fn(() => '/achievements'),
  redirect: mockRedirect,
}))

const mockGetUser = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

// Mock NavLink
vi.mock('@/components/ui/nav-link', () => ({
  NavLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock providers
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    isLoggedIn: true,
    isAdmin: false,
    loading: false,
    userId: 'user-123',
    user: { id: 'user-123', email: 'test@example.com' },
  }),
}))

vi.mock('@/components/providers/AchievementProvider', () => ({
  useAchievements: () => ({
    checkAchievements: vi.fn(),
    unlockedIds: new Set(),
    toasts: [],
    dismissToast: vi.fn(),
  }),
}))

vi.mock('@/components/features/home/AnimatedSection', () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

describe('Achievements Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'test@example.com' } } })
    mockEq.mockResolvedValue({ data: [], error: null })
  })

  it('should be importable', async () => {
    const module = await import('../page')
    expect(module.default).toBeDefined()
  })

  it('renders without crashing', async () => {
    const AchievementsPage = (await import('../page')).default
    const component = await AchievementsPage()
    const { container } = render(component)

    expect(container).toBeInTheDocument()
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
