/**
 * useAnnouncer Hook
 *
 * Convenience hook for announcing loading states, success messages, and errors
 * to screen readers. Wraps useAccessibility with common announcement patterns.
 *
 * @example
 * ```tsx
 * const { announceLoading, announceSuccess, announceError } = useAnnouncer()
 *
 * const handleSubmit = async () => {
 *   announceLoading('Saving your review...')
 *   try {
 *     await saveReview()
 *     announceSuccess('Review saved successfully')
 *   } catch (error) {
 *     announceError('Failed to save review')
 *   }
 * }
 * ```
 */
import { useCallback } from 'react'
import { useAccessibility } from '@/components/providers/AccessibilityProvider'

interface UseAnnouncerReturn {
  /** Announce a generic message (polite priority) */
  announce: (message: string) => void
  /** Announce a loading state */
  announceLoading: (message: string) => void
  /** Announce a success message */
  announceSuccess: (message: string) => void
  /** Announce an error message (assertive priority) */
  announceError: (message: string) => void
  /** Clear all announcements */
  clear: () => void
}

export function useAnnouncer(): UseAnnouncerReturn {
  const { announce, clearAnnouncements } = useAccessibility()

  const announceLoading = useCallback(
    (message: string) => {
      announce(message, 'polite')
    },
    [announce]
  )

  const announceSuccess = useCallback(
    (message: string) => {
      announce(message, 'polite')
    },
    [announce]
  )

  const announceError = useCallback(
    (message: string) => {
      // Use assertive for errors so users are notified immediately
      announce(message, 'assertive')
    },
    [announce]
  )

  return {
    announce: (message: string) => announce(message, 'polite'),
    announceLoading,
    announceSuccess,
    announceError,
    clear: clearAnnouncements,
  }
}
