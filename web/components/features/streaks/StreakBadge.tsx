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
        'flex items-center gap-1.5 rounded-sm border border-border px-2 py-0.5 font-mono text-meta tabular-nums',
        isActiveToday ? 'text-foreground' : 'text-muted-foreground',
        className
      )}
      title={`${streak} day streak${isActiveToday ? ' - Active today!' : ' - Complete a lesson to keep it going!'}`}
    >
      <Flame className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{streak}</span>
    </div>
  )
}
