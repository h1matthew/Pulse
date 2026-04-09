'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface ParallaxGlowProps {
  className?: string
  speed?: number
}

/**
 * A background glow element that moves at a different scroll speed
 * than the foreground content, creating a parallax depth effect.
 * Uses requestAnimationFrame for smooth 60fps animation.
 */
export function ParallaxGlow({ className, speed = 0.3 }: ParallaxGlowProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    let rafId: number

    function onScroll() {
      rafId = requestAnimationFrame(() => {
        if (ref.current) {
          const y = window.scrollY * speed
          ref.current.style.transform = `translate3d(0, ${y}px, 0)`
        }
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafId)
    }
  }, [speed])

  return (
    <div
      ref={ref}
      className={cn("pointer-events-none will-change-transform", className)}
      aria-hidden="true"
    />
  )
}
