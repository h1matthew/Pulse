'use client'

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

async function checkIsBookmarked(businessId: string): Promise<boolean> {
  const response = await fetch(`/api/bookmarks/check?businessId=${businessId}`)
  if (!response.ok) return false
  const data = await response.json()
  return data.isBookmarked
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

export function useIsBookmarked(businessId: string) {
  return useQuery({
    queryKey: bookmarkKeys.detail(businessId),
    queryFn: () => checkIsBookmarked(businessId),
    enabled: !!businessId,
    staleTime: 1 * 60 * 1000,
  })
}

export function useCreateBookmark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ businessId, note }: { businessId: string; note?: string }) =>
      createBookmark(businessId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.lists() })
    },
  })
}

export function useDeleteBookmark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteBookmark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.lists() })
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
        await createBookmark(businessId, note)
        return { bookmarked: true }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.lists() })
    },
  })
}
