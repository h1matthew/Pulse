/**
 * useFocusTrap Hook
 *
 * Traps focus within a container element for accessibility in modals/dialogs.
 * Implements the WAI-ARIA focus trap pattern for keyboard navigation.
 *
 * Features:
 * - Traps Tab/Shift+Tab navigation within the container
 * - Auto-focuses first focusable element on activation
 * - Restores focus to trigger element on deactivation
 * - Handles dynamic content changes
 *
 * @example
 * ```tsx
 * const modalRef = useRef<HTMLDivElement>(null)
 * const { isActive, activate, deactivate } = useFocusTrap(modalRef, isOpen)
 *
 * return (
 *   <div ref={modalRef}>
 *     <button>Focusable 1</button>
 *     <button>Focusable 2</button>
 *   </div>
 * )
 * ```
 */
import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface UseFocusTrapReturn {
  /** Whether the focus trap is currently active */
  isActive: boolean
  /** Manually activate the focus trap */
  activate: () => void
  /** Manually deactivate the focus trap and restore previous focus */
  deactivate: () => void
}

/**
 * Selector for focusable elements within a container
 * Includes: buttons, links, inputs, textareas, selects, and elements with tabindex
 */
const FOCUSABLE_SELECTOR = [
  'button:not([disabled]):not([tabindex="-1"])',
  'a[href]:not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(', ')

/**
 * Hook to trap focus within a container element
 * @param containerRef - Ref to the container element
 * @param isOpen - Whether the container is currently open/active
 * @param options - Optional configuration
 * @returns Focus trap control functions
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  options: {
    /** Whether to return focus to the trigger element on close */
    returnFocus?: boolean
    /** Delay (ms) before auto-focusing first element */
    focusDelay?: number
  } = {}
): UseFocusTrapReturn {
  const { returnFocus = true, focusDelay = 0 } = options
  const previousFocusRef = useRef<Element | null>(null)
  const isActiveRef = useRef(false)

  /**
   * Get all focusable elements within the container
   */
  const getFocusableElements = useCallback((): HTMLElement[] => {
    const container = containerRef.current
    if (!container) return []
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
  }, [containerRef])

  /**
   * Focus the first focusable element in the container
   */
  const focusFirstElement = useCallback(() => {
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      // Focus the first element, or the element with data-autofocus attribute
      const autoFocusElement = containerRef.current?.querySelector('[data-autofocus]') as HTMLElement
      if (autoFocusElement) {
        autoFocusElement.focus()
      } else {
        focusableElements[0].focus()
      }
    }
  }, [getFocusableElements, containerRef])

  /**
   * Handle Tab key navigation to trap focus
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !isActiveRef.current) return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      // Shift+Tab on first element = wrap to last
      if (event.shiftKey) {
        if (activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab on last element = wrap to first
        if (activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    },
    [getFocusableElements]
  )

  /**
   * Activate the focus trap
   */
  const activate = useCallback(() => {
    if (isActiveRef.current) return

    // Store current focus before trapping
    previousFocusRef.current = document.activeElement
    isActiveRef.current = true

    // Focus first element after optional delay
    if (focusDelay > 0) {
      setTimeout(focusFirstElement, focusDelay)
    } else {
      focusFirstElement()
    }

    // Add keydown listener
    document.addEventListener('keydown', handleKeyDown)
  }, [focusFirstElement, handleKeyDown, focusDelay])

  /**
   * Deactivate the focus trap and restore previous focus
   */
  const deactivate = useCallback(() => {
    if (!isActiveRef.current) return

    isActiveRef.current = false
    document.removeEventListener('keydown', handleKeyDown)

    // Restore focus to the trigger element
    if (returnFocus && previousFocusRef.current instanceof HTMLElement) {
      previousFocusRef.current.focus()
    }
  }, [handleKeyDown, returnFocus])

  // Auto-activate/deactivate based on isOpen prop
  useEffect(() => {
    if (isOpen) {
      activate()
    } else {
      deactivate()
    }

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, activate, deactivate, handleKeyDown])

  return {
    isActive: isActiveRef.current,
    activate,
    deactivate,
  }
}
