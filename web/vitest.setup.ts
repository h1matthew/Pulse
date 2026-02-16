import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock localStorage for test environment (only in browser-like contexts)
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })
}

// Mock AccessibilityProvider for tests
vi.mock('@/components/providers/AccessibilityProvider', () => ({
  AccessibilityProvider: ({ children }: { children: React.ReactNode }) => children,
  useAccessibility: () => ({
    announce: vi.fn(),
    clearAnnouncements: vi.fn(),
  }),
}))
