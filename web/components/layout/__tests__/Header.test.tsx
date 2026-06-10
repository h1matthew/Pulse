/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { Header } from '../Header'

// Mock next/navigation with useRouter
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}))

// Mock AuthProvider
const mockIsLoggedIn = vi.fn(() => false)
const mockIsAdmin = vi.fn(() => false)

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    isLoggedIn: mockIsLoggedIn(),
    isAdmin: mockIsAdmin(),
    loading: false,
    userId: null,
    user: null,
  }),
}))

// Mock MobileMenu
vi.mock('../MobileMenu', () => ({
  MobileMenu: () => <div data-testid="mobile-menu">Mobile Menu</div>,
}))

// Mock HelpMenu
vi.mock('@/components/features/help/HelpMenu', () => ({
  HelpMenu: ({ compact }: { compact?: boolean }) => <div data-testid="help-menu">Help</div>,
}))

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLoggedIn.mockReturnValue(false)
    mockIsAdmin.mockReturnValue(false)
  })

  it('renders logo', () => {
    const { container } = render(<Header />)

    // PulseLogo renders the logo image with aria-hidden="true"
    const logo = container.querySelector('img[src*="pulse-logo"]')
    expect(logo).toBeInTheDocument()
  })

  it('renders brand name', () => {
    render(<Header />)

    expect(screen.getByText('Pulse')).toBeInTheDocument()
  })

  it('shows public nav items when logged out', () => {
    mockIsLoggedIn.mockReturnValue(false)
    render(<Header />)

    expect(screen.getByText('Discover')).toBeInTheDocument()
    expect(screen.getByText('Categories')).toBeInTheDocument()
    expect(screen.getByText('Deals')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
  })

  it('shows Dashboard nav item when logged in', () => {
    mockIsLoggedIn.mockReturnValue(true)
    render(<Header />)

    expect(screen.getByText('Discover')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Deals')).toBeInTheDocument()
  })

  it('shows Sign in button when logged out', () => {
    mockIsLoggedIn.mockReturnValue(false)
    render(<Header />)

    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('shows Sign out button when logged in', () => {
    mockIsLoggedIn.mockReturnValue(true)
    render(<Header />)

    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('shows Admin link when user is admin', () => {
    mockIsLoggedIn.mockReturnValue(true)
    mockIsAdmin.mockReturnValue(true)
    render(<Header />)

    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('does not show Admin link when user is not admin', () => {
    mockIsLoggedIn.mockReturnValue(true)
    mockIsAdmin.mockReturnValue(false)
    render(<Header />)

    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('renders MobileMenu component', () => {
    render(<Header />)

    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
  })

  it('renders navigation items as valid links without nested buttons', () => {
    const { container } = render(<Header />)

    const aboutLink = screen.getByText('About').closest('a')
    expect(aboutLink).toHaveAttribute('href', '/about')
    expect(container.querySelector('a button')).toBeNull()
  })

  it('renders a solid, de-frosted nav surface (no glass)', () => {
    render(<Header />)

    const nav = screen.getByRole('navigation')
    // Refined header: solid background + hairline border, no frosted glass.
    expect(nav).toHaveClass('bg-background')
    expect(nav).toHaveClass('border-border')
    expect(nav).not.toHaveClass('backdrop-blur-xl')
  })

  it('slides the pill over from the previous page position after navigation', async () => {
    const { usePathname } = await import('next/navigation')
    const { waitFor } = await import('@testing-library/react')

    // Deterministic geometry: nav items get distinct rects, keyed off their
    // parent link's aria-label; everything else (incl. the nav container)
    // sits at the origin so pill coords equal the item coords.
    const ITEM_RECTS: Record<string, { left: number; width: number }> = {
      Discover: { left: 40, width: 80 },
      Categories: { left: 140, width: 90 },
    }
    const mkRect = (left: number, width: number) =>
      ({ left, width, top: 0, bottom: 0, right: left + width, height: 32, x: left, y: 0, toJSON: () => ({}) }) as DOMRect
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const label = this.closest('a')?.getAttribute('aria-label') ?? ''
        if (this.tagName === 'SPAN' && ITEM_RECTS[label]) {
          return mkRect(ITEM_RECTS[label].left, ITEM_RECTS[label].width)
        }
        return mkRect(0, 600)
      })

    try {
      // Page 1: /discover — pill lands on Discover and the position is remembered.
      vi.mocked(usePathname).mockReturnValue('/discover')
      const first = render(<Header />)
      const pillOf = (root: HTMLElement) =>
        root.querySelector('nav .relative > div.pointer-events-none') as HTMLElement
      await waitFor(() => expect(pillOf(first.container).style.left).toBe('40px'))
      first.unmount()

      // Page 2: /categories — the remounted header must START at Discover's
      // position, glide through intermediate positions, and settle on
      // Categories (the animator eases per frame; no CSS position transition).
      vi.mocked(usePathname).mockReturnValue('/categories')
      const second = render(<Header />)
      const pill = pillOf(second.container)
      // Restored at (within a first-frame hair of) the previous position
      expect(parseFloat(pill.style.left)).toBeGreaterThanOrEqual(40)
      expect(parseFloat(pill.style.left)).toBeLessThan(45)
      expect(pill.className).not.toContain('transition-all')

      // Catch the pill mid-flight: strictly between the two items = sliding.
      const mid = await waitFor(() => {
        const v = parseFloat(pill.style.left)
        if (!(v > 41)) throw new Error('pill has not started moving yet')
        return v
      }, { timeout: 2000 })
      expect(mid).toBeLessThan(139)

      await waitFor(() => expect(pill.style.left).toBe('140px'), { timeout: 2000 })
      second.unmount()
    } finally {
      rectSpy.mockRestore()
    }
  })
})
