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

vi.mock('@/components/features/home/AnimatedSection', () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/features/home/ParallaxGlow', () => ({
  ParallaxGlow: () => <div data-testid="parallax-glow" />,
}))

vi.mock('@/components/features/home/FeatureTabs', () => ({
  FeatureTabs: () => <div data-testid="feature-tabs">Feature Tabs</div>,
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

  it('renders hero section main heading', () => {
    render(<Home />)
    expect(screen.getByText(/Every dollar you spend locally creates/)).toBeInTheDocument()
  })

  it('renders hero description', () => {
    render(<Home />)
    expect(screen.getByText(/Discover small businesses in your community/)).toBeInTheDocument()
  })

  it('renders primary CTA button', () => {
    render(<Home />)
    expect(screen.getByText('Explore Businesses')).toBeInTheDocument()
  })

  it('renders secondary CTA button', () => {
    render(<Home />)
    expect(screen.getByText('How It Works')).toBeInTheDocument()
  })

  it('renders feature tabs section', () => {
    render(<Home />)
    expect(screen.getByTestId('feature-tabs')).toBeInTheDocument()
  })

  it('renders community stats section', () => {
    render(<Home />)
    expect(screen.getByTestId('hero-stats')).toBeInTheDocument()
  })

  it('renders discover businesses section', () => {
    render(<Home />)
    expect(screen.getByText('Find businesses your neighbors love')).toBeInTheDocument()
  })

  it('renders impact section', () => {
    render(<Home />)
    expect(screen.getByText('See where your money goes')).toBeInTheDocument()
  })

  it('renders final CTA section', () => {
    render(<Home />)
    expect(screen.getByText('Your community is already here')).toBeInTheDocument()
  })

  it('renders footer brand name', () => {
    render(<Home />)
    expect(screen.getAllByText('Pulse').length).toBeGreaterThanOrEqual(1)
  })

  it('renders footer tagline', () => {
    render(<Home />)
    expect(
      screen.getByText(/Strengthening local economies, one discovery at a time/)
    ).toBeInTheDocument()
  })

  it('renders footer navigation links', () => {
    render(<Home />)
    expect(screen.getByText('All Businesses')).toBeInTheDocument()
    expect(screen.getByText('Our Mission')).toBeInTheDocument()
  })
})
