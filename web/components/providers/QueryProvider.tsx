'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { useState, type ReactNode } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

// 24-hour max cache age — after this, localStorage cache is discarded
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000

// Create a localStorage persister (safe to call at module level — guarded by typeof check)
const persister =
  typeof window !== 'undefined'
    ? createSyncStoragePersister({
        storage: window.localStorage,
        key: 'pulse-query-cache',
      })
    : undefined

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            // Keep cached data for 24 hours (matches localStorage TTL)
            gcTime: CACHE_MAX_AGE,
            retry: 2,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            placeholderData: (previousData: unknown) => previousData,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  )

  // Use persistent provider if localStorage is available, otherwise standard
  if (persister) {
    return (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: CACHE_MAX_AGE,
          // Only persist successful queries (not errors or loading states)
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => query.state.status === 'success',
          },
        }}
      >
        {children}
      </PersistQueryClientProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
