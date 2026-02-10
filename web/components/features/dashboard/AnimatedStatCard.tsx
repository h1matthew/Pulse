'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedStatCardProps {
  icon: React.ReactNode
  value: number
  suffix?: string
  label: string
  description: string
  delay?: number
}

export function AnimatedStatCard({
  icon,
  value,
  suffix = '',
  label,
  description,
  delay = 0,
}: AnimatedStatCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (!hasAnimated.current) {
            hasAnimated.current = true
            // Start count animation
            if (prefersReducedMotion) {
              setDisplayValue(value)
            } else {
              animateCount(value, delay)
            }
          }
        }
      },
      { threshold: 0.2 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [value, delay])

  const animateCount = (target: number, delayMs: number) => {
    const duration = 1000
    const startTime = performance.now() + delayMs * 1000

    const step = (currentTime: number) => {
      if (currentTime < startTime) {
        requestAnimationFrame(step)
        return
      }

      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Spring easing: cubic-bezier(0.34, 1.56, 0.64, 1)
      const eased = 1 - Math.pow(1 - progress, 3) * (1 - progress * 0.5)

      setDisplayValue(Math.round(eased * target))

      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }

    requestAnimationFrame(step)
  }

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
        isVisible ? 'animate-grid-item opacity-100' : 'opacity-0'
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3 transition-transform duration-300 hover:scale-110">
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">
        {displayValue}{suffix}
      </p>
      <p className="text-sm font-medium text-foreground mt-1">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
