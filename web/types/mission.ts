import type { Json } from './database.types'

// ============================================================================
// Mission Types
// ============================================================================

export type MissionType =
  | 'visit_count'
  | 'category_explore'
  | 'review_count'
  | 'bookmark_count'
  | 'spend_amount'

export interface BoostMission {
  id: string
  title: string
  description: string
  mission_type: MissionType
  target_count: number
  target_category_id: string | null
  reward_deal_id: string | null
  reward_description: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
}

export interface BoostMissionWithCategory extends BoostMission {
  category: {
    id: string
    name: string
    slug: string
    icon: string
  } | null
}

// ============================================================================
// Mission Progress Types
// ============================================================================

export interface UserMissionProgress {
  id: string
  mission_id: string
  user_id: string
  current_count: number
  is_completed: boolean
  completed_at: string | null
  reward_claimed: boolean
  reward_claimed_at: string | null
  created_at: string
  updated_at: string
}

export interface UserMissionProgressWithMission extends UserMissionProgress {
  mission: BoostMissionWithCategory
}

export interface MissionProgressDetails {
  progress: UserMissionProgressWithMission
  percentageComplete: number
  remainingCount: number
  daysRemaining: number | null
}

// ============================================================================
// Mission Configuration
// ============================================================================

export interface MissionConfig {
  missionType: MissionType
  title: string
  description: string
  defaultTargetCount: number
  icon: string
  color: string
}

export const MISSION_CONFIGS: Record<MissionType, MissionConfig> = {
  visit_count: {
    missionType: 'visit_count',
    title: 'Local Explorer',
    description: 'Visit {target} different local businesses',
    defaultTargetCount: 3,
    icon: '📍',
    color: 'oklch(0.65 0.16 250)',
  },
  category_explore: {
    missionType: 'category_explore',
    title: 'Category Explorer',
    description: 'Try {target} businesses in a specific category',
    defaultTargetCount: 3,
    icon: '🎯',
    color: 'oklch(0.7 0.18 85)',
  },
  review_count: {
    missionType: 'review_count',
    title: 'Community Voice',
    description: 'Leave {target} thoughtful reviews',
    defaultTargetCount: 3,
    icon: '⭐',
    color: 'oklch(0.65 0.16 45)',
  },
  bookmark_count: {
    missionType: 'bookmark_count',
    title: 'Support Local',
    description: 'Bookmark {target} businesses you want to support',
    defaultTargetCount: 10,
    icon: '🔖',
    color: 'oklch(0.6 0.18 175)',
  },
  spend_amount: {
    missionType: 'spend_amount',
    title: 'Big Spender',
    description: 'Spend ${target} at local businesses',
    defaultTargetCount: 100,
    icon: '💰',
    color: 'oklch(0.65 0.14 145)',
  },
}

// ============================================================================
// Active Mission Display
// ============================================================================

export interface ActiveMission {
  id: string
  title: string
  description: string
  missionType: MissionType
  targetCount: number
  currentCount: number
  percentageComplete: number
  rewardDescription: string
  endDate: string | null
  daysRemaining: number | null
  categoryName?: string
  categoryIcon?: string
}

export interface MissionCompletion {
  missionId: string
  missionTitle: string
  rewardDescription: string
  completedAt: string
  claimed: boolean
}
