'use client'

import { useEffect, useRef, useState } from 'react'
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

/**
 * Scroll reveal used across all pages. Content starts in its hidden pose and
 * transitions into place when it enters the viewport — a single smooth
 * transition instead of replaying a keyframe animation, so sections never
 * flash visible-then-hidden while scrolling.
 */
const HIDDEN_CLASSES: Record<AnimationName, string> = {
  'fade-up': 'opacity-0 translate-y-10',
  // Pronounced bottom-up entrance: content climbs from well below its slot
  'rise-up': 'opacity-0 translate-y-24',
  'fade-in-up': 'opacity-0 translate-y-10',
  'fade-in-down': 'opacity-0 -translate-y-6',
  'fade-in': 'opacity-0',
  'slide-left': 'opacity-0 -translate-x-12',
  'slide-right': 'opacity-0 translate-x-12',
  'scale-in': 'opacity-0 scale-95',
  'fade-out-down': 'opacity-0 translate-y-10',
  'fade-out-up': 'opacity-0 -translate-y-10',
  'scale-out': 'opacity-0 scale-95',
}

const VISIBLE_CLASSES = 'opacity-100 translate-x-0 translate-y-0 scale-100'

export function AnimatedSection({
  children,
  animation = 'fade-up',
  delay = 0,
  className,
  once = true,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setIsVisible(true)
      return
    }

    const element = ref.current
    if (!element) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) {
            observer.unobserve(element)
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      // Reveal only once ~12% of the viewport height has passed under the
      // element, so the transition is actually visible while scrolling
      // instead of finishing off-screen.
      { threshold: 0.15, rootMargin: '0px 0px -12% 0px' }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [once])

  return (
    <div
      ref={ref}
      className={cn(
        'transition-[opacity,transform] duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        isVisible ? VISIBLE_CLASSES : HIDDEN_CLASSES[animation],
        className
      )}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  )
}
