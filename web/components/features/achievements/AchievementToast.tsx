'use client'

import { X, Trophy } from 'lucide-react'
import type { Achievement } from '@/types/achievements'
import { cn } from '@/lib/utils'

interface AchievementToastProps {
  achievement: Achievement
  index: number
  onDismiss: () => void
}

export function AchievementToast({ achievement, index, onDismiss }: AchievementToastProps) {
  return (
    <div
      className={cn(
        'relative flex items-center gap-3 rounded-lg border border-border/50 bg-card p-4 shadow-lg',
        'animate-fade-in-up',
        'min-w-[300px] max-w-[400px]'
      )}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Icon */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl">
        {achievement.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-0.5">
          <Trophy className="h-3 w-3" />
          Achievement Unlocked!
        </div>
        <p className="font-semibold text-foreground truncate">{achievement.title}</p>
        <p className="text-sm text-muted-foreground truncate">{achievement.description}</p>
      </div>

      {/* Points badge */}
      <div className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
        +{achievement.points}
      </div>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
