/**
 * @vitest-environment jsdom
 *
 * Landmark and labelling checks for the homepage directory.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import Home from '../page'

// Mock all child components
vi.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}))

vi.mock('@/components/ui/nav-link', () => ({
  NavLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/components/features/home/CommunityStatsIsland', () => ({
  HeroStats: () => <div data-testid="hero-stats">Stats</div>,
  CommunityPulseCard: () => <div data-testid="community-pulse-card">Pulse Card</div>,
}))

// FeatureTabs uses React Query (live nearby rows), so it is mocked here too
vi.mock('@/components/features/home/FeatureTabs', () => ({
  FeatureTabs: () => <div data-testid="feature-tabs">Listing rows</div>,
}))

describe('Home Page Accessibility', () => {
  it('has aria-label on the search section', () => {
    render(<Home />)

    expect(document.querySelector('section[aria-label="Search"]')).toBeInTheDocument()
  })

  it('has aria-label on the listings section', () => {
    render(<Home />)

    expect(document.querySelector('section[aria-label="Nearby listings"]')).toBeInTheDocument()
  })

  it('has aria-label on the community activity section', () => {
    render(<Home />)

    expect(document.querySelector('section[aria-label="Community activity"]')).toBeInTheDocument()
  })

  it('exposes the search form as a search landmark with a labelled field', () => {
    render(<Home />)

    expect(document.querySelector('form[role="search"]')).toBeInTheDocument()
    expect(screen.getByLabelText('Search places')).toBeInTheDocument()
  })

  it('has role="contentinfo" on footer', () => {
    render(<Home />)

    const footer = document.querySelector('footer[role="contentinfo"]')
    expect(footer).toBeInTheDocument()
  })

  it('has aria-label on footer', () => {
    render(<Home />)

    const footer = document.querySelector('footer[aria-label="Site footer"]')
    expect(footer).toBeInTheDocument()
  })

  it('renders all section landmarks for screen readers', () => {
    render(<Home />)

    const labeledSections = document.querySelectorAll('section[aria-label]')
    expect(labeledSections.length).toBeGreaterThanOrEqual(3)
  })
})
