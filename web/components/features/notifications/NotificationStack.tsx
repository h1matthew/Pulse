'use client'

import { useAchievements } from '@/components/providers/AchievementProvider'
import { AchievementToast } from '@/components/features/achievements/AchievementToast'

export function NotificationStack() {
  const { toasts, dismissToast } = useAchievements()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto"
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          <AchievementToast
            achievement={toast.achievement}
            index={index}
            onDismiss={() => dismissToast(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}
