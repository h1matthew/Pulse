'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import type { Achievement } from '@/types/achievements'
import { evaluateAchievements, type UserStats } from '@/lib/achievements/achievementChecker'

interface ToastItem {
  id: string
  achievement: Achievement
  createdAt: number
}

interface AchievementContextType {
  checkAchievements: () => Promise<Achievement[]>
  unlockedIds: Set<string>
  toasts: ToastItem[]
  dismissToast: (id: string) => void
}

const AchievementContext = createContext<AchievementContextType | null>(null)

export function useAchievements() {
  const context = useContext(AchievementContext)
  if (!context) {
    throw new Error('useAchievements must be used within AchievementProvider')
  }
  return context
}

interface AchievementProviderProps {
  children: ReactNode
  userId?: string | null
}

export function AchievementProvider({ children, userId }: AchievementProviderProps) {
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const unlockedIdsRef = useRef<Set<string>>(new Set())
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const checkingRef = useRef(false)

  // Keep ref in sync with state
  useEffect(() => {
    unlockedIdsRef.current = unlockedIds
  }, [unlockedIds])

  // Fetch user's unlocked achievements on mount
  useEffect(() => {
    if (!userId) return

    async function fetchUnlocked() {
      try {
        const res = await fetch('/api/achievements')
        if (res.ok) {
          const data = await res.json()
          const ids = new Set<string>(data.achievements?.map((a: { achievement_id: string }) => a.achievement_id) || [])
          setUnlockedIds(ids)
          unlockedIdsRef.current = ids
        }
      } catch {
        // Silently fail
      }
    }

    fetchUnlocked()
  }, [userId])

  // Auto-dismiss toasts - only create timers for new toasts
  useEffect(() => {
    toasts.forEach((toast) => {
      if (toastTimersRef.current.has(toast.id)) return

      const delay = 4000 + toastTimersRef.current.size * 500
      const timer = setTimeout(() => {
        toastTimersRef.current.delete(toast.id)
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, delay)
      toastTimersRef.current.set(toast.id, timer)
    })
  }, [toasts])

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach(clearTimeout)
      toastTimersRef.current.clear()
    }
  }, [])

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      toastTimersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const checkAchievements = useCallback(
    async (): Promise<Achievement[]> => {
      if (!userId) return []
      if (checkingRef.current) return []
      checkingRef.current = true

      try {
        const statsRes = await fetch('/api/stats')
        if (!statsRes.ok) return []

        const { stats } = await statsRes.json() as { stats: UserStats }

        // Read from ref to avoid stale closure data
        const newlyUnlocked = evaluateAchievements(stats, unlockedIdsRef.current)

        if (newlyUnlocked.length === 0) return []

        const successfullyUnlocked: Achievement[] = []

        for (const achievement of newlyUnlocked) {
          try {
            const res = await fetch('/api/achievements', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ achievementId: achievement.id }),
            })

            if (res.ok) {
              successfullyUnlocked.push(achievement)
              // Update ref immediately so concurrent calls see latest data
              unlockedIdsRef.current = new Set([...unlockedIdsRef.current, achievement.id])
              setUnlockedIds(new Set(unlockedIdsRef.current))

              setToasts((prev) => [
                ...prev,
                {
                  id: `${achievement.id}-${Date.now()}`,
                  achievement,
                  createdAt: Date.now(),
                },
              ])
            }
          } catch {
            // Failed to unlock - skip
          }
        }

        return successfullyUnlocked
      } catch {
        return []
      } finally {
        checkingRef.current = false
      }
    },
    [userId]
  )

  return (
    <AchievementContext.Provider
      value={{
        checkAchievements,
        unlockedIds,
        toasts,
        dismissToast,
      }}
    >
      {children}
    </AchievementContext.Provider>
  )
}
