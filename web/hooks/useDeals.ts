'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Deal, DealWithBusiness, DealClaimWithDeal } from '@/types/business'

// ============================================================================
// Query Keys
// ============================================================================

/** React Query key factory for deal listings, business-specific deals, and user claim queries. */
const dealKeys = {
  all: ['deals'] as const,
  lists: () => [...dealKeys.all, 'list'] as const,
  business: (businessId: string) => [...dealKeys.lists(), 'business', businessId] as const,
  available: () => [...dealKeys.lists(), 'available'] as const,
  userClaims: (userId: string) => [...dealKeys.lists(), 'claims', userId] as const,
  detail: (id: string) => [...dealKeys.all, 'detail', id] as const,
}

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchBusinessDeals(businessId: string): Promise<Deal[]> {
  const response = await fetch(`/api/deals?businessId=${encodeURIComponent(businessId)}`)
  if (!response.ok) throw new Error('Failed to fetch deals')
  const payload = await response.json()
  return payload.deals || []
}

export type AvailableDeal = DealWithBusiness & { isClaimed?: boolean }

async function fetchAvailableDeals(): Promise<AvailableDeal[]> {
  const response = await fetch('/api/deals')
  if (!response.ok) throw new Error('Failed to fetch deals')
  const payload = await response.json()
  return payload.deals || []
}

async function fetchUserClaims(userId: string): Promise<DealClaimWithDeal[]> {
  const response = await fetch('/api/deals/claims')
  if (!response.ok) throw new Error('Failed to fetch claims')
  const payload = await response.json()
  return payload.claims || []
}

// ============================================================================
// Mutations
// ============================================================================

async function claimDeal(dealId: string): Promise<DealClaimWithDeal> {
  const response = await fetch(`/api/deals/${dealId}/claim`, {
    method: 'POST',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || error.message || 'Failed to claim deal')
  }
  return response.json()
}

interface RedeemDealParams {
  claimId: string
  code: string
}

async function redeemDeal({ claimId, code }: RedeemDealParams): Promise<void> {
  const response = await fetch(`/api/deals/claims/${claimId}/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!response.ok) throw new Error('Failed to redeem deal')
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch active deals for a specific business.
 * @param businessId - Business UUID
 */
export function useBusinessDeals(businessId: string) {
  return useQuery({
    queryKey: dealKeys.business(businessId),
    queryFn: () => fetchBusinessDeals(businessId),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  })
}

/** Fetch all currently available deals across all businesses. */
export function useAvailableDeals() {
  return useQuery<DealsResponse>({
    queryKey: dealKeys.available(),
    queryFn: fetchAvailableDeals,
    staleTime: 5 * 60 * 1000,
  })
}

/** Fetch the current user's claimed deals (requires authentication). */
export function useUserClaims() {
  return useQuery<ClaimsResponse>({
    queryKey: dealKeys.userClaims('current'),
    queryFn: fetchUserClaims,
    staleTime: 2 * 60 * 1000,
  })
}

/** Mutation to claim a deal. Generates a unique redemption code and invalidates deal caches. */
export function useClaimDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: claimDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealKeys.available() })
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['impact'] })
    },
  })
}

/** Mutation to redeem a previously claimed deal using the redemption code. */
export function useRedeemDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: redeemDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealKeys.userClaims('') })
    },
  })
}
