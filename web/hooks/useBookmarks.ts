'use client'

/**
 * ============================================================================
 * HOOKS: Bookmarks (Save / Unsave Businesses)
 * ============================================================================
 *
 * USER JOURNEY:
 *   1. User taps the heart icon on a BusinessCard or Business Detail hero
 *   2. If not authenticated → toast prompts sign-in (no mutation fires)
 *   3. useToggleBookmark optimistically flips the icon and calls POST or DELETE
 *   4. On success, all bookmark list caches are invalidated so the
 *      /bookmarks page reflects the change immediately
 *
 * DESIGN RATIONALE:
 *   - useIsBookmarked is a lightweight single-boolean query (fast cache hit)
 *   - Toggle pattern (create-or-delete in one mutation) reduces component logic
 *   - 1-minute stale time on isBookmarked keeps the heart icon fresh on revisit
 *   - 5-minute stale time on the full list avoids over-fetching the bookmarks page
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { BusinessBookmark, BookmarkWithBusiness } from '@/types/business'

// ============================================================================
// Query Keys
// ============================================================================

const bookmarkKeys = {
  all: ['bookmarks'] as const,
  lists: () => [...bookmarkKeys.all, 'list'] as const,
  user: (userId: string) => [...bookmarkKeys.lists(), userId] as const,
  detail: (businessId: string) => [...bookmarkKeys.all, 'detail', businessId] as const,
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
  return useQuery({
    queryKey: bookmarkKeys.user(userId),
    queryFn: () => fetchUserBookmarks(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

/** Fetch all bookmarked IDs once — used by useIsBookmarked to avoid N+1 calls */
export function useBookmarkedIds() {
  return useQuery({
    queryKey: [...bookmarkKeys.all, 'ids'] as const,
    queryFn: fetchBookmarkedIds,
    staleTime: 2 * 60 * 1000,
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

  return useMutation({
    mutationFn: async ({ businessId, isBookmarked, note }: { businessId: string; isBookmarked: boolean; note?: string }) => {
      if (isBookmarked) {
        await deleteBookmark(businessId)
        return { bookmarked: false }
      } else {
        try {
          await createBookmark(businessId, note)
        } catch {
          // If create fails (e.g. 409 duplicate), try delete instead (toggle behavior)
          await deleteBookmark(businessId)
          return { bookmarked: false }
        }
        return { bookmarked: true }
      }
    },
    onMutate: async ({ businessId, isBookmarked }) => {
      await queryClient.cancelQueries({ queryKey: [...bookmarkKeys.all, 'ids'] })
      const previous = queryClient.getQueryData<string[]>([...bookmarkKeys.all, 'ids'])
      queryClient.setQueryData<string[]>([...bookmarkKeys.all, 'ids'], (old) => {
        const arr = [...(old || [])]
        if (isBookmarked) return arr.filter(id => id !== businessId)
        if (!arr.includes(businessId)) arr.push(businessId)
        return arr
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([...bookmarkKeys.all, 'ids'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all })
    },
  })
}
