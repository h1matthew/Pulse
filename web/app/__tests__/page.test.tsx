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

vi.mock('@/components/features/home/SpaceBackground', () => ({
  SpaceBackground: () => <div data-testid="space-background">Space Background</div>,
}))

vi.mock('@/components/features/home/HeroContent', () => ({
  HeroContent: () => <div data-testid="hero-content">Hero Content</div>,
}))

vi.mock('@/components/features/home/FeaturesSection', () => ({
  FeaturesSection: () => <section data-testid="features-section">Features</section>,
}))

vi.mock('@/components/features/home/ScrollRocket', () => ({
  ScrollRocket: () => <div data-testid="scroll-rocket">Scroll Rocket</div>,
}))

vi.mock('@/components/features/home/ScrollSpeedIndicator', () => ({
  ScrollSpeedIndicator: () => <div data-testid="scroll-speed">Speed Indicator</div>,
}))

vi.mock('@/components/features/home/AnimatedSection', () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/features/home/LaunchButton', () => ({
  LaunchButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
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

  it('renders the space background', () => {
    render(<Home />)

    expect(screen.getByTestId('space-background')).toBeInTheDocument()
  })

  it('renders the hero content', () => {
    render(<Home />)

    expect(screen.getByTestId('hero-content')).toBeInTheDocument()
  })

  it('renders the features section', () => {
    render(<Home />)

    expect(screen.getByTestId('features-section')).toBeInTheDocument()
  })

  it('renders the scroll rocket indicator', () => {
    render(<Home />)

    expect(screen.getByTestId('scroll-rocket')).toBeInTheDocument()
  })

  it('renders CTA section with "Ready to launch?" heading', () => {
    render(<Home />)

    expect(screen.getByText('Ready to launch?')).toBeInTheDocument()
  })

  it('renders "Explore Modules" link', () => {
    render(<Home />)

    expect(screen.getByText(/Explore Modules/)).toBeInTheDocument()
  })

  it('renders footer with brand name', () => {
    render(<Home />)

    // Footer contains brand name
    const footerBrand = screen.getAllByText('Max Apogee')
    expect(footerBrand.length).toBeGreaterThanOrEqual(1)
  })

  it('renders About Us link in footer', () => {
    render(<Home />)

    expect(screen.getByText('About Us')).toBeInTheDocument()
  })

  it('renders non-profit tagline', () => {
    render(<Home />)

    expect(screen.getByText(/non-profit inspiring future rocket scientists/)).toBeInTheDocument()
  })
})
