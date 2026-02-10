'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: 5 minutes - course content is mostly static
            // This significantly reduces unnecessary API calls
            staleTime: 5 * 60 * 1000,
            // Cache time: 10 minutes - data kept in memory for this duration
            gcTime: 10 * 60 * 1000,
            // Retry failed requests twice
            retry: 2,
            // PERFORMANCE FIX: Disable refetch on window focus
            // Course content doesn't change frequently, so refetching every time
            // the user switches tabs wastes bandwidth and slows down the app
            refetchOnWindowFocus: false,
            // Don't refetch on reconnect - stale data is fine for educational content
            refetchOnReconnect: false,
            // FIX: Prevent duplicate requests during React Strict Mode double-mounting
            // Keep previous data during query key transitions to avoid flicker
            placeholderData: (previousData: unknown) => previousData,
          },
          mutations: {
            // Retry mutations once
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
