'use client'

import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreakBadgeProps {
  className?: string
}

export function StreakBadge({ className }: StreakBadgeProps) {
  const [streak, setStreak] = useState<number | null>(null)
  const [isActiveToday, setIsActiveToday] = useState(false)

  useEffect(() => {
    async function fetchStreak() {
      try {
        const res = await fetch('/api/streaks')
        if (res.ok) {
          const data = await res.json()
          setStreak(data.currentStreak)
          setIsActiveToday(data.isActiveToday)
        }
      } catch {
        // Silently fail
      }
    }

    fetchStreak()
  }, [])

  if (streak === null || streak === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium',
        isActiveToday
          ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
          : 'bg-muted text-muted-foreground',
        className
      )}
      title={`${streak} day streak${isActiveToday ? ' - Active today!' : ' - Complete a lesson to keep it going!'}`}
    >
      <Flame
        className={cn(
          'h-4 w-4',
          isActiveToday && 'animate-pulse text-orange-500'
        )}
      />
      <span>{streak}</span>
    </div>
  )
}
