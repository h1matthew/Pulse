import { useCallback, useRef } from 'react'

/**
 * Wraps an async function to prevent concurrent executions.
 * If the action is already in progress when called again, the subsequent call is ignored.
 * Returns `[guardedAction, isRunning]` — isRunning is a ref (not state) to avoid re-renders.
 * Use the optional `onBusyChange` callback if you need to drive UI state.
 */
export function useActionGuard<Args extends unknown[], R>(
  action: (...args: Args) => Promise<R>,
): (...args: Args) => Promise<R | undefined> {
  const runningRef = useRef(false)

  return useCallback(
    async (...args: Args): Promise<R | undefined> => {
      if (runningRef.current) return undefined
      runningRef.current = true
      try {
        return await action(...args)
      } finally {
        runningRef.current = false
      }
    },
    [action],
  )
}
