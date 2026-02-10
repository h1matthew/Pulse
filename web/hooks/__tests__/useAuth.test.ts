/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'

// Mock the AuthProvider's useAuth hook
const mockAuthValue = {
  isLoggedIn: false,
  isAdmin: false,
  loading: true,
  userId: null,
  user: null,
}

const AuthContext = React.createContext(mockAuthValue)

// Create a wrapper that provides the context
function createWrapper(value = mockAuthValue) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(AuthContext.Provider, { value }, children)
  }
}

// Mock the hooks module to use our context
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => React.useContext(AuthContext),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Import after mocking
import { useAuth } from '../useAuth'

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns loading state initially', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper({ ...mockAuthValue, loading: true }),
      })

      expect(result.current.loading).toBe(true)
      expect(result.current.isLoggedIn).toBe(false)
      expect(result.current.userId).toBeNull()
    })
  })

  describe('logged out state', () => {
    it('returns logged out state when no user', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper({
          isLoggedIn: false,
          isAdmin: false,
          loading: false,
          userId: null,
          user: null,
        }),
      })

      expect(result.current.isLoggedIn).toBe(false)
      expect(result.current.isAdmin).toBe(false)
      expect(result.current.userId).toBeNull()
      expect(result.current.user).toBeNull()
      expect(result.current.loading).toBe(false)
    })
  })

  describe('logged in state', () => {
    it('returns logged in state with user data', () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
      }

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper({
          isLoggedIn: true,
          isAdmin: false,
          loading: false,
          userId: 'test-user-id',
          user: mockUser,
        }),
      })

      expect(result.current.isLoggedIn).toBe(true)
      expect(result.current.userId).toBe('test-user-id')
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.loading).toBe(false)
    })
  })

  describe('admin state', () => {
    it('returns admin state when user is admin', () => {
      const mockUser = {
        id: 'admin-user-id',
        email: 'admin@example.com',
      }

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper({
          isLoggedIn: true,
          isAdmin: true,
          loading: false,
          userId: 'admin-user-id',
          user: mockUser,
        }),
      })

      expect(result.current.isLoggedIn).toBe(true)
      expect(result.current.isAdmin).toBe(true)
    })

    it('returns non-admin state for regular user', () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
      }

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper({
          isLoggedIn: true,
          isAdmin: false,
          loading: false,
          userId: 'user-id',
          user: mockUser,
        }),
      })

      expect(result.current.isLoggedIn).toBe(true)
      expect(result.current.isAdmin).toBe(false)
    })
  })
})
