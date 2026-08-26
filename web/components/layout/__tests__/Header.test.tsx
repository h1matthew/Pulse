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

    // PulseLogo renders the diamond SVG with aria-hidden="true"
    const logo = container.querySelector('svg[aria-hidden="true"]')
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

  it('shows Missions nav item when logged in', () => {
    mockIsLoggedIn.mockReturnValue(true)
    render(<Header />)

    const missionsLink = screen.getByText('Missions').closest('a')
    expect(missionsLink).toHaveAttribute('href', '/missions')
  })

  it('does not show Missions nav item when logged out', () => {
    mockIsLoggedIn.mockReturnValue(false)
    render(<Header />)

    expect(screen.queryByText('Missions')).not.toBeInTheDocument()
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

  it('places the help button directly beside the sign out button', () => {
    mockIsLoggedIn.mockReturnValue(true)
    mockIsAdmin.mockReturnValue(true)
    render(<Header />)

    const help = screen.getByTestId('help-menu')
    const admin = screen.getByText('Admin')
    const signOut = screen.getByText('Sign out')

    // Order in the actions cluster: Admin ... Help ... Sign out
    expect(
      admin.compareDocumentPosition(help) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      help.compareDocumentPosition(signOut) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
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

  it('marks the active nav item with a plain active style', async () => {
    const { usePathname } = await import('next/navigation')
    vi.mocked(usePathname).mockReturnValue('/discover')

    render(<Header />)

    const active = screen.getByLabelText('Discover')
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active.querySelector('span')?.className).toContain('bg-background')
  })
})
