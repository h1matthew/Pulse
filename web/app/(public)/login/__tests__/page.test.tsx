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

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  }),
}))

// Mock SpaceBackground
vi.mock('@/components/features/home/SpaceBackground', () => ({
  SpaceBackground: () => <div data-testid="space-background" />,
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

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: null } })
  })

  it('renders loading state initially', () => {
    // Keep the promise pending
    mockGetUser.mockReturnValue(new Promise(() => {}))

    render(<LoginPage />)

    // Should render SpaceBackground while checking auth
    expect(screen.getByTestId('space-background')).toBeInTheDocument()
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
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid credentials' },
    })

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

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('redirects to dashboard on successful login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockSignInWithPassword.mockResolvedValue({ error: null })

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

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
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

  it('renders free lessons message', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })

    expect(screen.getByText(/All lessons are free/)).toBeInTheDocument()
  })
})
