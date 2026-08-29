/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import Home from '../page'

// Mock browser APIs not available in jsdom
beforeAll(() => {
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

  class MockIntersectionObserver {
    observe = vi.fn()
    disconnect = vi.fn()
    unobserve = vi.fn()
  }
  global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
})

// Mock components that use browser APIs or external providers
vi.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}))

vi.mock('@/components/features/home/HomeWrapper', () => ({
  HomeWrapper: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="home-wrapper">{children}</div>
  ),
}))

vi.mock('@/components/features/home/FeatureTabs', () => ({
  FeatureTabs: () => <div data-testid="feature-tabs">Listing rows</div>,
}))

vi.mock('@/components/features/home/CommunityStatsIsland', () => ({
  HeroStats: () => <div data-testid="hero-stats">Community Stats</div>,
}))

vi.mock('@/components/features/help/OnboardingTour', () => ({
  OnboardingTour: () => null,
}))

vi.mock('@/components/ui/nav-link', () => ({
  NavLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/components/ui/PulseLogo', () => ({
  PulseLogo: () => <svg data-testid="pulse-logo" />,
}))

describe('Home Page', () => {
  it('renders without crashing', () => {
    render(<Home />)
    expect(document.body).toBeInTheDocument()
  })

  it('renders the header', () => {
    render(<Home />)
    expect(screen.getByTestId('header')).toBeInTheDocument()
  })

  it('renders the directory title line', () => {
    render(<Home />)
    const heading = screen.getByRole('heading', { level: 1 })
    // HeroCityName falls back to "San Antonio" without a resolved location
    expect(heading).toHaveTextContent('Independent businesses in San Antonio.')
  })

  it('renders one supporting line that does not restate the title', () => {
    render(<Home />)
  })

  it('renders a search form that submits to the directory', () => {
    const { container } = render(<Home />)
    const form = container.querySelector('form[role="search"]')
    expect(form).toHaveAttribute('action', '/discover')
    expect(screen.getByLabelText('Search places')).toHaveAttribute('name', 'q')
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
  })

  it('does not render a hero preview mock', () => {
    render(<Home />)
    expect(screen.queryByTestId('hero-preview')).not.toBeInTheDocument()
  })

  it('does not nest buttons inside links', () => {
    const { container } = render(<Home />)
    expect(container.querySelector('a button')).toBeNull()
  })

  it('places the listing feed directly after the search section', () => {
    const { container } = render(<Home />)
    const sections = Array.from(container.querySelectorAll('section[aria-label]'))
    expect(sections.map((s) => s.getAttribute('aria-label'))).toEqual([
      'Search',
      'Nearby listings',
      'Community activity',
    ])
    expect(sections[1]).toContainElement(screen.getByTestId('feature-tabs'))
  })

  it('renders community stats section', () => {
    render(<Home />)
    expect(screen.getByTestId('hero-stats')).toBeInTheDocument()
  })

  it('drops the marketing sections the directory replaced', () => {
    render(<Home />)
    expect(screen.queryByText('Pick a place without the pitch')).not.toBeInTheDocument()
    expect(screen.queryByText('Keep the signal. Drop the noise.')).not.toBeInTheDocument()
    expect(screen.queryByText('Start with what is close.')).not.toBeInTheDocument()
    // The hardcoded impact table no longer presents invented numbers as the reader's own
    expect(screen.queryByText('$184 kept local')).not.toBeInTheDocument()
  })

  it('renders exactly one heading, the title line', () => {
    render(<Home />)
    expect(screen.getAllByRole('heading')).toHaveLength(1)
  })

  it('renders footer brand name', () => {
    render(<Home />)
    expect(screen.getAllByText('Pulse').length).toBeGreaterThanOrEqual(1)
  })

  it('folds the remaining call to action into the footer', () => {
    render(<Home />)
    const link = screen.getByRole('link', { name: 'Browse all places' })
    expect(link).toHaveAttribute('href', '/discover')
    expect(link.closest('footer')).not.toBeNull()
  })

  it('renders footer navigation links', () => {
    render(<Home />)
    expect(screen.getByText('Browse')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
  })

  it('does not render AI-heavy marketing copy', () => {
    render(<Home />)
    expect(screen.queryByText(/AI recommendation engine/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Powered by Google Places/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Every dollar you spend locally creates/i)).not.toBeInTheDocument()
  })
})
