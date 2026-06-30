'use client'

/**
 * ============================================================================
 * HOOKS: Bookmarks (Save / Unsave Businesses)
 * ============================================================================
 *
 * USER JOURNEY:
 *   1. User taps the heart icon on a BusinessCard or Business Detail hero
 *   2. If not authenticated → the bookmark is saved on-device (localStorage via
 *      @/lib/bookmarks/local) — no network call. UI toasts invite sign-in to sync.
 *   3. If authenticated → useToggleBookmark optimistically flips the icon and
 *      calls POST or DELETE against /api/bookmarks
 *   4. On success, all bookmark caches are invalidated so the /bookmarks page
 *      and heart icons reflect the change immediately
 *
 * AUTH-AWARE SCOPING:
 *   - useBookmarkScope() resolves 'server' when signed in, 'local' otherwise
 *     (including while auth state is still loading)
 *   - useBookmarkedIds / useToggleBookmark read+write whichever store matches
 *     the current scope; the ids query key is suffixed with the scope so guest
 *     and server caches never collide
 *   - useToggleBookmark resolves { bookmarked, local } — local:true means the
 *     change was stored on this device only
 *
 * DESIGN RATIONALE:
 *   - useIsBookmarked is a lightweight single-boolean query (fast cache hit)
 *   - Toggle pattern (create-or-delete in one mutation) reduces component logic
 *   - 1-minute stale time on isBookmarked keeps the heart icon fresh on revisit
 *   - 5-minute stale time on the full list avoids over-fetching the bookmarks page
 *   - Local ids use staleTime 0 — localStorage reads are free, so always re-read
 *
 * ACCESSIBILITY:
 *   - Heart icon state (filled vs outline) is visually distinct AND color-coded
 *   - Calling components add aria-label "Bookmark" / "Remove bookmark" based on state
 *
 * INPUT VALIDATION:
 *   - businessId is a UUID validated server-side by createBookmarkSchema (Zod)
 *   - note field is max 500 chars (updateBookmarkSchema)
 * ============================================================================
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useHydrationSafeQuery } from '@/hooks/useHydrationSafeQuery'
import { useAuth } from '@/components/providers/AuthProvider'
import { getLocalBookmarkIds, toggleLocalBookmark } from '@/lib/bookmarks/local'
import type { BusinessBookmark, BookmarkWithBusiness } from '@/types/business'

// ============================================================================
// Query Keys
// ============================================================================

const bookmarkKeys = {
  all: ['bookmarks'] as const,
  lists: () => [...bookmarkKeys.all, 'list'] as const,
  user: (userId: string) => [...bookmarkKeys.lists(), userId] as const,
  detail: (businessId: string) => [...bookmarkKeys.all, 'detail', businessId] as const,
  ids: (scope: BookmarkScope) => [...bookmarkKeys.all, 'ids', scope] as const,
}

// ============================================================================
// Auth-Aware Scope
// ============================================================================

type BookmarkScope = 'local' | 'server'

/**
 * Resolve which bookmark store the current visitor should use.
 * 'server' only once auth has confirmed a signed-in user; 'local' for guests
 * AND while auth state is still loading (guests must never hit the API).
 */
function useBookmarkScope(): BookmarkScope {
  const { isLoggedIn, loading } = useAuth()
  return !loading && isLoggedIn ? 'server' : 'local'
}

// ============================================================================
// Fetch Functions
// ============================================================================

interface BookmarksResponse {
  bookmarks: BookmarkWithBusiness[]
  total: number
  hasMore: boolean
}

async function fetchUserBookmarks(userId: string): Promise<BookmarksResponse> {
  const response = await fetch('/api/bookmarks')
  if (!response.ok) throw new Error('Failed to fetch bookmarks')
  return response.json()
}

/** Fetch all bookmarked business IDs in a single call (avoids N+1 per-card checks) */
async function fetchBookmarkedIds(): Promise<string[]> {
  const response = await fetch('/api/bookmarks')
  if (!response.ok) return []
  const data: BookmarksResponse = await response.json()
  return data.bookmarks.map(b => b.business_id)
}

// ============================================================================
// Mutations
// ============================================================================

async function createBookmark(businessId: string, note?: string): Promise<BusinessBookmark> {
  const response = await fetch('/api/bookmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ business_id: businessId, note }),
  })
  if (!response.ok) throw new Error('Failed to create bookmark')
  return response.json()
}

async function deleteBookmark(businessId: string): Promise<void> {
  const response = await fetch(`/api/bookmarks/${businessId}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Failed to delete bookmark')
}

async function updateBookmarkNote(businessId: string, note: string): Promise<BusinessBookmark> {
  const response = await fetch(`/api/bookmarks/${businessId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  })
  if (!response.ok) throw new Error('Failed to update bookmark')
  return response.json()
}

// ============================================================================
// Hooks
// ============================================================================

export function useUserBookmarks(userId: string) {
  return useHydrationSafeQuery({
    queryKey: bookmarkKeys.user(userId),
    queryFn: () => fetchUserBookmarks(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch all bookmarked IDs once — used by useIsBookmarked to avoid N+1 calls.
 * Auth-aware: server ids when signed in, on-device ids for guests.
 */
export function useBookmarkedIds() {
  const scope = useBookmarkScope()
  return useHydrationSafeQuery({
    queryKey: bookmarkKeys.ids(scope),
    queryFn: scope === 'server' ? fetchBookmarkedIds : () => getLocalBookmarkIds(),
    // localStorage reads are free — always re-read; server ids cache for 2 min
    staleTime: scope === 'server' ? 2 * 60 * 1000 : 0,
  })
}

export function useIsBookmarked(businessId: string) {
  const { data: bookmarkedIds } = useBookmarkedIds()
  return {
    data: Array.isArray(bookmarkedIds) ? bookmarkedIds.includes(businessId) : undefined,
  }
}

export function useCreateBookmark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ businessId, note }: { businessId: string; note?: string }) =>
      createBookmark(businessId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all })
    },
  })
}

export function useDeleteBookmark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteBookmark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all })
    },
  })
}

export function useToggleBookmark() {
  const queryClient = useQueryClient()
  const scope = useBookmarkScope()

  return useMutation({
    mutationFn: async ({
      businessId,
      isBookmarked,
      note,
    }: {
      businessId: string
      isBookmarked: boolean
      note?: string
    }): Promise<{ bookmarked: boolean; local: boolean }> => {
      // Guests or demo businesses: toggle on-device — no network calls
      const isDemoId = businessId.startsWith('demo-') || businessId === 'onboarding-demo'
      if (scope === 'local' || isDemoId) {
        const { bookmarked } = toggleLocalBookmark(businessId)
        return { bookmarked, local: true }
      }

      if (isBookmarked) {
        await deleteBookmark(businessId)
        return { bookmarked: false, local: false }
      } else {
        try {
          await createBookmark(businessId, note)
        } catch {
          // If create fails (e.g. 409 duplicate), try delete instead (toggle behavior)
          await deleteBookmark(businessId)
          return { bookmarked: false, local: false }
        }
        return { bookmarked: true, local: false }
      }
    },
    onMutate: async ({ businessId, isBookmarked }) => {
      const idsKey = bookmarkKeys.ids(scope)
      await queryClient.cancelQueries({ queryKey: idsKey })
      const previous = queryClient.getQueryData<string[]>(idsKey)
      queryClient.setQueryData<string[]>(idsKey, (old) => {
        const arr = [...(old || [])]
        if (isBookmarked) return arr.filter(id => id !== businessId)
        if (!arr.includes(businessId)) arr.push(businessId)
        return arr
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(bookmarkKeys.ids(scope), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all })
    },
  })
}
