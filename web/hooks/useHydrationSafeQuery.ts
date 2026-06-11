'use client'

import {
  useQuery,
  type DefaultError,
  type QueryClient,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query'
import { useHydrated } from './useHydrated'

/**
 * Drop-in replacement for `useQuery` that is safe to render into SSR'd HTML
 * while the query cache is persisted to localStorage.
 *
 * The persisted cache is restored in a provider effect that can run before a
 * deferred Suspense boundary (e.g. a dynamic-route page suspended on its
 * params promise) hydrates. A plain `useQuery` in that boundary would then
 * see restored data on its very first hydration render, while the server
 * HTML was rendered from an empty cache — React flags the mismatch and
 * regenerates the tree. Until hydration finishes, this wrapper reports the
 * exact result shape the server rendered with (pending, no data), so the
 * hydration render always matches the server HTML. Cached data appears one
 * commit later, and client-side navigations are unaffected.
 */
export function useHydrationSafeQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  queryClient?: QueryClient
): UseQueryResult<TData, TError> {
  const hydrated = useHydrated()
  const result = useQuery(options, queryClient)

  if (hydrated) {
    return result
  }

  // Mirror the optimistic first-render state the server produced: an enabled
  // query renders as pending+fetching, a disabled one as pending+idle.
  // (`enabled` as a callback can't be resolved here; treated as enabled.)
  const enabled = options.enabled !== false
  // The overrides collapse the discriminated union, hence the cast.
  return {
    ...result,
    data: undefined,
    error: null,
    status: 'pending',
    fetchStatus: enabled ? 'fetching' : 'idle',
    isPending: true,
    isLoading: enabled,
    isInitialLoading: enabled,
    isFetching: enabled,
    isRefetching: false,
    isError: false,
    isSuccess: false,
    isLoadingError: false,
    isRefetchError: false,
    isPlaceholderData: false,
    isFetched: false,
    isFetchedAfterMount: false,
    isStale: true,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
  } as UseQueryResult<TData, TError>
}
