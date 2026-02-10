'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface ParallaxLayerProps {
  children: React.ReactNode
  speed?: number
  className?: string
}

export function ParallaxLayer({ children, speed = 0.5, className }: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const rafRef = useRef<number>(undefined)
  const lastScrollRef = useRef(0)

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const handleScroll = () => {
      if (rafRef.current) return

      rafRef.current = requestAnimationFrame(() => {
        const scrollY = window.scrollY
        // Only update if scroll changed significantly
        if (Math.abs(scrollY - lastScrollRef.current) > 1) {
          setOffset(scrollY * speed)
          lastScrollRef.current = scrollY
        }
        rafRef.current = undefined
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [speed])

  return (
    <div
      ref={ref}
      className={cn('will-change-transform', className)}
      style={{
        transform: `translateY(${offset}px)`,
      }}
    >
      {children}
    </div>
  )
}
