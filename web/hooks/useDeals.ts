'use client'

/**
 * ============================================================================
 * HOOKS: Deals (Special Offers & Promotions)
 * ============================================================================
 *
 * USER JOURNEY:
 *   1. User navigates to /deals → useAvailableDeals fetches all active offers
 *   2. Deal cards show discount type, amount, expiration, and a "Claim" CTA
 *   3. User clicks Claim → useClaimDeal fires POST /api/deals/[id]/claim
 *   4. Server generates a unique redemption code; client shows it in a dialog
 *   5. "My Deals" tab (useUserClaims) lists claimed deals with redeem status
 *
 * DESIGN RATIONALE:
 *   - Deal types (standard, boost_mission, flash, loyalty) drive badge color/label
 *   - Discount types (percentage, fixed_amount, free_item, bogo) format dynamically
 *   - Flash deals surface urgency via expiration countdown
 *   - Stale time of 5 min balances freshness vs request volume
 *
 * ACCESSIBILITY:
 *   - Claim button is disabled while mutation is pending (prevents double-claim)
 *   - Redemption code dialog is focus-trapped with close on Escape
 *   - Success/error states announced via toast (aria-live region)
 *
 * INPUT VALIDATION:
 *   - deal_id validated as UUID by claimDealSchema (Zod) server-side
 *   - Server checks: deal exists, not expired, usage limit not reached, user not already claimed
 * ============================================================================
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useHydrationSafeQuery } from '@/hooks/useHydrationSafeQuery'
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

async function fetchUserClaims(): Promise<DealClaimWithDeal[]> {
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
  return useHydrationSafeQuery({
    queryKey: dealKeys.business(businessId),
    queryFn: () => fetchBusinessDeals(businessId),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  })
}

/** Fetch all currently available deals across all businesses. */
export function useAvailableDeals() {
  return useHydrationSafeQuery<AvailableDeal[]>({
    queryKey: dealKeys.available(),
    queryFn: fetchAvailableDeals,
    staleTime: 5 * 60 * 1000,
  })
}

/** Fetch the current user's claimed deals (requires authentication). */
export function useUserClaims() {
  return useHydrationSafeQuery<DealClaimWithDeal[]>({
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

/** Mutation to scrape business websites for real deals via API Ninjas + Gemini. */
export function useScrapeDeals() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (businessId?: string) => {
      const url = businessId
        ? `/api/deals/scrape?businessId=${encodeURIComponent(businessId)}`
        : '/api/deals/scrape'
      const response = await fetch(url, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to scan for deals')
      return response.json() as Promise<{ scraped: number; dealsFound: number; errors?: string[] }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealKeys.available() })
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() })
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
