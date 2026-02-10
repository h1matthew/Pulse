import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Query key factory for consistent cache management
export const userKeys = {
  all: ['user'] as const,
  progress: () => [...userKeys.all, 'progress'] as const,
  progressByModule: (moduleId: string) => [...userKeys.progress(), moduleId] as const,
  stats: () => [...userKeys.all, 'stats'] as const,
  achievements: () => [...userKeys.all, 'achievements'] as const,
  streaks: () => [...userKeys.all, 'streaks'] as const,
  leaderboard: (sortBy?: string) => ['leaderboard', sortBy || 'total_score'] as const,
  flashcards: (moduleId?: string) => [...userKeys.all, 'flashcards', moduleId] as const,
}

// Types
interface LessonProgress {
  lesson_id: string
  module_id: string
  completed: boolean
  quiz_score: number | null
  quiz_total: number | null
  completed_at: string | null
}

interface UserStats {
  lessonsCompleted: number
  modulesCompleted: number
  quizCount: number
  quizPerfectCount: number
  aiAskedCount: number
  modulesVisited: string[]
  flightLaunches: number
  orbitTransfers: number
  flightMaxAltitude: number
  flightMaxSpeed: number
  orbitMaxDistance: number
  currentStreak: number
}

interface Achievement {
  achievement_id: string
  unlocked_at: string
}

interface StreakData {
  current_streak: number
  longest_streak: number
  last_activity_date: string | null
}

interface LeaderboardEntry {
  id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  total_score: number
  achievements_count: number
  lessons_completed: number
}

interface CompleteLessonParams {
  lessonId: string
  moduleId: string
  quizScore?: number
  quizTotal?: number
}

// Fetch user progress (all or by module)
export function useProgress(moduleId?: string) {
  return useQuery({
    queryKey: moduleId ? userKeys.progressByModule(moduleId) : userKeys.progress(),
    queryFn: async (): Promise<LessonProgress[]> => {
      const url = moduleId
        ? `/api/lessons/progress?moduleId=${moduleId}`
        : '/api/lessons/progress'
      const res = await fetch(url)
      if (!res.ok) {
        if (res.status === 401) return [] // Not logged in
        throw new Error('Failed to fetch progress')
      }
      const data = await res.json()
      return data.progress || []
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Complete a lesson with optimistic update
export function useCompleteLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ lessonId, moduleId, quizScore, quizTotal }: CompleteLessonParams) => {
      const res = await fetch('/api/lessons/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          moduleId,
          completed: true,
          quizScore,
          quizTotal,
        }),
      })
      if (!res.ok) throw new Error('Failed to complete lesson')
      return res.json()
    },
    // Optimistic update - instantly update UI before server responds
    onMutate: async ({ lessonId, moduleId, quizScore, quizTotal }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.progress() })

      // Snapshot previous value
      const previousProgress = queryClient.getQueryData<LessonProgress[]>(userKeys.progress())

      // Optimistically update progress
      queryClient.setQueryData<LessonProgress[]>(userKeys.progress(), (old = []) => {
        const existing = old.find(p => p.lesson_id === lessonId)
        if (existing) {
          return old.map(p =>
            p.lesson_id === lessonId
              ? { ...p, completed: true, quiz_score: quizScore ?? null, quiz_total: quizTotal ?? null, completed_at: new Date().toISOString() }
              : p
          )
        }
        return [
          ...old,
          {
            lesson_id: lessonId,
            module_id: moduleId,
            completed: true,
            quiz_score: quizScore ?? null,
            quiz_total: quizTotal ?? null,
            completed_at: new Date().toISOString(),
          },
        ]
      })

      return { previousProgress }
    },
    // Rollback on error
    onError: (_err, _vars, context) => {
      if (context?.previousProgress) {
        queryClient.setQueryData(userKeys.progress(), context.previousProgress)
      }
    },
    // Refetch only essential data after success - reduce redundant API calls
    // Stats query already includes lesson count, so only invalidate that + streaks (which may have updated)
    // Achievements are checked separately via checkAchievements(), so no need to auto-refetch
    onSettled: () => {
      // Progress was already optimistically updated, just refetch to sync
      queryClient.invalidateQueries({ queryKey: userKeys.progress() })
      // Stats include lesson counts that may have changed
      queryClient.invalidateQueries({ queryKey: userKeys.stats() })
      // Streaks are updated server-side, need to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.streaks() })
      // Note: achievements are NOT auto-invalidated - they're checked via checkAchievements()
      // which has its own dedicated mutation. This reduces 4 API calls to 3.
    },
  })
}

// Fetch user stats
export function useStats() {
  return useQuery({
    queryKey: userKeys.stats(),
    queryFn: async (): Promise<UserStats | null> => {
      const res = await fetch('/api/stats')
      if (!res.ok) {
        if (res.status === 401) return null // Not logged in
        throw new Error('Failed to fetch stats')
      }
      const data = await res.json()
      return data.stats
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

// Fetch user achievements
export function useAchievements() {
  return useQuery({
    queryKey: userKeys.achievements(),
    queryFn: async (): Promise<Achievement[]> => {
      const res = await fetch('/api/achievements')
      if (!res.ok) {
        if (res.status === 401) return [] // Not logged in
        throw new Error('Failed to fetch achievements')
      }
      const data = await res.json()
      return data.achievements || []
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

// Unlock an achievement with optimistic update
export function useUnlockAchievement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (achievementId: string) => {
      const res = await fetch('/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievementId }),
      })
      if (!res.ok) {
        if (res.status === 409) return { alreadyUnlocked: true }
        throw new Error('Failed to unlock achievement')
      }
      return res.json()
    },
    onMutate: async (achievementId) => {
      await queryClient.cancelQueries({ queryKey: userKeys.achievements() })
      const previousAchievements = queryClient.getQueryData<Achievement[]>(userKeys.achievements())

      queryClient.setQueryData<Achievement[]>(userKeys.achievements(), (old = []) => {
        if (old.some(a => a.achievement_id === achievementId)) return old
        return [...old, { achievement_id: achievementId, unlocked_at: new Date().toISOString() }]
      })

      return { previousAchievements }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAchievements) {
        queryClient.setQueryData(userKeys.achievements(), context.previousAchievements)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.achievements() })
      queryClient.invalidateQueries({ queryKey: userKeys.stats() })
    },
  })
}

// Fetch user streaks
export function useStreaks() {
  return useQuery({
    queryKey: userKeys.streaks(),
    queryFn: async (): Promise<StreakData | null> => {
      const res = await fetch('/api/streaks')
      if (!res.ok) {
        if (res.status === 401) return null // Not logged in
        throw new Error('Failed to fetch streaks')
      }
      return res.json()
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Fetch leaderboard (public data, longer cache)
export function useLeaderboard(sortBy: 'total_score' | 'achievements_count' | 'lessons_completed' = 'total_score') {
  return useQuery({
    queryKey: userKeys.leaderboard(sortBy),
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const res = await fetch(`/api/leaderboard?sortBy=${sortBy}`)
      if (!res.ok) throw new Error('Failed to fetch leaderboard')
      const data = await res.json()
      return data.entries || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - public data can be cached longer
  })
}

// Fetch flashcard progress
export function useFlashcardProgress(moduleId?: string) {
  return useQuery({
    queryKey: userKeys.flashcards(moduleId),
    queryFn: async () => {
      const url = moduleId
        ? `/api/flashcards?moduleId=${moduleId}`
        : '/api/flashcards'
      const res = await fetch(url)
      if (!res.ok) {
        if (res.status === 401) return [] // Not logged in
        throw new Error('Failed to fetch flashcard progress')
      }
      const data = await res.json()
      return data.progress || []
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Update flashcard progress
export function useUpdateFlashcard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      flashcardId: string
      moduleId: string
      rating: 'again' | 'hard' | 'good' | 'easy'
      currentEaseFactor?: number
      currentInterval?: number
      currentRepetitions?: number
    }) => {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) throw new Error('Failed to update flashcard')
      return res.json()
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.flashcards(variables.moduleId) })
      queryClient.invalidateQueries({ queryKey: userKeys.flashcards() })
    },
  })
}
