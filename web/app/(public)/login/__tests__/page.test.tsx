/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React, { useState } from 'react'
import LoginPage from '../page'

// Mock next/navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
}))

// Mock Supabase client
const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockResetPasswordForEmail = vi.fn()
const mockGetUser = vi.fn()
const mockSetSession = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      setSession: mockSetSession,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  }),
}))

vi.mock('@/components/features/bot/BaanihaliPuzzleCaptcha', () => ({
  BaanihaliPuzzleCaptcha: ({ onVerify }: { onVerify: (token: string) => void }) => (
    <button type="button" onClick={() => onVerify('test-captcha-token')}>
      Complete CAPTCHA
    </button>
  ),
}))

// Mock Radix Tabs to work properly in jsdom
vi.mock('@/components/ui/tabs', () => {
  const TabsContext = React.createContext<{ value: string; onValueChange: (v: string) => void }>({
    value: '',
    onValueChange: () => {},
  })

  return {
    Tabs: ({ value, onValueChange, children, ...props }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode; className?: string }) => (
      <TabsContext.Provider value={{ value, onValueChange }}>
        <div data-testid="tabs" {...props}>{children}</div>
      </TabsContext.Provider>
    ),
    TabsList: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
      <div role="tablist" {...props}>{children}</div>
    ),
    TabsTrigger: ({ value, children, ...props }: { value: string; children: React.ReactNode; className?: string }) => {
      const ctx = React.useContext(TabsContext)
      return (
        <button
          role="tab"
          data-state={ctx.value === value ? 'active' : 'inactive'}
          onClick={() => ctx.onValueChange(value)}
          {...props}
        >
          {children}
        </button>
      )
    },
    TabsContent: ({ value, children, ...props }: { value: string; children: React.ReactNode; className?: string }) => {
      const ctx = React.useContext(TabsContext)
      if (ctx.value !== value) return null
      return <div role="tabpanel" data-state="active" {...props}>{children}</div>
    },
  }
})

// Login submits to /api/auth/login (server-side rate limited)
const mockFetch = vi.fn()

function mockLoginResponse(status: number, body: unknown) {
  mockFetch.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mockFetch)
    try { window.localStorage.clear() } catch { /* jsdom may not support localStorage.clear */ }
    mockGetUser.mockResolvedValue({ data: { user: null } })
  })

  it('renders loading state initially', () => {
    // Keep the promise pending
    mockGetUser.mockReturnValue(new Promise(() => {}))

    const { container } = render(<LoginPage />)

    // Should render an empty main element while checking auth
    expect(container.querySelector('main')).toBeInTheDocument()
  })

  it('renders login form after auth check', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })

    expect(screen.getByText('Log in')).toBeInTheDocument()
    expect(screen.getByText('Sign up')).toBeInTheDocument()
  })

  it('redirects to dashboard if already logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })

    render(<LoginPage />)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows email and password fields on login tab', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('shows full name field on signup tab', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })

    // Click on Sign up tab
    fireEvent.click(screen.getByRole('tab', { name: 'Sign up' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Full name')).toBeInTheDocument()
    })
  })

  it('handles login error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockLoginResponse(401, { error: 'Invalid credentials' })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })

    // Fill in form
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    })

    // Verify CAPTCHA via manual button, then sign in
    fireEvent.click(screen.getByRole('button', { name: 'Verify CAPTCHA' }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete CAPTCHA' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('calls setSession on successful login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockSetSession.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockLoginResponse(200, {
      user: { id: 'user-1' },
      session: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
    })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    })

    // Verify CAPTCHA via manual button, then sign in
    fireEvent.click(screen.getByRole('button', { name: 'Verify CAPTCHA' }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete CAPTCHA' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    // Verify the API was called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      })
    })

    // Verify setSession was called with the session tokens from the API
    await waitFor(() => {
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
      })
    })
  })

  it('requires captcha before submitting login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    })

    // Submitting without CAPTCHA shows error but does NOT auto-open modal
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      screen.getByText('Please complete CAPTCHA verification to continue.')
    ).toBeInTheDocument()
    expect(screen.queryByText('Security Check')).not.toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows a friendly message when login is rate limited', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockLoginResponse(429, {
      error: 'Too many login attempts. Please try again later.',
      retryAfter: 300,
    })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Verify CAPTCHA' }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete CAPTCHA' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(
        screen.getByText('Too many login attempts. Please try again in 5 minutes.')
      ).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('captcha verification persists across tab switches', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockLoginResponse(200, { user: { id: 'user-1' } })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })

    // Verify CAPTCHA on login tab
    fireEvent.click(screen.getByRole('button', { name: 'Verify CAPTCHA' }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete CAPTCHA' }))

    // Switch to signup and back
    fireEvent.click(screen.getByRole('tab', { name: 'Sign up' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Log in' }))

    // CAPTCHA should still be verified (button shows "CAPTCHA Verified")
    expect(screen.getByRole('button', { name: 'CAPTCHA Verified' })).toBeInTheDocument()

    // Fill in form and sign in — should work without re-verifying
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })
    })
  })

  it('shows success message on signup', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockSignUp.mockResolvedValue({ error: null })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('tab', { name: 'Sign up' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Full name')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Jane Doe' },
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'jane@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(screen.getByText(/Check your email/)).toBeInTheDocument()
    })
  })

  it('shows forgot password form when clicked', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Forgot password?'))

    await waitFor(() => {
      expect(screen.getByText('Reset Password')).toBeInTheDocument()
      expect(screen.getByText('Back to login')).toBeInTheDocument()
    })
  })

  it('sends password reset email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockResetPasswordForEmail.mockResolvedValue({ error: null })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Forgot password?'))

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    await waitFor(() => {
      expect(screen.getByText(/Check your email for a password reset link/)).toBeInTheDocument()
    })
  })

  it('renders business impact message', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })

    expect(
      screen.getByText(/Discover local businesses .* track your community impact/)
    ).toBeInTheDocument()
  })
})
