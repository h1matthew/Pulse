'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface HomeWrapperProps {
  children: ReactNode
}

export function HomeWrapper({ children }: HomeWrapperProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <div
      className={cn(
        'relative min-h-screen overflow-hidden transition-colors duration-300',
        !mounted || resolvedTheme === 'dark'
          ? 'dark bg-[#0a0c10] text-white'
          : 'bg-white text-gray-900'
      )}
    >
      {children}
    </div>
  )
}
