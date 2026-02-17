/**
 * AccessibilityProvider
 *
 * Provides screen reader announcements and accessibility context for the app.
 * Uses ARIA live regions to announce page changes, loading states, and errors
 * to users using assistive technologies.
 *
 * Features:
 * - polite announcements (non-urgent updates)
 * - assertive announcements (urgent alerts)
 * - Clear announcements programmatically
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <AccessibilityProvider>
 *   {children}
 * </AccessibilityProvider>
 *
 * // In a component
 * const { announce } = useAccessibility()
 * announce('Loading businesses...', 'polite')
 * ```
 */
'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'

type AnnouncementPriority = 'polite' | 'assertive'

interface AccessibilityContextType {
  /** Announce a message to screen readers */
  announce: (message: string, priority?: AnnouncementPriority) => void
  /** Clear all announcements */
  clearAnnouncements: () => void
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(
  undefined
)

interface AccessibilityProviderProps {
  children: ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')
  const politeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const assertiveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Announce a message to screen readers via ARIA live regions
   * @param message - The message to announce
   * @param priority - 'polite' (waits for user idle) or 'assertive' (interrupts)
   */
  const announce = useCallback(
    (message: string, priority: AnnouncementPriority = 'polite') => {
      // Clear existing timeout to prevent message clearing too soon
      if (priority === 'polite' && politeTimeoutRef.current) {
        clearTimeout(politeTimeoutRef.current)
      } else if (priority === 'assertive' && assertiveTimeoutRef.current) {
        clearTimeout(assertiveTimeoutRef.current)
      }

      // Set the message
      if (priority === 'polite') {
        setPoliteMessage(message)
        // Clear after 10 seconds to prevent stale announcements
        politeTimeoutRef.current = setTimeout(() => {
          setPoliteMessage('')
        }, 10000)
      } else {
        setAssertiveMessage(message)
        // Clear after 10 seconds
        assertiveTimeoutRef.current = setTimeout(() => {
          setAssertiveMessage('')
        }, 10000)
      }
    },
    []
  )

  /** Clear all active announcements */
  const clearAnnouncements = useCallback(() => {
    setPoliteMessage('')
    setAssertiveMessage('')
    if (politeTimeoutRef.current) clearTimeout(politeTimeoutRef.current)
    if (assertiveTimeoutRef.current) clearTimeout(assertiveTimeoutRef.current)
  }, [])

  return (
    <AccessibilityContext.Provider value={{ announce, clearAnnouncements }}>
      {children}
      {/* ARIA live regions for screen reader announcements */}
      {/* polite: announces when user is idle */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      {/* assertive: interrupts user immediately */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AccessibilityContext.Provider>
  )
}

/**
 * Hook to access accessibility announcement functions
 * Must be used within an AccessibilityProvider
 */
export function useAccessibility(): AccessibilityContextType {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error(
      'useAccessibility must be used within an AccessibilityProvider'
    )
  }
  return context
}
