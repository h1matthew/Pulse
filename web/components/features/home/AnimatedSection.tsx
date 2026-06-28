'use client'

import { cn } from '@/lib/utils'

type AnimationName =
  | 'fade-up'
  | 'rise-up'
  | 'fade-in'
  | 'fade-in-down'
  | 'fade-in-up'
  | 'slide-left'
  | 'slide-right'
  | 'scale-in'
  | 'fade-out-down'
  | 'fade-out-up'
  | 'scale-out'

interface AnimatedSectionProps {
  children: React.ReactNode
  animation?: AnimationName
  delay?: number
  className?: string
  once?: boolean
}

export function __resetEntranceLatchForTests() {}

export function AnimatedSection({
  children,
  className,
}: AnimatedSectionProps) {
  return (
    <div className={cn(className)}>
      {children}
    </div>
  )
}
