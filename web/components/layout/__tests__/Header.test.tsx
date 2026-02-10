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

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLoggedIn.mockReturnValue(false)
    mockIsAdmin.mockReturnValue(false)
  })

  it('renders logo', () => {
    render(<Header />)

    const logo = screen.getByAltText('Max Apogee')
    expect(logo).toBeInTheDocument()
  })

  it('renders brand name', () => {
    render(<Header />)

    expect(screen.getByText('Max Apogee')).toBeInTheDocument()
  })

  it('shows public nav items when logged out', () => {
    mockIsLoggedIn.mockReturnValue(false)
    render(<Header />)

    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('Our Mission')).toBeInTheDocument()
    expect(screen.getByText('Get Involved')).toBeInTheDocument()
  })

  it('shows Dashboard nav item when logged in', () => {
    mockIsLoggedIn.mockReturnValue(true)
    render(<Header />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
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

  it('renders navigation links as buttons', () => {
    render(<Header />)

    const aboutButton = screen.getByText('About')
    expect(aboutButton.tagName).toBe('SPAN')
    expect(aboutButton.closest('button')).toBeInTheDocument()
  })

  it('applies backdrop blur by default', () => {
    render(<Header />)

    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('backdrop-blur-xl')
  })
})
