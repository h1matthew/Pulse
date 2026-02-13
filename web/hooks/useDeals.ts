'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Deal, DealWithBusiness, DealClaim } from '@/types/business'

// ============================================================================
// Query Keys
// ============================================================================

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
  const response = await fetch(`/api/businesses/${businessId}/deals`)
  if (!response.ok) throw new Error('Failed to fetch deals')
  return response.json()
}

async function fetchAvailableDeals(): Promise<DealWithBusiness[]> {
  const response = await fetch('/api/deals')
  if (!response.ok) throw new Error('Failed to fetch deals')
  return response.json()
}

async function fetchUserClaims(userId: string): Promise<DealClaim[]> {
  const response = await fetch('/api/deals/claims')
  if (!response.ok) throw new Error('Failed to fetch claims')
  return response.json()
}

// ============================================================================
// Mutations
// ============================================================================

async function claimDeal(dealId: string): Promise<DealClaim> {
  const response = await fetch(`/api/deals/${dealId}/claim`, {
    method: 'POST',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to claim deal')
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

export function useBusinessDeals(businessId: string) {
  return useQuery({
    queryKey: dealKeys.business(businessId),
    queryFn: () => fetchBusinessDeals(businessId),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAvailableDeals() {
  return useQuery({
    queryKey: dealKeys.available(),
    queryFn: fetchAvailableDeals,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUserClaims(userId: string) {
  return useQuery({
    queryKey: dealKeys.userClaims(userId),
    queryFn: () => fetchUserClaims(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useClaimDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: claimDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealKeys.userClaims('') })
      queryClient.invalidateQueries({ queryKey: ['impact'] })
    },
  })
}

export function useRedeemDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: redeemDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealKeys.userClaims('') })
    },
  })
}
