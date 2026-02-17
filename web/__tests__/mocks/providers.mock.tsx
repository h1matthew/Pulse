/**
 * Test provider wrapper components.
 * Wraps components with all necessary providers for testing.
 */
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

// Mock accessibility context
interface MockAccessibilityContextValue {
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  clearAnnouncements: () => void
}

const defaultMockAccessibility: MockAccessibilityContextValue = {
  announce: vi.fn(),
  clearAnnouncements: vi.fn(),
}

export function createMockAccessibilityProvider() {
  const AccessibilityContext = React.createContext<MockAccessibilityContextValue>(defaultMockAccessibility)

  const MockAccessibilityProvider = ({ children }: { children: React.ReactNode }) => (
    <AccessibilityContext.Provider value={defaultMockAccessibility}>{children}</AccessibilityContext.Provider>
  )

  const useAccessibility = () => React.useContext(AccessibilityContext)

  return { MockAccessibilityProvider, useAccessibility, AccessibilityContext }
}

// Create a fresh QueryClient for each test
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// Mock auth context value type
interface MockAuthContextValue {
  isLoggedIn: boolean
  isAdmin: boolean
  loading: boolean
  userId: string | null
  user: { id: string; email: string } | null
}

// Default mock auth values
export const defaultMockAuth: MockAuthContextValue = {
  isLoggedIn: false,
  isAdmin: false,
  loading: false,
  userId: null,
  user: null,
}

export const loggedInMockAuth: MockAuthContextValue = {
  isLoggedIn: true,
  isAdmin: false,
  loading: false,
  userId: 'test-user-id-123',
  user: { id: 'test-user-id-123', email: 'test@example.com' },
}

export const adminMockAuth: MockAuthContextValue = {
  isLoggedIn: true,
  isAdmin: true,
  loading: false,
  userId: 'admin-user-id-456',
  user: { id: 'admin-user-id-456', email: 'admin@example.com' },
}

// Create a mock AuthProvider for testing
export function createMockAuthProvider(authValue: MockAuthContextValue = defaultMockAuth) {
  const AuthContext = React.createContext<MockAuthContextValue>(authValue)

  const MockAuthProvider = ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
  )

  const useAuth = () => React.useContext(AuthContext)

  return { MockAuthProvider, useAuth, AuthContext }
}

// Mock achievement context value type
interface MockAchievementContextValue {
  checkAchievements: () => Promise<void>
  showAchievementToast: (achievementId: string) => void
}

// Create mock achievement provider
export function createMockAchievementProvider() {
  const mockContext: MockAchievementContextValue = {
    checkAchievements: vi.fn(() => Promise.resolve()),
    showAchievementToast: vi.fn(),
  }

  const AchievementContext = React.createContext<MockAchievementContextValue>(mockContext)

  const MockAchievementProvider = ({ children }: { children: React.ReactNode }) => (
    <AchievementContext.Provider value={mockContext}>{children}</AchievementContext.Provider>
  )

  const useAchievements = () => React.useContext(AchievementContext)

  return { MockAchievementProvider, useAchievements, AchievementContext, mockContext }
}

// Combined test wrapper with all providers
interface TestWrapperProps {
  children: React.ReactNode
  authValue?: MockAuthContextValue
  queryClient?: QueryClient
}

export function createTestWrapper(options: {
  authValue?: MockAuthContextValue
  queryClient?: QueryClient
} = {}) {
  const { authValue = defaultMockAuth, queryClient = createTestQueryClient() } = options
  const { MockAuthProvider } = createMockAuthProvider(authValue)
  const { MockAchievementProvider } = createMockAchievementProvider()
  const { MockAccessibilityProvider } = createMockAccessibilityProvider()

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MockAuthProvider>
          <MockAchievementProvider>
            <MockAccessibilityProvider>
              {children}
            </MockAccessibilityProvider>
          </MockAchievementProvider>
        </MockAuthProvider>
      </QueryClientProvider>
    )
  }
}

// Render with providers helper
export function renderWithProviders(
  ui: React.ReactElement,
  options: {
    authValue?: MockAuthContextValue
    queryClient?: QueryClient
  } = {}
) {
  const Wrapper = createTestWrapper(options)
  // Note: Import render from @testing-library/react in your test file
  // and call render(ui, { wrapper: Wrapper })
  return { Wrapper }
}

// Setup mock for useAuth hook
export function setupAuthMock(authValue: MockAuthContextValue = defaultMockAuth) {
  vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => authValue,
  }))
}

// Setup mock for React Query hooks
export function setupQueryMock() {
  const queryClient = createTestQueryClient()

  vi.mock('@tanstack/react-query', async () => {
    const actual = await vi.importActual('@tanstack/react-query')
    return {
      ...actual,
      useQueryClient: () => queryClient,
    }
  })

  return queryClient
}
