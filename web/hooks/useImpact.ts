'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  UserImpact,
  ImpactMetrics,
  ImpactCalculationResult,
  LeaderboardEntry,
  CommunityPulse,
  ImpactTierConfig,
} from '@/types/impact'
import { IMPACT_TIERS } from '@/types/impact'

// ============================================================================
// Query Keys
// ============================================================================

const impactKeys = {
  all: ['impact'] as const,
  user: (userId: string) => [...impactKeys.all, 'user', userId] as const,
  leaderboard: (type: string, timeframe: string) =>
    [...impactKeys.all, 'leaderboard', type, timeframe] as const,
  community: () => [...impactKeys.all, 'community'] as const,
  milestones: (userId: string) => [...impactKeys.all, 'milestones', userId] as const,
}

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchUserImpact(userId: string): Promise<UserImpact> {
  const response = await fetch('/api/impact')
  if (!response.ok) throw new Error('Failed to fetch impact')
  return response.json()
}

async function fetchImpactCalculation(userId: string): Promise<ImpactCalculationResult> {
  const response = await fetch('/api/impact/calculate')
  if (!response.ok) throw new Error('Failed to calculate impact')
  return response.json()
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[]
  userRank: number | null
  totalCount: number
}

async function fetchLeaderboard(
  type = 'global',
  timeframe = 'all_time'
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams()
  params.set('type', type)
  params.set('timeframe', timeframe)

  const response = await fetch(`/api/leaderboard?${params}`)
  if (!response.ok) throw new Error('Failed to fetch leaderboard')
  return response.json()
}

async function fetchCommunityPulse(): Promise<CommunityPulse> {
  const response = await fetch('/api/community-pulse')
  if (!response.ok) throw new Error('Failed to fetch community pulse')
  return response.json()
}

// ============================================================================
// Mutations
// ============================================================================

async function recalculateImpact(): Promise<void> {
  const response = await fetch('/api/impact/recalculate', {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Failed to recalculate impact')
}

// ============================================================================
// Hooks
// ============================================================================

export function useUserImpact(userId: string) {
  return useQuery({
    queryKey: impactKeys.user(userId),
    queryFn: () => fetchUserImpact(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useImpactCalculation(userId: string) {
  return useQuery({
    queryKey: [...impactKeys.user(userId), 'calculation'],
    queryFn: () => fetchImpactCalculation(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLeaderboard(type = 'global', timeframe = 'all_time') {
  return useQuery({
    queryKey: impactKeys.leaderboard(type, timeframe),
    queryFn: () => fetchLeaderboard(type, timeframe),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCommunityPulse() {
  return useQuery({
    queryKey: impactKeys.community(),
    queryFn: fetchCommunityPulse,
    staleTime: 10 * 60 * 1000,
  })
}

export function useRecalculateImpact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: recalculateImpact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: impactKeys.all })
    },
  })
}

// ============================================================================
// Impact Display Helpers
// ============================================================================

export function useImpactDisplay(userId: string) {
  const { data: impact, ...rest } = useUserImpact(userId)

  const metrics: ImpactMetrics | undefined = impact ? {
    dollarsKeptLocal: Number(impact.estimated_dollars_kept_local),
    businessesSupported: impact.businesses_supported,
    jobsImpacted: impact.jobs_impacted_estimate,
    carbonSaved: impact.total_check_ins * 0.5,
  } : undefined

  const tier: ImpactTierConfig | undefined = impact
    ? IMPACT_TIERS.slice().reverse().find(t =>
        Number(impact.estimated_dollars_kept_local) >= t.minDollars
      )
    : undefined

  const nextTier: ImpactTierConfig | undefined = tier
    ? IMPACT_TIERS.find(t => t.minDollars > tier.minDollars)
    : undefined

  const nextTierProgress = tier && nextTier && impact
    ? Math.min(1, Math.max(0,
        (Number(impact.estimated_dollars_kept_local) - tier.minDollars) /
        (nextTier.minDollars - tier.minDollars)
      ))
    : 0

  return {
    impact,
    metrics,
    tier,
    nextTier,
    nextTierProgress,
    ...rest,
  }
}

// ============================================================================
// Impact Comparison Helpers
// ============================================================================

export function useImpactComparison(userId: string) {
  const { data: leaderboardData } = useLeaderboard('global', 'all_time')
  const { data: userImpact } = useUserImpact(userId)

  const entries = leaderboardData?.entries ?? []
  const userRank = entries.find(entry => entry.user_id === userId)?.rank
  const totalUsers = entries.length || 0

  const percentile = userRank && totalUsers > 0
    ? Math.round(((totalUsers - userRank) / totalUsers) * 100)
    : 50

  const comparisonText = percentile >= 90
    ? 'Top 10% of supporters'
    : percentile >= 75
    ? 'Top 25% of supporters'
    : percentile >= 50
    ? 'Above average impact'
    : 'Building your impact'

  return {
    userRank,
    totalUsers,
    percentile,
    comparisonText,
  }
}
