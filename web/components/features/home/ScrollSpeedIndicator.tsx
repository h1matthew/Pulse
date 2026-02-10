'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Gauge } from 'lucide-react'

export function ScrollSpeedIndicator() {
  const [velocity, setVelocity] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const lastScrollY = useRef(0)
  const lastScrollTime = useRef(performance.now())
  const lastDecayTime = useRef(performance.now())
  const rafId = useRef<number | null>(null)
  const decayRafId = useRef<number | null>(null)
  const isActive = useRef(true)
  const hideTimeout = useRef<NodeJS.Timeout | null>(null)
  const velocityRef = useRef(0)
  const isVisibleRef = useRef(false)

  const updateVelocity = useCallback(() => {
    const now = performance.now()
    const timeDelta = now - lastScrollTime.current

    if (timeDelta > 0) {
      const scrollDelta = Math.abs(window.scrollY - lastScrollY.current)
      const newVelocity = (scrollDelta / timeDelta) * 1000 // Convert to px/s
      const roundedVelocity = Math.round(newVelocity)
      if (roundedVelocity !== velocityRef.current) {
        velocityRef.current = roundedVelocity
        setVelocity(roundedVelocity)
      }

      // Show indicator when scrolling fast enough
      if (newVelocity > 0.5) {
        if (!isVisibleRef.current) {
          isVisibleRef.current = true
          setIsVisible(true)
        }
        if (hideTimeout.current) {
          clearTimeout(hideTimeout.current)
        }
        hideTimeout.current = setTimeout(() => {
          isVisibleRef.current = false
          setIsVisible(false)
        }, 1000)
      }
    }

    lastScrollY.current = window.scrollY
    lastScrollTime.current = now

    // Set up velocity decay for smooth deceleration
    if (decayRafId.current === null) {
      lastDecayTime.current = performance.now()
      decayRafId.current = requestAnimationFrame(function decay(now) {
        if (!isActive.current) return
        const dt = now - lastDecayTime.current
        lastDecayTime.current = now
        const timeSinceLastScroll = now - lastScrollTime.current
        if (timeSinceLastScroll > 100 && velocityRef.current > 0) {
          const decayFactor = Math.pow(0.8, dt / 50)
          const newVal = Math.max(0, Math.floor(velocityRef.current * decayFactor))
          if (newVal !== velocityRef.current) {
            velocityRef.current = newVal
            setVelocity(newVal)
          }
        }
        if (velocityRef.current > 0) {
          decayRafId.current = requestAnimationFrame(decay)
        } else {
          decayRafId.current = null
        }
      })
    }
  }, [])

  const handleScroll = useCallback(() => {
    if (rafId.current || !isActive.current) return

    rafId.current = requestAnimationFrame(() => {
      updateVelocity()
      rafId.current = null
    })
  }, [updateVelocity])

  useEffect(() => {
    isActive.current = true
    lastScrollY.current = window.scrollY

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      isActive.current = false
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current)
      }
      window.removeEventListener('scroll', handleScroll)
      if (rafId.current) cancelAnimationFrame(rafId.current)
      if (decayRafId.current) cancelAnimationFrame(decayRafId.current)
    }
  }, [handleScroll])

  // Convert velocity to Mach number (arbitrary scale for fun)
  // 1000 px/s = Mach 1
  const machNumber = (velocity / 1000).toFixed(1)
  const isSupersonic = velocity > 5000 // Mach 5+

  return (
    <div
      className={cn(
        'fixed bottom-8 right-8 z-40 flex items-center gap-2 px-4 py-2 rounded-full',
        'bg-background/80 backdrop-blur-md border shadow-lg',
        'transition-all duration-300 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
        isSupersonic ? 'border-orange-500/50 shadow-orange-500/20' : 'border-border/50'
      )}
    >
      <Gauge className={cn(
        'w-4 h-4 transition-colors duration-300',
        isSupersonic ? 'text-orange-500' : 'text-muted-foreground'
      )} />
      <div className="flex items-baseline gap-1">
        <span className={cn(
          'text-lg font-bold tabular-nums transition-colors duration-300',
          isSupersonic ? 'text-orange-500' : 'text-foreground'
        )}>
          Mach {machNumber}
        </span>
      </div>
      {isSupersonic && (
        <div className="absolute inset-0 rounded-full animate-pulse bg-orange-500/10" />
      )}
    </div>
  )
}
