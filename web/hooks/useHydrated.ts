'use client'

import { useSyncExternalStore } from 'react'

// The value never changes after hydration, so there is nothing to subscribe to.
const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

/**
 * Returns false during SSR and during the initial hydration render,
 * true for every render after that (and immediately on client-side
 * navigations, which mount fresh without hydrating server HTML).
 *
 * Why this exists: the React Query cache is restored from localStorage in a
 * provider effect that runs before deferred Suspense boundaries (e.g. dynamic
 * route pages suspended on their params promise) hydrate. Without a gate, a
 * page's first hydration render can see cached data the server never had,
 * and React reports a hydration mismatch and regenerates the whole tree.
 * Branching on this hook keeps the hydration render identical to the server
 * HTML; the real data appears one commit later.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot)
}
