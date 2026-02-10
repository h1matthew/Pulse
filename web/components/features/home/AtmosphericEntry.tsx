'use client'

import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface AtmosphericEntryProps {
  className?: string
}

export function AtmosphericEntry({ className }: AtmosphericEntryProps) {
  const [scrollVelocity, setScrollVelocity] = useState(0)
  const [isFastScroll, setIsFastScroll] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const lastScrollY = useRef(0)
  const lastTime = useRef(Date.now())
  const lastScrollTime = useRef(Date.now())
  const velocityTimeout = useRef<NodeJS.Timeout | null>(null)
  const rafId = useRef<number | null>(null)
  const decayRafId = useRef<number | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (rafId.current) return

      rafId.current = requestAnimationFrame(() => {
        const currentTime = Date.now()
        const currentScrollY = window.scrollY
        const timeDelta = currentTime - lastTime.current

        // Check if we're at page boundaries
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight
        const atTop = currentScrollY <= 0
        const atBottom = currentScrollY >= maxScroll - 5 // within 5px of bottom
        const atBoundary = atTop || atBottom

        if (timeDelta > 0) {
          const scrollDelta = Math.abs(currentScrollY - lastScrollY.current)

          // Skip velocity calculation if at boundary or scroll hasn't changed meaningfully
          if (atBoundary || scrollDelta < 1) {
            setScrollVelocity(0)
            setIsFastScroll(false)
            setShowWarning(false)
          } else {
            const velocity = scrollDelta / timeDelta // pixels per millisecond

            setScrollVelocity(velocity)

            // Fast scroll threshold: > 3 pixels per ms
            const isFast = velocity > 3
            setIsFastScroll(isFast)

            if (isFast) {
              setShowWarning(true)
              // Clear existing timeout
              if (velocityTimeout.current) {
                clearTimeout(velocityTimeout.current)
              }
              // Hide warning after scroll slows down
              velocityTimeout.current = window.setTimeout(() => {
                setShowWarning(false)
              }, 1500) as unknown as NodeJS.Timeout
            }
          }
        }

        lastScrollY.current = currentScrollY
        lastTime.current = currentTime
        lastScrollTime.current = currentTime
        rafId.current = null
      })
    }

    // Velocity decay loop - reduces velocity when scrolling stops
    const decayLoop = () => {
      const now = Date.now()
      const timeSinceLastScroll = now - lastScrollTime.current

      // Check if at boundary
      const currentScrollY = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const atTop = currentScrollY <= 0
      const atBottom = currentScrollY >= maxScroll - 5
      const atBoundary = atTop || atBottom

      // Reset velocity if at boundary or no scroll events for 100ms
      if (atBoundary || timeSinceLastScroll > 100) {
        setScrollVelocity(prev => {
          // If at boundary, immediately reset
          if (atBoundary) {
            setIsFastScroll(false)
            setShowWarning(false)
            return 0
          }

          const decayed = prev * 0.95
          if (decayed < 0.01) {
            setIsFastScroll(false)
            setShowWarning(false)
            return 0
          }
          // Update fast scroll state based on decayed velocity
          const isFast = decayed > 3
          setIsFastScroll(isFast)
          if (!isFast) {
            setShowWarning(false)
          }
          return decayed
        })
      }

      decayRafId.current = requestAnimationFrame(decayLoop)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    decayRafId.current = requestAnimationFrame(decayLoop)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId.current) cancelAnimationFrame(rafId.current)
      if (decayRafId.current) cancelAnimationFrame(decayRafId.current)
      if (velocityTimeout.current) window.clearTimeout(velocityTimeout.current)
    }
  }, [])

  // Calculate heat intensity based on velocity
  const heatIntensity = Math.min(scrollVelocity / 10, 1)

  return (
    <>
      {/* Heat glow overlay at viewport edges */}
      <div
        className={cn(
          'fixed inset-0 pointer-events-none z-50 transition-opacity duration-300',
          isFastScroll ? 'opacity-100' : 'opacity-0',
          className
        )}
      >
        {/* Top edge heat */}
        <div
          className="absolute top-0 left-0 right-0 h-32 animate-plasma-flicker"
          style={{
            background: `linear-gradient(to bottom, oklch(0.7 0.3 30 / ${heatIntensity * 0.4}), transparent)`,
            filter: 'blur(20px)',
          }}
        />

        {/* Bottom edge heat */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 animate-plasma-flicker"
          style={{
            background: `linear-gradient(to top, oklch(0.7 0.3 30 / ${heatIntensity * 0.4}), transparent)`,
            filter: 'blur(20px)',
            animationDelay: '0.15s',
          }}
        />

        {/* Side edges heat */}
        <div
          className="absolute top-0 left-0 bottom-0 w-24 animate-plasma-flicker"
          style={{
            background: `linear-gradient(to right, oklch(0.7 0.3 30 / ${heatIntensity * 0.3}), transparent)`,
            filter: 'blur(20px)',
            animationDelay: '0.1s',
          }}
        />
        <div
          className="absolute top-0 right-0 bottom-0 w-24 animate-plasma-flicker"
          style={{
            background: `linear-gradient(to left, oklch(0.7 0.3 30 / ${heatIntensity * 0.3}), transparent)`,
            filter: 'blur(20px)',
            animationDelay: '0.2s',
          }}
        />

        {/* Plasma particles */}
        {isFastScroll && (
          <PlasmaParticles intensity={heatIntensity} />
        )}
      </div>

      {/* Warning indicator */}
      <div
        className={cn(
          'fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300',
          showWarning
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/20 border border-orange-500/30 backdrop-blur-sm">
          {/* Warning icon */}
          <svg
            className="w-4 h-4 text-orange-500 animate-pulse"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
            Slow down for safe landing
          </span>
        </div>
      </div>
    </>
  )
}

// Plasma particle effects
function PlasmaParticles({ intensity }: { intensity: number }) {
  const [particles, setParticles] = useState<Array<{
    id: number
    x: number
    y: number
    size: number
    duration: number
    delay: number
  }>>([])

  useEffect(() => {
    const particleCount = Math.floor(intensity * 20) + 5
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 6,
      duration: 0.5 + Math.random() * 0.5,
      delay: Math.random() * 0.3,
    }))
    setParticles(newParticles)
  }, [intensity])

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full animate-plasma-flicker"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            background: `radial-gradient(circle, oklch(0.8 0.3 40), oklch(0.7 0.3 30 / 0.5))`,
            boxShadow: `0 0 ${particle.size * 2}px oklch(0.7 0.3 30 / 0.8)`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

// Speed indicator component
export function ScrollSpeedIndicator({ className }: { className?: string }) {
  const [velocity, setVelocity] = useState(0)
  const lastScrollY = useRef(0)
  const lastTime = useRef(Date.now())
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (rafId.current) return

      rafId.current = requestAnimationFrame(() => {
        const currentTime = Date.now()
        const currentScrollY = window.scrollY
        const timeDelta = currentTime - lastTime.current

        // Check if at page boundaries
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight
        const atTop = currentScrollY <= 0
        const atBottom = currentScrollY >= maxScroll - 5
        const atBoundary = atTop || atBottom

        if (timeDelta > 0) {
          const scrollDelta = Math.abs(currentScrollY - lastScrollY.current)

          // Reset velocity at boundaries or if no meaningful scroll
          if (atBoundary || scrollDelta < 1) {
            setVelocity(0)
          } else {
            const newVelocity = scrollDelta / timeDelta
            setVelocity(newVelocity)
          }
        }

        lastScrollY.current = currentScrollY
        lastTime.current = currentTime
        rafId.current = null
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [])

  // Calculate Mach number (just for fun, assuming 1px/ms = Mach 1)
  const machNumber = (velocity / 10).toFixed(1)
  const isSupersonic = velocity > 5

  return (
    <div
      className={cn(
        'fixed bottom-8 right-8 z-40 hidden lg:block transition-all duration-300',
        velocity > 0.5 ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      <div className={cn(
        'px-3 py-2 rounded-lg border backdrop-blur-sm transition-colors duration-300',
        isSupersonic
          ? 'bg-orange-500/10 border-orange-500/30'
          : 'bg-background/80 border-border/50'
      )}>
        <div className="text-xs text-muted-foreground">Scroll Velocity</div>
        <div className={cn(
          'text-lg font-bold tabular-nums',
          isSupersonic ? 'text-orange-500' : 'text-foreground'
        )}>
          Mach {machNumber}
        </div>
      </div>
    </div>
  )
}
