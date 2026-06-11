/**
 * Review Data Hooks
 *
 * React Query hooks for fetching, creating, and managing business reviews.
 *
 * USER JOURNEY: Business detail page → read reviews → write a review
 * (with CAPTCHA verification) → see it appear in the list.
 *
 * DESIGN RATIONALE: Reviews are fetched per-business and cached for 2 min.
 * After a successful create/delete mutation, the business's review list
 * AND the user's review list are both invalidated to stay in sync.
 */
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useHydrationSafeQuery } from '@/hooks/useHydrationSafeQuery'
import type { Review, ReviewWithUser, ReviewCreateInput } from '@/types/business'

// ============================================================================
// Query Keys
// ============================================================================

const reviewKeys = {
  all: ['reviews'] as const,
  lists: () => [...reviewKeys.all, 'list'] as const,
  business: (businessId: string) => [...reviewKeys.lists(), 'business', businessId] as const,
  user: (userId: string) => [...reviewKeys.lists(), 'user', userId] as const,
  detail: (id: string) => [...reviewKeys.all, 'detail', id] as const,
}

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchBusinessReviews(businessId: string): Promise<ReviewWithUser[]> {
  const response = await fetch(`/api/reviews?businessId=${encodeURIComponent(businessId)}&limit=20`)
  if (!response.ok) throw new Error('Failed to fetch reviews')
  const payload = await response.json()
  return payload.reviews || []
}

async function fetchUserReviews(userId: string): Promise<ReviewWithUser[]> {
  const response = await fetch(`/api/reviews?userId=${encodeURIComponent(userId)}&limit=20`)
  if (!response.ok) throw new Error('Failed to fetch user reviews')
  const payload = await response.json()
  return payload.reviews || []
}

// ============================================================================
// Mutations
// ============================================================================

async function createReview(data: ReviewCreateInput): Promise<Review> {
  const response = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || error.message || 'Failed to create review')
  }
  return response.json()
}

async function updateReview(id: string, data: Partial<Review>): Promise<Review> {
  const response = await fetch(`/api/reviews/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update review')
  return response.json()
}

async function deleteReview(id: string): Promise<void> {
  const response = await fetch(`/api/reviews/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Failed to delete review')
}

async function markReviewHelpful(id: string): Promise<void> {
  const response = await fetch(`/api/reviews/${id}/helpful`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Failed to mark review helpful')
}

// ============================================================================
// Hooks
// ============================================================================

export function useBusinessReviews(businessId: string) {
  return useHydrationSafeQuery({
    queryKey: reviewKeys.business(businessId),
    queryFn: () => fetchBusinessReviews(businessId),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useUserReviews(userId: string) {
  return useHydrationSafeQuery({
    queryKey: reviewKeys.user(userId),
    queryFn: () => fetchUserReviews(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createReview,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.business(data.business_id) })
      queryClient.invalidateQueries({ queryKey: ['businesses', 'detail', data.business_id] })
    },
  })
}

export function useUpdateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Review> }) => updateReview(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.business(data.business_id) })
    },
  })
}

export function useDeleteReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() })
    },
  })
}

export function useMarkReviewHelpful() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markReviewHelpful,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(id) })
    },
  })
}
