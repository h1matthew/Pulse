import type { Json } from './database.types'

// ============================================================================
// User Impact Types
// ============================================================================

export interface UserImpact {
  user_id: string
  estimated_dollars_kept_local: number
  businesses_supported: number
  jobs_impacted_estimate: number
  reviews_left: number
  missions_completed: number
  deals_claimed: number
  total_check_ins: number
  community_rank: number | null
  last_updated: string
}

export interface UserImpactWithProfile extends UserImpact {
  profile: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

// ============================================================================
// Impact Calculation Types
// ============================================================================

export interface ImpactMetrics {
  dollarsKeptLocal: number
  businessesSupported: number
  jobsImpacted: number
  carbonSaved: number // in lbs CO2
}

export interface ImpactCalculationInput {
  checkInCount: number
  uniqueBusinessCount: number
  avgSpendPerCheckIn: number
  reviewsLeft: number
  missionsCompleted: number
  dealsClaimed: number
}

export interface ImpactCalculationResult {
  metrics: ImpactMetrics
  percentileRank: number // 0-100
  tier: ImpactTier
  nextTierProgress: number // 0-1
}

// ============================================================================
// Impact Tiers
// ============================================================================

export type ImpactTier =
  | 'newcomer'
  | 'supporter'
  | 'advocate'
  | 'champion'
  | 'legend'
  | 'hero'

export interface ImpactTierConfig {
  tier: ImpactTier
  name: string
  minDollars: number
  color: string
  icon: string
  description: string
  benefits: string[]
}

export const IMPACT_TIERS: ImpactTierConfig[] = [
  {
    tier: 'newcomer',
    name: 'Pulse Newcomer',
    minDollars: 0,
    color: 'oklch(0.65 0.1 250)',
    icon: '🌱',
    description: 'Just getting started on your local impact journey',
    benefits: ['Access to basic deals', 'Join the community'],
  },
  {
    tier: 'supporter',
    name: 'Local Supporter',
    minDollars: 100,
    color: 'oklch(0.65 0.15 160)',
    icon: '💚',
    description: 'Supporting local businesses and making a difference',
    benefits: ['Early access to new deals', 'Supporter badge'],
  },
  {
    tier: 'advocate',
    name: 'Community Advocate',
    minDollars: 500,
    color: 'oklch(0.7 0.18 85)',
    icon: '🌟',
    description: 'Actively advocating for your local economy',
    benefits: ['Exclusive Advocate deals', 'Priority support', 'Advocate badge'],
  },
  {
    tier: 'champion',
    name: 'Pulse Champion',
    minDollars: 1000,
    color: 'oklch(0.65 0.16 45)',
    icon: '🏆',
    description: 'A true champion of local business',
    benefits: ['VIP event invitations', 'Champion-only perks', 'Featured profile'],
  },
  {
    tier: 'legend',
    name: 'Local Legend',
    minDollars: 2500,
    color: 'oklch(0.6 0.18 280)',
    icon: '👑',
    description: 'Legendary impact in your community',
    benefits: ['Personalized recommendations', 'Direct line to team', 'Legend badge'],
  },
  {
    tier: 'hero',
    name: 'Economic Hero',
    minDollars: 5000,
    color: 'oklch(0.7 0.2 320)',
    icon: '🦸',
    description: 'Hero-level impact transforming your local economy',
    benefits: ['Lifetime perks', 'Founding member status', 'Hero recognition'],
  },
]

// ============================================================================
// Community Pulse Types
// ============================================================================

export interface CommunityPulse {
  id: string
  date: string
  total_dollars_kept_local: number
  total_businesses_supported: number
  total_reviews_left: number
  total_missions_completed: number
  active_users: number
  new_businesses_added: number
  pulse_score: number
  created_at: string
  updated_at: string
}

export interface CommunityPulseTrend {
  current: CommunityPulse
  previous: CommunityPulse | null
  change: {
    dollarsKeptLocal: number
    businessesSupported: number
    activeUsers: number
    pulseScore: number
  }
}

// ============================================================================
// Leaderboard Types
// ============================================================================

export interface LeaderboardEntry {
  rank: number
  user_id: string
  display_name: string
  impact_score: number
  dollars_kept_local: number
  businesses_supported: number
  missions_completed: number
  avatar_url?: string | null
}

export type LeaderboardType = 'global' | 'city' | 'neighborhood'
export type LeaderboardTimeframe = 'week' | 'month' | 'all_time'

export interface LeaderboardFilters {
  type: LeaderboardType
  timeframe: LeaderboardTimeframe
  location?: string // city or neighborhood name
}

// ============================================================================
// Social Sharing Types
// ============================================================================

export interface ImpactShareCard {
  userId: string
  displayName: string
  tier: ImpactTier
  dollarsKeptLocal: number
  businessesSupported: number
  percentileRank: number
  shareText: string
  imageUrl: string
}

export interface Milestone {
  id: string
  type: 'dollars' | 'businesses' | 'reviews' | 'missions' | 'check_ins'
  threshold: number
  title: string
  description: string
  achieved_at: string | null
}
