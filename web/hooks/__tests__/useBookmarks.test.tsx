/**
 * @vitest-environment jsdom
 *
 * Auth-aware bookmark hooks:
 *   - Guests (signed out / auth loading) read+write localStorage — never the API
 *   - Signed-in users read+write /api/bookmarks
 *   - useToggleBookmark resolves { bookmarked, local } per the guest contract
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useBookmarkedIds,
  useIsBookmarked,
  useToggleBookmark,
} from '../useBookmarks'
import { LOCAL_BOOKMARKS_STORAGE_KEY } from '@/lib/bookmarks/local'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  auth: {
    isLoggedIn: false,
    isAdmin: false,
    loading: false,
    userId: null as string | null,
    user: null as { id: string; email: string } | null,
  },
}))

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => mocks.auth,
}))

function setGuest() {
  mocks.auth.isLoggedIn = false
  mocks.auth.loading = false
  mocks.auth.userId = null
  mocks.auth.user = null
}

function setSignedIn() {
  mocks.auth.isLoggedIn = true
  mocks.auth.loading = false
  mocks.auth.userId = 'user-123'
  mocks.auth.user = { id: 'user-123', email: 'test@example.com' }
}

function createWrapper(queryClient?: QueryClient) {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }

  return { Wrapper, client }
}

function mockBookmarksApiResponse(businessIds: string[]) {
  return new Response(
    JSON.stringify({
      bookmarks: businessIds.map((id) => ({ id: `bm-${id}`, business_id: id })),
      total: businessIds.length,
      hasMore: false,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBookmarks (auth-aware)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setGuest()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  describe('guest scope (signed out)', () => {
    it('useBookmarkedIds returns local ids without fetching', async () => {
      window.localStorage.setItem(
        LOCAL_BOOKMARKS_STORAGE_KEY,
        JSON.stringify(['biz-1', 'biz-2'])
      )

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useBookmarkedIds(), { wrapper: Wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(['biz-1', 'biz-2'])
      expect(fetch).not.toHaveBeenCalled()
    })

    it('treats auth-loading as guest (no API calls while auth resolves)', async () => {
      mocks.auth.loading = true
      window.localStorage.setItem(LOCAL_BOOKMARKS_STORAGE_KEY, JSON.stringify(['biz-9']))

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useBookmarkedIds(), { wrapper: Wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(['biz-9'])
      expect(fetch).not.toHaveBeenCalled()
    })

    it('toggle stores to localStorage and resolves { local: true } with no network calls', async () => {
      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useToggleBookmark(), { wrapper: Wrapper })

      let outcome: { bookmarked: boolean; local: boolean } | undefined
      await act(async () => {
        outcome = await result.current.mutateAsync({
          businessId: 'biz-7',
          isBookmarked: false,
        })
      })

      expect(outcome).toEqual({ bookmarked: true, local: true })
      expect(
        JSON.parse(window.localStorage.getItem(LOCAL_BOOKMARKS_STORAGE_KEY) as string)
      ).toEqual(['biz-7'])
      expect(fetch).not.toHaveBeenCalled()

      // Toggle off round-trips through the same store
      await act(async () => {
        outcome = await result.current.mutateAsync({
          businessId: 'biz-7',
          isBookmarked: true,
        })
      })
      expect(outcome).toEqual({ bookmarked: false, local: true })
      expect(
        JSON.parse(window.localStorage.getItem(LOCAL_BOOKMARKS_STORAGE_KEY) as string)
      ).toEqual([])
      expect(fetch).not.toHaveBeenCalled()
    })

    it('optimistically flips the scoped ids cache on guest toggle', async () => {
      const { Wrapper, client } = createWrapper()
      const guestIdsKey = ['bookmarks', 'ids', 'local']
      client.setQueryData(guestIdsKey, ['existing-biz'])

      const { result } = renderHook(
        () => ({ ids: useBookmarkedIds(), toggle: useToggleBookmark() }),
        { wrapper: Wrapper }
      )

      await waitFor(() => expect(result.current.ids.isSuccess).toBe(true))

      act(() => {
        result.current.toggle.mutate({ businessId: 'biz-new', isBookmarked: false })
      })

      // onMutate writes the optimistic flip into the SCOPED ids key
      await waitFor(() =>
        expect(client.getQueryData<string[]>(guestIdsKey)).toContain('biz-new')
      )

      // After settle + invalidation the hook re-reads localStorage and agrees
      await waitFor(() =>
        expect(result.current.ids.data).toContain('biz-new')
      )
      expect(fetch).not.toHaveBeenCalled()
    })

    it('useIsBookmarked reflects local bookmarks for guests', async () => {
      window.localStorage.setItem(LOCAL_BOOKMARKS_STORAGE_KEY, JSON.stringify(['biz-1']))

      const { Wrapper } = createWrapper()
      const { result } = renderHook(
        () => ({
          saved: useIsBookmarked('biz-1'),
          notSaved: useIsBookmarked('biz-2'),
        }),
        { wrapper: Wrapper }
      )

      await waitFor(() => expect(result.current.saved.data).toBe(true))
      expect(result.current.notSaved.data).toBe(false)
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('server scope (signed in)', () => {
    beforeEach(() => {
      setSignedIn()
    })

    it('useBookmarkedIds fetches ids from /api/bookmarks', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockBookmarksApiResponse(['srv-1', 'srv-2']))

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useBookmarkedIds(), { wrapper: Wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(fetch).toHaveBeenCalledWith('/api/bookmarks')
      expect(result.current.data).toEqual(['srv-1', 'srv-2'])
    })

    it('toggle (bookmark) POSTs to the API and resolves { local: false }', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ id: 'bm-1', business_id: 'srv-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useToggleBookmark(), { wrapper: Wrapper })

      let outcome: { bookmarked: boolean; local: boolean } | undefined
      await act(async () => {
        outcome = await result.current.mutateAsync({
          businessId: 'srv-1',
          isBookmarked: false,
        })
      })

      expect(outcome).toEqual({ bookmarked: true, local: false })
      expect(fetch).toHaveBeenCalledWith(
        '/api/bookmarks',
        expect.objectContaining({ method: 'POST' })
      )
      // Server toggles never write to the local store
      expect(window.localStorage.getItem(LOCAL_BOOKMARKS_STORAGE_KEY)).toBeNull()
    })

    it('toggle (un-bookmark) DELETEs via the API and resolves { local: false }', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }))

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useToggleBookmark(), { wrapper: Wrapper })

      let outcome: { bookmarked: boolean; local: boolean } | undefined
      await act(async () => {
        outcome = await result.current.mutateAsync({
          businessId: 'srv-2',
          isBookmarked: true,
        })
      })

      expect(outcome).toEqual({ bookmarked: false, local: false })
      expect(fetch).toHaveBeenCalledWith(
        '/api/bookmarks/srv-2',
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('rolls back the scoped ids cache when the server toggle fails', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }))

      // gcTime: Infinity so the seeded (observer-less) ids query is not GC'd mid-test
      const { Wrapper, client } = createWrapper(
        new QueryClient({
          defaultOptions: {
            queries: { retry: false, gcTime: Infinity },
            mutations: { retry: false },
          },
        })
      )
      const serverIdsKey = ['bookmarks', 'ids', 'server']
      client.setQueryData(serverIdsKey, ['srv-1'])

      const { result } = renderHook(() => useToggleBookmark(), { wrapper: Wrapper })

      await act(async () => {
        await result.current
          .mutateAsync({ businessId: 'srv-9', isBookmarked: false })
          .catch(() => undefined)
      })

      expect(client.getQueryData<string[]>(serverIdsKey)).toEqual(['srv-1'])
    })
  })
})
