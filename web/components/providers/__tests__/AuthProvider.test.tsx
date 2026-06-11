/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { AuthProvider, useAuth } from '../AuthProvider'

// Mock Supabase client
const mockGetUser = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockUnsubscribe = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockUpsert = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: mockFrom,
  })),
}))

// Controllable hydration state — true (regular client render) by default so
// the pre-existing tests behave as before.
const mockHydrated = vi.hoisted(() => ({ value: true }))
vi.mock('@/hooks/useHydrated', () => ({
  useHydrated: () => mockHydrated.value,
}))

// Test component to consume the auth context
function TestConsumer() {
  const { isLoggedIn, isAdmin, loading, userId, user } = useAuth()
  return (
    <div>
      <span data-testid="loading">{loading ? 'loading' : 'done'}</span>
      <span data-testid="isLoggedIn">{isLoggedIn ? 'yes' : 'no'}</span>
      <span data-testid="isAdmin">{isAdmin ? 'yes' : 'no'}</span>
      <span data-testid="userId">{userId || 'null'}</span>
      <span data-testid="userEmail">{user?.email || 'null'}</span>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHydrated.value = true

    // Default mock setup
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })

    // Default profile query mock
    mockFrom.mockReturnValue({ select: mockSelect, upsert: mockUpsert })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle })
    mockUpsert.mockResolvedValue({ data: null, error: null })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('provides loading state initially', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    // Initially loading
    expect(screen.getByTestId('loading').textContent).toBe('loading')

    // Wait for auth check
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('done')
    })
  })

  it('handles unauthenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('done')
    })

    expect(screen.getByTestId('isLoggedIn').textContent).toBe('no')
    expect(screen.getByTestId('isAdmin').textContent).toBe('no')
    expect(screen.getByTestId('userId').textContent).toBe('null')
  })

  it('handles authenticated user', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockSingle.mockResolvedValue({ data: { is_admin: false }, error: null })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('done')
    })

    expect(screen.getByTestId('isLoggedIn').textContent).toBe('yes')
    expect(screen.getByTestId('isAdmin').textContent).toBe('no')
    expect(screen.getByTestId('userId').textContent).toBe('user-123')
    expect(screen.getByTestId('userEmail').textContent).toBe('test@example.com')
  })

  it('handles admin user', async () => {
    const mockUser = { id: 'admin-123', email: 'admin@example.com' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockSingle.mockResolvedValue({ data: { is_admin: true }, error: null })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('done')
    })

    expect(screen.getByTestId('isLoggedIn').textContent).toBe('yes')
    expect(screen.getByTestId('isAdmin').textContent).toBe('yes')
  })

  it('handles profile fetch error gracefully', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockSingle.mockResolvedValue({ data: null, error: new Error('Profile not found') })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('done')
    })

    // Should still be logged in, just not admin
    expect(screen.getByTestId('isLoggedIn').textContent).toBe('yes')
    expect(screen.getByTestId('isAdmin').textContent).toBe('no')
  })

  it('subscribes to auth state changes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('done')
    })

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1)
  })

  it('unsubscribes from auth state changes on unmount', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('done')
    })

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })
})

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHydrated.value = true
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })
    mockFrom.mockReturnValue({ select: mockSelect, upsert: mockUpsert })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle })
    mockUpsert.mockResolvedValue({ data: null, error: null })
  })

  it('returns default context values when used outside AuthProvider', () => {
    // The AuthProvider uses a default context value, so it doesn't throw
    // Instead, it returns the default values
    render(<TestConsumer />)

    // Default context values
    expect(screen.getByTestId('isLoggedIn').textContent).toBe('no')
    expect(screen.getByTestId('isAdmin').textContent).toBe('no')
    expect(screen.getByTestId('loading').textContent).toBe('loading')
    expect(screen.getByTestId('userId').textContent).toBe('null')
  })

  it('masks resolved auth state during hydration renders', async () => {
    // Regression: Supabase resolves the session from storage in a
    // root-commit effect, which can land before a deferred Suspense boundary
    // hydrates. Consumers rendering during hydration must keep seeing the
    // signed-out/loading state the server HTML was rendered with.
    mockHydrated.value = false
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockSingle.mockResolvedValue({ data: { is_admin: true }, error: null })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    // Wait until the provider's internal state has definitely updated (the
    // profile fetch only happens after the user state lands)...
    await waitFor(() => {
      expect(mockSingle).toHaveBeenCalled()
    })

    // ...and the consumer still reports the server-render state.
    expect(screen.getByTestId('isLoggedIn').textContent).toBe('no')
    expect(screen.getByTestId('isAdmin').textContent).toBe('no')
    expect(screen.getByTestId('loading').textContent).toBe('loading')
    expect(screen.getByTestId('userId').textContent).toBe('null')
  })

  it('reports the real auth state once hydration completes', async () => {
    mockHydrated.value = false
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockSingle.mockResolvedValue({ data: { is_admin: true }, error: null })

    const { rerender } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockSingle).toHaveBeenCalled()
    })
    expect(screen.getByTestId('isLoggedIn').textContent).toBe('no')

    // Hydration finishes — the very next render unmasks the real state.
    mockHydrated.value = true
    rerender(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('isLoggedIn').textContent).toBe('yes')
    })
    expect(screen.getByTestId('isAdmin').textContent).toBe('yes')
    expect(screen.getByTestId('userId').textContent).toBe('user-123')
  })
})
