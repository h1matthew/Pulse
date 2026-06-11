'use client'

import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { useState, type ReactNode } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

// 24-hour max cache age — after this, localStorage cache is discarded
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000

// With `storage: undefined` (during SSR) the persister is a built-in no-op,
// so the same provider tree renders on server and client — rendering
// different providers per side is itself a hydration hazard.
const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'pulse-query-cache',
})

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
