'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedSectionProps {
  children: React.ReactNode
  animation?: 'fade-up' | 'fade-in' | 'fade-in-down' | 'fade-in-up' | 'slide-left' | 'slide-right' | 'scale-in' | 'fade-out-down' | 'fade-out-up' | 'scale-out'
  delay?: number
  className?: string
  once?: boolean
}

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
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once && ref.current) {
            observer.unobserve(ref.current)
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [once])

  const getAnimationClass = () => {
    if (!isVisible) {
      // Exit animations when scrolling out of view
      switch (animation) {
        case 'fade-out-down':
          return 'animate-fade-out-down'
        case 'fade-out-up':
          return 'animate-fade-out-up'
        case 'scale-out':
          return 'animate-scale-out'
        default:
          return 'opacity-100'
      }
    }

    switch (animation) {
      case 'fade-up':
        return 'animate-fade-in-up'
      case 'fade-in-up':
        return 'animate-fade-in-up'
      case 'fade-in-down':
        return 'animate-fade-in-down'
      case 'fade-in':
        return 'animate-fade-in'
      case 'slide-left':
        return 'animate-slide-in-left'
      case 'slide-right':
        return 'animate-slide-in-right'
      case 'scale-in':
        return 'animate-scale-in'
      case 'fade-out-down':
        return 'animate-fade-in-up'
      case 'fade-out-up':
        return 'animate-fade-in-up'
      case 'scale-out':
        return 'animate-scale-in'
      default:
        return 'animate-fade-in-up'
    }
  }

  return (
    <div
      ref={ref}
      className={cn(getAnimationClass(), className)}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  )
}
