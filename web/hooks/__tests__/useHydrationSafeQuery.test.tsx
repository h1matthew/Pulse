/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { act, cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useHydrationSafeQuery } from '../useHydrationSafeQuery'

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  })
}

const PROBE_KEY = ['probe']

function Probe({ enabled = true }: { enabled?: boolean }) {
  const { data, isLoading, fetchStatus } = useHydrationSafeQuery({
    queryKey: PROBE_KEY,
    queryFn: async () => 'fresh-data',
    enabled,
  })
  return (
    <div>
      <span data-testid="data">{data ?? 'no-data'}</span>
      <span data-testid="isLoading">{String(isLoading)}</span>
      <span data-testid="fetchStatus">{fetchStatus}</span>
    </div>
  )
}

// Control component using plain useQuery, to prove the harness detects the
// mismatch the wrapper exists to prevent.
function UnsafeProbe() {
  const { data } = useQuery({
    queryKey: PROBE_KEY,
    queryFn: async () => 'fresh-data',
  })
  return <span>{data ?? 'no-data'}</span>
}

function withClient(client: QueryClient, ui: React.ReactElement) {
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('useHydrationSafeQuery', () => {
  it('masks cached data during server rendering', () => {
    const client = makeClient()
    client.setQueryData(PROBE_KEY, 'cached-data')

    const html = renderToString(withClient(client, <Probe />))

    expect(html).toContain('no-data')
    expect(html).not.toContain('cached-data')
  })

  it('reports the pending+fetching state of an enabled query during server rendering', () => {
    const client = makeClient()
    const html = renderToString(withClient(client, <Probe />))

    expect(html).toContain('no-data')
    // isLoading=true / fetchStatus=fetching — matching the optimistic
    // first-render state a fresh client produces for an enabled query.
    expect(html).toContain('true')
    expect(html).toContain('fetching')
  })

  it('reports the pending+idle state of a disabled query during server rendering, even with cached data', () => {
    const client = makeClient()
    client.setQueryData(PROBE_KEY, 'cached-data')

    const html = renderToString(withClient(client, <Probe enabled={false} />))

    expect(html).toContain('no-data')
    expect(html).toContain('false')
    expect(html).toContain('idle')
  })

  it('returns cached data immediately on regular client renders', () => {
    const client = makeClient()
    client.setQueryData(PROBE_KEY, 'cached-data')

    render(withClient(client, <Probe />))

    expect(screen.getByTestId('data').textContent).toBe('cached-data')
  })

  it('hydrates server HTML from an empty cache without mismatch, even when the client cache was restored with data', async () => {
    // Regression test for the production bug: the server rendered a loading
    // skeleton (empty cache), then the client restored a persisted cache
    // before the page hydrated — plain useQuery rendered the data on its
    // first hydration pass and React flagged a hydration mismatch.
    const serverHtml = renderToString(withClient(makeClient(), <Probe />))

    const clientCache = makeClient()
    clientCache.setQueryData(PROBE_KEY, 'cached-data')

    const container = document.createElement('div')
    document.body.appendChild(container)
    container.innerHTML = serverHtml

    const onRecoverableError = vi.fn()
    let root!: ReturnType<typeof hydrateRoot>
    await act(async () => {
      root = hydrateRoot(container, withClient(clientCache, <Probe />), {
        onRecoverableError,
      })
    })

    expect(onRecoverableError).not.toHaveBeenCalled()
    // The restored data appears right after hydration completes.
    expect(container.textContent).toContain('cached-data')

    await act(async () => root.unmount())
  })

  it('control: plain useQuery does produce the hydration mismatch this wrapper prevents', async () => {
    const serverHtml = renderToString(withClient(makeClient(), <UnsafeProbe />))

    const clientCache = makeClient()
    clientCache.setQueryData(PROBE_KEY, 'cached-data')

    const container = document.createElement('div')
    document.body.appendChild(container)
    container.innerHTML = serverHtml

    const onRecoverableError = vi.fn()
    // React also logs the mismatch via console.error — silence it for a
    // clean test run.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    let root!: ReturnType<typeof hydrateRoot>
    await act(async () => {
      root = hydrateRoot(container, withClient(clientCache, <UnsafeProbe />), {
        onRecoverableError,
      })
    })

    expect(onRecoverableError).toHaveBeenCalled()

    consoleError.mockRestore()
    await act(async () => root.unmount())
  })
})
