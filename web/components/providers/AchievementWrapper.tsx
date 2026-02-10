'use client'

import { ReactNode, useEffect, useState } from 'react'
import { AchievementProvider } from './AchievementProvider'
import { NotificationStack } from '@/components/features/notifications/NotificationStack'
import { createClient } from '@/lib/supabase/client'

interface AchievementWrapperProps {
  children: ReactNode
}

export function AchievementWrapper({ children }: AchievementWrapperProps) {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Get initial user
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AchievementProvider userId={userId}>
      {children}
      <NotificationStack />
    </AchievementProvider>
  )
}
