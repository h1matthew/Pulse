/**
 * Mission Data Hooks
 *
 * React Query hooks for Boost Missions — gamified challenges that encourage
 * users to explore diverse local businesses (e.g., "Try 3 new coffee shops").
 *
 * MISSION LIFECYCLE: active → user completes required actions → progress
 * reaches target → mission marked complete → user claims reward.
 *
 * DESIGN RATIONALE: Mission progress is computed client-side from the raw
 * progress rows via `calculateProgressDetails()`, keeping the API simple
 * while supporting rich UI (progress bars, completion percentage).
 */
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useHydrationSafeQuery } from '@/hooks/useHydrationSafeQuery'
import type {
  BoostMission,
  BoostMissionWithCategory,
  UserMissionProgress,
  UserMissionProgressWithMission,
  MissionProgressDetails,
} from '@/types/mission'
import { MISSION_CONFIGS } from '@/types/mission'

// ============================================================================
// Query Keys
// ============================================================================

const missionKeys = {
  all: ['missions'] as const,
  lists: () => [...missionKeys.all, 'list'] as const,
  active: () => [...missionKeys.lists(), 'active'] as const,
  // Prefix covering every user's progress queries — invalidate this rather
  // than userProgress('') (an empty id is its own key and matches nothing).
  progress: () => [...missionKeys.all, 'progress'] as const,
  userProgress: (userId: string) => [...missionKeys.progress(), userId] as const,
  detail: (id: string) => [...missionKeys.all, 'detail', id] as const,
}

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchActiveMissions(): Promise<BoostMissionWithCategory[]> {
  const response = await fetch('/api/missions')
  if (!response.ok) throw new Error('Failed to fetch missions')
  return response.json()
}

async function fetchUserMissionProgress(userId: string): Promise<UserMissionProgressWithMission[]> {
  const response = await fetch('/api/missions/progress')
  if (!response.ok) throw new Error('Failed to fetch mission progress')
  return response.json()
}

// ============================================================================
// Mutations
// ============================================================================

async function startMission(missionId: string): Promise<UserMissionProgress> {
  const response = await fetch(`/api/missions/${missionId}/start`, {
    method: 'POST',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || 'Failed to start mission')
  }
  return response.json()
}

async function claimMissionReward(missionId: string): Promise<void> {
  const response = await fetch(`/api/missions/${missionId}/claim`, {
    method: 'POST',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to claim reward')
  }
}

async function trackMissionProgress(
  missionId: string,
  increment: number
): Promise<UserMissionProgress> {
  const response = await fetch(`/api/missions/${missionId}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ increment }),
  })
  if (!response.ok) throw new Error('Failed to track progress')
  return response.json()
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateProgressDetails(
  progress: UserMissionProgressWithMission
): MissionProgressDetails {
  const percentageComplete = Math.min(
    100,
    Math.round((progress.current_count / progress.mission.target_count) * 100)
  )

  const remainingCount = Math.max(0, progress.mission.target_count - progress.current_count)

  // Calculate days remaining
  let daysRemaining: number | null = null
  if (progress.mission.end_date) {
    const endDate = new Date(progress.mission.end_date)
    const now = new Date()
    daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }

  return {
    progress,
    percentageComplete,
    remainingCount,
    daysRemaining,
  }
}

// ============================================================================
// Hooks
// ============================================================================

export function useActiveMissions() {
  return useHydrationSafeQuery({
    queryKey: missionKeys.active(),
    queryFn: fetchActiveMissions,
    staleTime: 10 * 60 * 1000,
  })
}

export function useUserMissionProgress(userId: string) {
  return useHydrationSafeQuery({
    queryKey: missionKeys.userProgress(userId),
    queryFn: () => fetchUserMissionProgress(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useMissionProgressDetails(userId: string) {
  const { data: progress, ...rest } = useUserMissionProgress(userId)

  const progressDetails = progress?.map(calculateProgressDetails) || []

  // Separate into active and completed
  const activeMissions = progressDetails.filter(p => !p.progress.is_completed)
  const completedMissions = progressDetails.filter(p => p.progress.is_completed && !p.progress.reward_claimed)
  const claimedMissions = progressDetails.filter(p => p.progress.reward_claimed)

  return {
    progressDetails,
    activeMissions,
    completedMissions,
    claimedMissions,
    ...rest,
  }
}

/**
 * Enroll the signed-in user in a mission. Idempotent server-side, so firing
 * twice (double-click, retry) is harmless.
 */
export function useStartMission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: startMission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: missionKeys.progress() })
    },
  })
}

export function useClaimMissionReward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: claimMissionReward,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: missionKeys.progress() })
      queryClient.invalidateQueries({ queryKey: ['impact'] })
    },
  })
}

export function useTrackMissionProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ missionId, increment }: { missionId: string; increment: number }) =>
      trackMissionProgress(missionId, increment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: missionKeys.progress() })
    },
  })
}

// ============================================================================
// Mission Progression Helpers
// ============================================================================

export function useMissionProgression(userId: string) {
  const { activeMissions, completedMissions } = useMissionProgressDetails(userId)

  const totalMissions = activeMissions.length + completedMissions.length
  const completedCount = completedMissions.length
  const overallProgress = totalMissions > 0
    ? Math.round((completedCount / totalMissions) * 100)
    : 0

  // Find the mission closest to completion
  const nextCompletion = activeMissions
    .sort((a, b) => b.percentageComplete - a.percentageComplete)[0]

  return {
    totalMissions,
    completedCount,
    overallProgress,
    nextCompletion,
    hasClaimableRewards: completedMissions.length > 0,
  }
}
