import { useCallback, useRef, useEffect, useState } from 'react'

/**
 * Returns a debounced version of the callback that delays invoking
 * until after `delay` milliseconds have elapsed since the last call.
 *
 * Note: The returned function is fire-and-forget (returns void) even if
 * the original callback returns a value, since the actual execution
 * happens asynchronously after the delay.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic callback types require `any` for proper inference
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)

  // Update callback ref on change
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    (...args: Parameters<T>): void => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    },
    [delay]
  )
}

/**
 * Returns a debounced value that updates after `delay` milliseconds
 * of no changes to the input value.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
