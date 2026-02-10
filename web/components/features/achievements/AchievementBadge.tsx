'use client'

import type { Achievement, AchievementCategory } from '@/types/achievements'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'

const CATEGORY_COLORS: Record<AchievementCategory, string> = {
  learning: 'from-blue-500 to-cyan-600',
  mastery: 'from-purple-500 to-pink-600',
  explorer: 'from-green-500 to-emerald-600',
  simulator: 'from-orange-500 to-red-600',
  streak: 'from-amber-500 to-orange-600',
  flashcards: 'from-teal-500 to-cyan-600',
}

interface AchievementBadgeProps {
  achievement: Achievement
  isUnlocked: boolean
  size?: 'sm' | 'md' | 'lg'
  delay?: number
}

export function AchievementBadge({ achievement, isUnlocked, size = 'md', delay = 0 }: AchievementBadgeProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  }

  const iconSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  }

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay * 1000)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          'relative rounded-full flex items-center justify-center transition-all duration-700 ease-out',
          sizeClasses[size],
          isUnlocked
            ? `bg-gradient-to-br ${CATEGORY_COLORS[achievement.category]} shadow-lg`
            : 'bg-muted',
          // Bubble animation states
          !isVisible && 'opacity-0 translate-y-8 scale-75',
          isVisible && 'opacity-100 translate-y-0 scale-100',
          isVisible && 'animate-bubble-float'
        )}
        style={{
          animationDelay: `${delay}s`,
          animationDuration: '3s',
        }}
      >
        {isUnlocked ? (
          <span className={cn(
            iconSizes[size],
            'transition-transform duration-500',
            isVisible && 'animate-bubble-bounce'
          )}
          style={{ animationDelay: `${delay + 0.1}s` }}
          >{achievement.icon}</span>
        ) : (
          <Lock className="h-6 w-6 text-muted-foreground" />
        )}

        {/* Points badge */}
        {isUnlocked && (
          <div className={cn(
            "absolute -bottom-1 -right-1 rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground transition-all duration-500",
            !isVisible && 'scale-0',
            isVisible && 'scale-100 animate-bubble-pop'
          )}
          style={{ animationDelay: `${delay + 0.3}s` }}
          >
            +{achievement.points}
          </div>
        )}
      </div>

      <div className="text-center max-w-[100px]">
        <p className={cn(
          'text-sm font-medium truncate',
          isUnlocked ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {achievement.title}
        </p>
        {size !== 'sm' && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {achievement.description}
          </p>
        )}
      </div>
    </div>
  )
}
