/**
 * @vitest-environment jsdom
 *
 * Tests for Phase 2 accessibility improvements across the app.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import Home from '../page'

// Mock all child components
vi.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}))

vi.mock('@/components/features/home/AnimatedSection', () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

describe('Home Page Accessibility', () => {
  it('has aria-label on hero section', () => {
    render(<Home />)

    const heroSection = document.querySelector('section[aria-label="Hero"]')
    expect(heroSection).toBeInTheDocument()
  })

  it('has aria-label on features section', () => {
    render(<Home />)

    const featuresSection = document.querySelector('section[aria-label="Features"]')
    expect(featuresSection).toBeInTheDocument()
  })

  it('has aria-label on community pulse section', () => {
    render(<Home />)

    const communitySection = document.querySelector('section[aria-label="Community Pulse"]')
    expect(communitySection).toBeInTheDocument()
  })

  it('has aria-label on CTA section', () => {
    render(<Home />)

    const ctaSection = document.querySelector('section[aria-label="Call to action"]')
    expect(ctaSection).toBeInTheDocument()
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

    // Should have multiple sections with aria-labels
    const labeledSections = document.querySelectorAll('section[aria-label]')
    expect(labeledSections.length).toBeGreaterThanOrEqual(4)
  })
})
