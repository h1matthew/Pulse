/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock Supabase server client
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockFrom,
  })),
}))

// Mock child components
vi.mock('@/components/features/leaderboard/LeaderboardClient', () => ({
  LeaderboardClient: ({ initialEntries }: { initialEntries: unknown[] }) => (
    <div data-testid="leaderboard-client" data-count={initialEntries.length}>
      Leaderboard Client
    </div>
  ),
}))

vi.mock('@/components/features/home/AnimatedSection', () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('Leaderboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders leaderboard page title', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [],
          }),
        }),
      }),
    })

    const LeaderboardPage = (await import('../page')).default
    const Component = await LeaderboardPage()

    render(Component)

    expect(screen.getByText('Leaderboard')).toBeInTheDocument()
  })

  it('renders leaderboard description', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [],
          }),
        }),
      }),
    })

    const LeaderboardPage = (await import('../page')).default
    const Component = await LeaderboardPage()

    render(Component)

    expect(screen.getByText(/Top learners ranked by progress/)).toBeInTheDocument()
  })

  it('passes entries to LeaderboardClient', async () => {
    const mockEntries = [
      { id: '1', user_id: 'u1', display_name: 'User 1', total_score: 100 },
      { id: '2', user_id: 'u2', display_name: 'User 2', total_score: 80 },
    ]

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: mockEntries,
          }),
        }),
      }),
    })

    const LeaderboardPage = (await import('../page')).default
    const Component = await LeaderboardPage()

    render(Component)

    const client = screen.getByTestId('leaderboard-client')
    expect(client).toHaveAttribute('data-count', '2')
  })

  it('handles empty leaderboard data', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: null,
          }),
        }),
      }),
    })

    const LeaderboardPage = (await import('../page')).default
    const Component = await LeaderboardPage()

    render(Component)

    const client = screen.getByTestId('leaderboard-client')
    expect(client).toHaveAttribute('data-count', '0')
  })
})
