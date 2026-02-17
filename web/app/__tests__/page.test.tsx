/**
 * @vitest-environment jsdom
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

describe('Home Page', () => {
  it('renders without crashing', () => {
    render(<Home />)

    expect(document.body).toBeInTheDocument()
  })

  it('renders the header', () => {
    render(<Home />)

    expect(screen.getByTestId('header')).toBeInTheDocument()
  })

  it('renders hero section with main heading', () => {
    render(<Home />)

    expect(screen.getByText('Discover Local.')).toBeInTheDocument()
  })

  it('renders subheading with gradient text', () => {
    render(<Home />)

    expect(screen.getByText('Impact Community.')).toBeInTheDocument()
  })

  it('renders hero description', () => {
    render(<Home />)

    expect(screen.getByText(/Every review, bookmark, and visit strengthens your local economy/)).toBeInTheDocument()
  })

  it('renders CTA button to explore businesses', () => {
    render(<Home />)

    expect(screen.getByText('Explore Local Businesses')).toBeInTheDocument()
  })

  it('renders secondary CTA button', () => {
    render(<Home />)

    expect(screen.getByText('Learn How It Works')).toBeInTheDocument()
  })

  it('renders stats preview section', () => {
    render(<Home />)

    expect(screen.getByText('Kept Local')).toBeInTheDocument()
    expect(screen.getByText('Businesses')).toBeInTheDocument()
    expect(screen.getByText('Community Members')).toBeInTheDocument()
  })

  it('renders features section heading', () => {
    render(<Home />)

    expect(screen.getByText('More Than a Directory')).toBeInTheDocument()
  })

  it('renders feature cards', () => {
    render(<Home />)

    expect(screen.getByText('Economic Impact Dashboard')).toBeInTheDocument()
    expect(screen.getByText('AI-Matched For You')).toBeInTheDocument()
    expect(screen.getAllByText('Boost Missions').length).toBeGreaterThan(0)
  })

  it('renders community pulse section', () => {
    render(<Home />)

    expect(screen.getByText('Feel the Pulse of Your Community')).toBeInTheDocument()
  })

  it('renders final CTA section with correct heading', () => {
    render(<Home />)

    expect(screen.getByText('Ready to Make an Impact?')).toBeInTheDocument()
  })

  it('renders footer with brand name', () => {
    render(<Home />)

    // Footer contains brand name
    const footerBrand = screen.getAllByText('Pulse')
    expect(footerBrand.length).toBeGreaterThanOrEqual(1)
  })

  it('renders footer navigation links', () => {
    render(<Home />)

    expect(screen.getByText('Discover')).toBeInTheDocument()
    expect(screen.getByText('Community')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
  })

  it('renders mission tagline in footer', () => {
    render(<Home />)

    expect(screen.getByText(/Strengthening local economies, one discovery at a time/)).toBeInTheDocument()
  })
})
