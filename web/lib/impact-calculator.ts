/**
 * Economic Impact Calculator
 *
 * Calculates user impact based on their engagement with local businesses.
 * Formula design reflects research on local economic multipliers:
 * - ~68% of spend at local businesses stays in community (vs ~43% at chains)
 * - ~1 job supported per $100k in local economic activity
 * - ~0.5 lbs CO2 saved per local purchase vs chain alternative
 */

import { createClient } from './supabase/server'
import type {
  ImpactMetrics,
  ImpactCalculationInput,
  ImpactCalculationResult,
  ImpactTier,
  ImpactTierConfig,
  Milestone,
} from '@/types/impact'
import { IMPACT_TIERS } from '@/types/impact'

// ============================================================================
// Configuration
// ============================================================================

/** Default average spend per check-in if user doesn't specify */
const DEFAULT_AVG_SPEND = 35

/** Percentage of spend that stays in local economy (vs chains) */
const LOCAL_ECONOMIC_MULTIPLIER = 0.68

/** Jobs impacted per $100k in local spending */
const JOBS_PER_100K_SPEND = 1

/** Lbs CO2 saved per local purchase vs chain */
const CO2_SAVINGS_PER_PURCHASE = 0.5

/** Impact points per action (for score calculation) */
const POINTS = {
  DOLLAR_KEPT: 1,       // 1 point per dollar kept local
  CHECK_IN: 5,          // Points per check-in
  REVIEW: 25,           // Points per review
  MISSION_COMPLETE: 100, // Points per mission
  DEAL_CLAIM: 10,       // Points per deal claim
  BOOKMARK: 2,          // Points per bookmark
}

// ============================================================================
// Main Calculation Functions
// ============================================================================

/**
 * Calculate impact metrics from user activity data
 */
export function calculateImpactMetrics(
  input: ImpactCalculationInput
): ImpactMetrics {
  const {
    checkInCount,
    uniqueBusinessCount,
    avgSpendPerCheckIn = DEFAULT_AVG_SPEND,
    reviewsLeft,
    missionsCompleted,
    dealsClaimed,
  } = input

  // Calculate total estimated spend
  const totalSpend = checkInCount * avgSpendPerCheckIn

  // Calculate dollars kept in local economy
  const dollarsKeptLocal = totalSpend * LOCAL_ECONOMIC_MULTIPLIER

  // Businesses supported (unique businesses checked in at)
  const businessesSupported = uniqueBusinessCount

  // Estimate jobs impacted (rough calculation: 1 job per $100k in local spend)
  const jobsImpacted = Math.max(1, Math.floor(dollarsKeptLocal / 100_000))

  // Calculate carbon footprint reduction
  // Based on average of 0.5 lbs CO2 saved per local purchase
  const carbonSaved = checkInCount * CO2_SAVINGS_PER_PURCHASE

  return {
    dollarsKeptLocal: Math.round(dollarsKeptLocal),
    businessesSupported,
    jobsImpacted,
    carbonSaved: Math.round(carbonSaved * 10) / 10, // Round to 1 decimal
  }
}

/**
 * Calculate impact score from metrics and activity
 */
export function calculateImpactScore(
  metrics: ImpactMetrics,
  input: ImpactCalculationInput
): number {
  const scoreFromDollars = Math.floor(metrics.dollarsKeptLocal * POINTS.DOLLAR_KEPT / 10)
  const scoreFromCheckIns = input.checkInCount * POINTS.CHECK_IN
  const scoreFromReviews = input.reviewsLeft * POINTS.REVIEW
  const scoreFromMissions = input.missionsCompleted * POINTS.MISSION_COMPLETE
  const scoreFromDeals = input.dealsClaimed * POINTS.DEAL_CLAIM

  return (
    scoreFromDollars +
    scoreFromCheckIns +
    scoreFromReviews +
    scoreFromMissions +
    scoreFromDeals
  )
}

/**
 * Determine impact tier based on dollars kept local
 */
export function getImpactTier(dollarsKeptLocal: number): ImpactTierConfig {
  // Find the highest tier the user qualifies for
  for (let i = IMPACT_TIERS.length - 1; i >= 0; i--) {
    if (dollarsKeptLocal >= IMPACT_TIERS[i].minDollars) {
      return IMPACT_TIERS[i]
    }
  }
  return IMPACT_TIERS[0]
}

/**
 * Calculate progress to next tier (0-1)
 */
export function calculateNextTierProgress(
  dollarsKeptLocal: number,
  currentTier: ImpactTier
): number {
  const currentTierIndex = IMPACT_TIERS.findIndex(t => t.tier === currentTier)

  // If at max tier, return 1
  if (currentTierIndex >= IMPACT_TIERS.length - 1) {
    return 1
  }

  const nextTier = IMPACT_TIERS[currentTierIndex + 1]
  const currentMin = IMPACT_TIERS[currentTierIndex].minDollars
  const nextMin = nextTier.minDollars

  const progress = (dollarsKeptLocal - currentMin) / (nextMin - currentMin)
  return Math.min(1, Math.max(0, progress))
}

/**
 * Calculate percentile rank among all users
 */
export async function calculatePercentileRank(
  userId: string
): Promise<number> {
  const supabase = await createClient()

  // Get user's impact
  const { data: userImpact } = await supabase
    .from('user_impact')
    .select('estimated_dollars_kept_local')
    .eq('user_id', userId)
    .single()

  if (!userImpact) return 0

  // Count total users with impact
  const { count: totalUsers } = await supabase
    .from('user_impact')
    .select('*', { count: 'exact', head: true })
    .gt('estimated_dollars_kept_local', 0)

  if (!totalUsers || totalUsers === 0) return 50

  // Count users with less impact
  const { count: usersBelow } = await supabase
    .from('user_impact')
    .select('*', { count: 'exact', head: true })
    .lt('estimated_dollars_kept_local', userImpact.estimated_dollars_kept_local)

  const percentile = usersBelow
    ? Math.round((usersBelow / totalUsers) * 100)
    : 50

  return percentile
}

/**
 * Complete impact calculation for a user
 */
export async function calculateUserImpact(
  userId: string
): Promise<ImpactCalculationResult | null> {
  const supabase = await createClient()

  // Fetch user's activity data
  const { data: checkIns } = await supabase
    .from('business_check_ins')
    .select('business_id, spend_amount')
    .eq('user_id', userId)

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id')
    .eq('user_id', userId)

  const { data: missions } = await supabase
    .from('user_mission_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('is_completed', true)

  const { data: deals } = await supabase
    .from('deal_claims')
    .select('id')
    .eq('user_id', userId)

  // Calculate metrics
  const checkInCount = checkIns?.length || 0
  const uniqueBusinesses = new Set(checkIns?.map(c => c.business_id) || [])
  const totalSpend = checkIns?.reduce((sum, c) => sum + (c.spend_amount || DEFAULT_AVG_SPEND), 0) || 0
  const avgSpendPerCheckIn = checkInCount > 0 ? totalSpend / checkInCount : DEFAULT_AVG_SPEND

  const input: ImpactCalculationInput = {
    checkInCount,
    uniqueBusinessCount: uniqueBusinesses.size,
    avgSpendPerCheckIn,
    reviewsLeft: reviews?.length || 0,
    missionsCompleted: missions?.length || 0,
    dealsClaimed: deals?.length || 0,
  }

  const metrics = calculateImpactMetrics(input)
  const tier = getImpactTier(metrics.dollarsKeptLocal)
  const nextTierProgress = calculateNextTierProgress(
    metrics.dollarsKeptLocal,
    tier.tier
  )

  // Update database with calculated impact
  await supabase.from('user_impact').upsert({
    user_id: userId,
    estimated_dollars_kept_local: metrics.dollarsKeptLocal,
    businesses_supported: metrics.businessesSupported,
    jobs_impacted_estimate: metrics.jobsImpacted,
    reviews_left: input.reviewsLeft,
    missions_completed: input.missionsCompleted,
    deals_claimed: input.dealsClaimed,
    total_check_ins: input.checkInCount,
    last_updated: new Date().toISOString(),
  }, {
    onConflict: 'user_id',
  })

  // Get percentile rank
  const percentileRank = await calculatePercentileRank(userId)

  return {
    metrics,
    percentileRank,
    tier: tier.tier,
    nextTierProgress,
  }
}

// ============================================================================
// Milestone Functions
// ============================================================================

/**
 * Check for newly achieved milestones
 */
export function checkMilestones(
  impact: ImpactMetrics,
  previousImpact?: ImpactMetrics
): Milestone[] {
  const milestones: Milestone[] = []
  const achievedAt = new Date().toISOString()

  // Dollar milestones
  const dollarMilestones = [100, 250, 500, 1000, 2500, 5000, 10000]
  for (const threshold of dollarMilestones) {
    if (
      impact.dollarsKeptLocal >= threshold &&
      (!previousImpact || previousImpact.dollarsKeptLocal < threshold)
    ) {
      milestones.push({
        id: `dollars-${threshold}`,
        type: 'dollars',
        threshold,
        title: `$${threshold} Kept Local`,
        description: `You've kept $${threshold} in your local economy!`,
        achieved_at: achievedAt,
      })
    }
  }

  // Business milestones
  const businessMilestones = [5, 10, 25, 50, 100]
  for (const threshold of businessMilestones) {
    if (
      impact.businessesSupported >= threshold &&
      (!previousImpact || previousImpact.businessesSupported < threshold)
    ) {
      milestones.push({
        id: `businesses-${threshold}`,
        type: 'businesses',
        threshold,
        title: `${threshold} Businesses Supported`,
        description: `You've supported ${threshold} local businesses!`,
        achieved_at: achievedAt,
      })
    }
  }

  return milestones
}

// ============================================================================
// Community Impact Functions
// ============================================================================

/**
 * Update community pulse aggregate metrics
 */
export async function updateCommunityPulse(): Promise<void> {
  const supabase = await createClient()

  // Call the database function
  await supabase.rpc('update_community_pulse')
}

/**
 * Get community impact summary
 */
export async function getCommunityImpact(): Promise<{
  totalDollarsKept: number
  totalBusinessesSupported: number
  totalReviews: number
  activeUsers: number
  pulseScore: number
} | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('community_pulse')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null

  return {
    totalDollarsKept: data.total_dollars_kept_local,
    totalBusinessesSupported: data.total_businesses_supported,
    totalReviews: data.total_reviews_left,
    activeUsers: data.active_users,
    pulseScore: data.pulse_score,
  }
}

// ============================================================================
// Social Sharing Functions
// ============================================================================

/**
 * Generate share text for social media
 */
export function generateShareText(
  metrics: ImpactMetrics,
  tier: ImpactTierConfig,
  timeframe: 'month' | 'year' | 'all_time' = 'all_time'
): string {
  const timeframeText = {
    month: 'this month',
    year: 'this year',
    all_time: '',
  }[timeframe]

  let text = `I'm a ${tier.name} on Pulse! `
  text += `I've kept $${metrics.dollarsKeptLocal.toLocaleString()} in my local economy${timeframeText ? ' ' + timeframeText : ''}, `
  text += `supporting ${metrics.businessesSupported} local businesses.`

  if (metrics.jobsImpacted > 1) {
    text += ` That's an estimated ${metrics.jobsImpacted} jobs impacted!`
  }

  text += ' #ShopLocal #PulseImpact'
  return text
}

/**
 * Generate milestone celebration text
 */
export function generateMilestoneText(
  milestone: Milestone,
  tier: ImpactTierConfig
): string {
  return `🎉 ${milestone.title}! I'm making a real difference in my community as a ${tier.name}. Join me on Pulse and see your local impact!`
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format dollar amount for display
 */
export function formatDollars(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`
  }
  return `$${amount}`
}

/**
 * Format carbon saved for display
 */
export function formatCarbonSaved(lbs: number): string {
  if (lbs >= 2000) {
    return `${(lbs / 2000).toFixed(1)} tons`
  }
  return `${Math.round(lbs)} lbs`
}
