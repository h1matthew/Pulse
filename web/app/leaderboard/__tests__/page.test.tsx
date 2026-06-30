/**
 * @vitest-environment jsdom
 *
 * Regression coverage for a hydration bug: the "Stats Overview" cards used to
 * render a <Skeleton> (a <div>) inside a <p>, which is invalid HTML ("<div>
 * cannot be a descendant of <p>") and throws a React hydration error. These
 * tests assert no <p> on the page ever wraps a block-level <div>.
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import LeaderboardPage from '../page'

// Header pulls in router/auth/navigation; stub it for this focused unit test.
vi.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header" />,
}))

// AnimatedSection wraps content in scroll-triggered animations (Intersection
// Observer); render its children directly so the markup is in the tree.
vi.mock('@/components/features/home/AnimatedSection', () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ user: null }),
}))

const mockUseLeaderboard = vi.fn()
vi.mock('@/hooks/useImpact', () => ({
  useLeaderboard: () => mockUseLeaderboard(),
}))

/** Any <p> that contains a <div> is invalid HTML and breaks hydration. */
function paragraphsWrappingDivs(container: HTMLElement): HTMLParagraphElement[] {
  return Array.from(container.querySelectorAll('p')).filter((p) => p.querySelector('div'))
}

describe('LeaderboardPage (no block elements nested inside <p>)', () => {
  it('does not nest a Skeleton (div) inside a <p> while loading', () => {
    mockUseLeaderboard.mockReturnValue({ data: undefined, isLoading: true })
    const { container } = render(<LeaderboardPage />)

    expect(paragraphsWrappingDivs(container)).toHaveLength(0)
  })

  it('keeps stat values valid once leaderboard data loads', () => {
    mockUseLeaderboard.mockReturnValue({
      data: {
        entries: [
          {
            user_id: 'u1',
            rank: 1,
            display_name: 'Ada Lovelace',
            impact_score: 1200,
            dollars_kept_local: 5000,
          },
        ],
        userRank: undefined,
      },
      isLoading: false,
    })
    const { container } = render(<LeaderboardPage />)

    expect(paragraphsWrappingDivs(container)).toHaveLength(0)
  })
})
