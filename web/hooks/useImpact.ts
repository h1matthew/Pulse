/**
 * Impact Data Hooks
 *
 * React Query hooks for fetching and displaying economic impact data.
 * Impact metrics track how each user's engagement (check-ins, reviews,
 * deal claims) translates into measurable local economic benefit.
 *
 * USER JOURNEY: Dashboard page → view personal metrics → compare on
 * leaderboard → download impact report.
 *
 * DESIGN RATIONALE: All hooks share the `impactKeys` factory so React Query
 * can deduplicate in-flight requests and invalidate related caches
 * together (e.g., after a recalculation).
 *
 * DATA FLOW:
 *   Supabase (user_impact, business_check_ins, reviews, deal_claims)
 *     → API routes (/api/impact/*, /api/leaderboard, /api/community-pulse)
 *       → React Query hooks (this file)
 *         → Dashboard, Leaderboard, Report components
 */
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useHydrationSafeQuery } from '@/hooks/useHydrationSafeQuery'
import type {
  UserImpact,
  ImpactMetrics,
  ImpactCalculationResult,
  LeaderboardEntry,
  CommunityPulse,
  ImpactTierConfig,
} from '@/types/impact'
import { IMPACT_TIERS } from '@/types/impact'
import type { ImpactReportData } from '@/lib/report-generator'

// ============================================================================
// Query Keys
// ============================================================================

/** React Query key factory for impact, leaderboard, and community pulse queries. */
const impactKeys = {
  all: ['impact'] as const,
  user: (userId: string) => [...impactKeys.all, 'user', userId] as const,
  report: (from: string | undefined, to: string) =>
    [...impactKeys.all, 'report', from ?? 'all', to] as const,
  leaderboard: (type: string, timeframe: string) =>
    [...impactKeys.all, 'leaderboard', type, timeframe] as const,
  community: (userId?: string) =>
    [...impactKeys.all, 'community', userId || 'anon'] as const,
  milestones: (userId: string) => [...impactKeys.all, 'milestones', userId] as const,
}

// ============================================================================
// Fetch Functions
// ============================================================================

/** Fetch the user_impact row for the authenticated user via GET /api/impact. */
async function fetchUserImpact(userId: string): Promise<UserImpact> {
  const response = await fetch('/api/impact')
  if (!response.ok) throw new Error('Failed to fetch impact')
  return response.json()
}

/** Trigger a server-side recalculation and return the fresh result via GET /api/impact/calculate. */
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

/** Fetch leaderboard entries with optional scope and timeframe filters via GET /api/leaderboard. */
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

/** Fetch aggregate community stats (total dollars local, active users) via GET /api/community-pulse. */
async function fetchCommunityPulse(): Promise<CommunityPulse> {
  const response = await fetch('/api/community-pulse')
  if (!response.ok) throw new Error('Failed to fetch community pulse')
  return response.json()
}

/** Fetch a detailed, multi-section impact report for CSV/print export via GET /api/impact/report. */
async function fetchImpactReport(dateRange: { from?: string; to: string }): Promise<ImpactReportData> {
  const params = new URLSearchParams()
  if (dateRange.from) params.set('from', dateRange.from)
  params.set('to', dateRange.to)
  const response = await fetch(`/api/impact/report?${params}`)
  if (!response.ok) throw new Error('Failed to fetch impact report')
  return response.json()
}

// ============================================================================
// Mutations
// ============================================================================

/** POST /api/impact/recalculate — force a full recompute of the user's impact metrics. */
async function recalculateImpact(): Promise<void> {
  const response = await fetch('/api/impact/recalculate', {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Failed to recalculate impact')
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch the authenticated user's economic impact data (dollars kept local, businesses supported, etc.).
 * @param userId - The user's UUID (used for cache keying; API uses session auth)
 */
export function useUserImpact(userId: string) {
  return useHydrationSafeQuery({
    queryKey: impactKeys.user(userId),
    queryFn: () => fetchUserImpact(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Trigger and fetch a fresh impact calculation for the user.
 * @param userId - The user's UUID (used for cache keying)
 */
export function useImpactCalculation(userId: string) {
  return useHydrationSafeQuery({
    queryKey: [...impactKeys.user(userId), 'calculation'],
    queryFn: () => fetchImpactCalculation(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch the community leaderboard rankings.
 * @param type - Leaderboard scope: "global" or region-based
 * @param timeframe - Time window: "all_time", "monthly", "weekly"
 */
export function useLeaderboard(type = 'global', timeframe = 'all_time') {
  return useHydrationSafeQuery({
    queryKey: impactKeys.leaderboard(type, timeframe),
    queryFn: () => fetchLeaderboard(type, timeframe),
    staleTime: 5 * 60 * 1000,
  })
}

/** Fetch aggregate community impact metrics (total dollars local, businesses supported, active users). */
export function useCommunityPulse(userId?: string) {
  return useHydrationSafeQuery({
    queryKey: impactKeys.community(userId),
    queryFn: fetchCommunityPulse,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

/**
 * Fetch a detailed impact report for a given date range, used by the report export feature.
 * @param dateRange - Start and end dates for the report (ISO strings)
 */
export function useImpactReport(dateRange: { from?: string; to: string }) {
  return useHydrationSafeQuery({
    queryKey: impactKeys.report(dateRange.from, dateRange.to),
    queryFn: () => fetchImpactReport(dateRange),
    enabled: !!dateRange.to,
    staleTime: 2 * 60 * 1000,
  })
}

/** Mutation to force-recalculate the user's impact metrics. Invalidates all impact queries on success. */
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

/**
 * Derive display-ready impact data from raw user impact metrics.
 * Computes formatted metrics, current tier, next tier, and progress toward the next tier.
 * @param userId - The user's UUID
 * @returns Impact data, tier info, and progress percentage (0–1)
 */
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

/**
 * Compare the user's impact against the community leaderboard.
 * Returns rank, percentile, and a human-readable comparison label.
 * @param userId - The user's UUID
 */
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
