'use client'

import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Rocket } from 'lucide-react'

interface ScrollRocketProps {
  className?: string
}

export function ScrollRocket({ className }: ScrollRocketProps) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [velocity, setVelocity] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const lastScrollY = useRef(0)
  const lastScrollTime = useRef(performance.now())
  const lastDecayTime = useRef(performance.now())
  const isActive = useRef(true)
  const scrollRafId = useRef<number | null>(null)
  const decayRafId = useRef<number | null>(null)
  const scrollingTimeout = useRef<NodeJS.Timeout | null>(null)
  const currentVelocity = useRef(0)
  const currentScrollProgress = useRef(0)
  const isScrollingRef = useRef(false)
  const scrollEventPending = useRef(false)

  useEffect(() => {
    isActive.current = true

    const updateScrollProgress = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrolled = window.scrollY
      const progress = docHeight > 0 ? Math.min(scrolled / docHeight, 1) : 0
      const now = performance.now()
      const timeDelta = now - lastScrollTime.current

      // Calculate velocity instantly (pixels per second)
      if (timeDelta > 0 && timeDelta < 500) {
        const scrollDelta = Math.abs(scrolled - lastScrollY.current)
        const newVelocity = Math.round((scrollDelta / timeDelta) * 1000)
        if (newVelocity !== currentVelocity.current) {
          currentVelocity.current = newVelocity
          setVelocity(newVelocity)
        }
      }

      // Show flame instantly while scrolling
      if (scrollEventPending.current) {
        scrollEventPending.current = false
        if (!isScrollingRef.current) {
          isScrollingRef.current = true
          setIsScrolling(true)
        }
        if (scrollingTimeout.current) {
          clearTimeout(scrollingTimeout.current)
        }
        // Hide flame quickly after scrolling stops
        scrollingTimeout.current = setTimeout(() => {
          isScrollingRef.current = false
          setIsScrolling(false)
        }, 80)
      }

      if (progress !== currentScrollProgress.current) {
        currentScrollProgress.current = progress
        setScrollProgress(progress)
      }

      lastScrollY.current = scrolled
      lastScrollTime.current = now
      scrollRafId.current = null
    }

    const decayVelocity = (now: number) => {
      if (!isActive.current) return
      const dt = now - lastDecayTime.current
      lastDecayTime.current = now

      const timeSinceLastScroll = now - lastScrollTime.current
      if (timeSinceLastScroll > 80 && currentVelocity.current > 0) {
        const decayFactor = Math.pow(0.85, dt / 30)
        const newVelocity = Math.max(0, Math.floor(currentVelocity.current * decayFactor))
        if (newVelocity !== currentVelocity.current) {
          currentVelocity.current = newVelocity
          setVelocity(newVelocity)
        }
      }

      if (currentVelocity.current > 0) {
        decayRafId.current = requestAnimationFrame(decayVelocity)
      } else {
        decayRafId.current = null
      }
    }

    const scheduleDecay = () => {
      if (decayRafId.current !== null) return
      lastDecayTime.current = performance.now()
      decayRafId.current = requestAnimationFrame(decayVelocity)
    }

    const scheduleUpdate = () => {
      if (scrollRafId.current !== null) return
      scrollRafId.current = requestAnimationFrame(updateScrollProgress)
    }

    // Handle scroll events - batch updates per frame
    const handleScroll = () => {
      if (!isActive.current) return
      scrollEventPending.current = true
      scheduleUpdate()
      scheduleDecay()
    }

    // Initial calculation
    scheduleUpdate()
    // Retry after DOM is ready
    const initTimeout = setTimeout(scheduleUpdate, 100)

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleUpdate()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isActive.current = false
      clearTimeout(initTimeout)
      if (scrollingTimeout.current) {
        clearTimeout(scrollingTimeout.current)
      }
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', scheduleUpdate)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (scrollRafId.current !== null) {
        cancelAnimationFrame(scrollRafId.current)
      }
      if (decayRafId.current !== null) {
        cancelAnimationFrame(decayRafId.current)
      }
    }
  }, [])

  const altitude = Math.round(scrollProgress * 100)
  const isScrollingFast = velocity > 500
  const stage: 'ground' | 'atmosphere' | 'space' =
    scrollProgress < 0.2 ? 'ground' : scrollProgress < 0.6 ? 'atmosphere' : 'space'

  const getAtmosphereColor = () => {
    switch (stage) {
      case 'ground':
        return 'from-sky-400/20 via-sky-300/10 to-transparent'
      case 'atmosphere':
        return 'from-indigo-400/20 via-purple-300/10 to-transparent'
      case 'space':
        return 'from-primary/10 via-chart-2/5 to-transparent'
    }
  }

  const getRocketColor = () => {
    switch (stage) {
      case 'ground':
        return 'text-sky-500'
      case 'atmosphere':
        return 'text-indigo-500'
      case 'space':
        return 'text-primary'
    }
  }

  const getFlameIntensity = () => {
    const baseHeight = isScrollingFast ? 'h-16' : 'h-8'
    const atmosphereHeight = isScrollingFast ? 'h-20' : 'h-12'
    const spaceHeight = isScrollingFast ? 'h-14' : 'h-6'

    switch (stage) {
      case 'ground':
        return `${baseHeight} opacity-80`
      case 'atmosphere':
        return `${atmosphereHeight} opacity-90`
      case 'space':
        return `${spaceHeight} opacity-60`
    }
  }

  return (
    <div className={cn('fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-4', className)}>
      {/* Altitude indicator */}
      <div className="relative">
        {/* Track */}
        <div className="relative w-1 h-48 bg-muted/50 rounded-full overflow-hidden">
          {/* Progress fill - positioned at bottom to fill upward */}
          <div
            className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-sky-500 via-indigo-500 to-primary"
            style={{ height: `${scrollProgress * 100}%` }}
          />
        </div>

        {/* Rocket position indicator */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: `calc(${scrollProgress * 100}% - 16px)` }}
        >
          {/* Glow effect */}
          <div className={cn(
            'absolute inset-0 rounded-full blur-xl transition-colors duration-500',
            stage === 'ground' && 'bg-sky-500/30',
            stage === 'atmosphere' && 'bg-indigo-500/30',
            stage === 'space' && 'bg-primary/30'
          )} />

          {/* Rocket icon */}
          <div className={cn(
            'relative transition-colors duration-500',
            getRocketColor()
          )}>
            <Rocket className="w-6 h-6 rotate-[-45deg]" />

            {/* Flame effect - only show when scrolling */}
            {isScrolling && (
              <div className={cn(
                'absolute top-full left-1/2 -translate-x-1/2 w-3 bg-gradient-to-t from-orange-500 via-yellow-400 to-transparent rounded-full animate-flame-flicker',
                getFlameIntensity()
              )} />
            )}
          </div>
        </div>

        {/* Stage markers */}
        <div className="absolute -left-3 bottom-0 w-2 h-2 rounded-full bg-sky-500" title="Ground" />
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-500" title="Atmosphere" />
        <div className="absolute -left-3 top-0 w-2 h-2 rounded-full bg-primary" title="Space" />
      </div>

      {/* Altitude readout */}
      <div className="text-center">
        <div className="text-xs font-medium text-muted-foreground">ALTITUDE</div>
        <div className={cn(
          'text-lg font-bold tabular-nums transition-colors duration-500',
          stage === 'ground' && 'text-sky-500',
          stage === 'atmosphere' && 'text-indigo-500',
          stage === 'space' && 'text-primary'
        )}>
          {altitude}%
        </div>
      </div>

      {/* Velocity readout */}
      <div className="text-center">
        <div className="text-xs font-medium text-muted-foreground">VELOCITY</div>
        <div className={cn(
          'text-sm font-bold tabular-nums transition-colors duration-300',
          isScrollingFast ? 'text-orange-500' : 'text-muted-foreground'
        )}>
          {velocity}
          <span className="text-xs font-normal text-muted-foreground ml-0.5">px/s</span>
        </div>
      </div>

      {/* Stage label */}
      <div className={cn(
        'text-xs font-medium px-2 py-1 rounded-full transition-all duration-500',
        stage === 'ground' && 'bg-sky-500/10 text-sky-600',
        stage === 'atmosphere' && 'bg-indigo-500/10 text-indigo-600',
        stage === 'space' && 'bg-primary/10 text-primary'
      )}>
        {stage === 'ground' && 'Troposphere'}
        {stage === 'atmosphere' && 'Stratosphere'}
        {stage === 'space' && 'Space'}
      </div>
    </div>
  )
}

// Atmospheric layer background that changes with scroll
export function AtmosphericBackground({ className }: { className?: string }) {
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = Math.min(window.scrollY / docHeight, 1)
      setScrollProgress(progress)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Interpolate colors based on scroll progress
  const getBackgroundGradient = () => {
    if (scrollProgress < 0.3) {
      // Ground to atmosphere
      const t = scrollProgress / 0.3
      return `linear-gradient(to bottom,
        oklch(0.99 0.002 250) 0%,
        oklch(${0.99 - t * 0.1} ${0.002 + t * 0.01} ${250 - t * 20}) 50%,
        oklch(${0.96 - t * 0.1} ${0.005 + t * 0.02} ${250 - t * 30}) 100%)`
    } else if (scrollProgress < 0.7) {
      // Atmosphere
      const t = (scrollProgress - 0.3) / 0.4
      return `linear-gradient(to bottom,
        oklch(${0.89 - t * 0.2} ${0.012 + t * 0.01} ${230 - t * 40}) 0%,
        oklch(${0.86 - t * 0.25} ${0.025 + t * 0.005} ${220 - t * 50}) 50%,
        oklch(${0.83 - t * 0.3} ${0.03 + t * 0.01} ${210 - t * 60}) 100%)`
    } else {
      // Space
      const t = (scrollProgress - 0.7) / 0.3
      return `linear-gradient(to bottom,
        oklch(${0.69 - t * 0.4} ${0.022 - t * 0.01} ${170 - t * 20}) 0%,
        oklch(${0.61 - t * 0.35} ${0.025 - t * 0.01} ${160 - t * 20}) 50%,
        oklch(${0.53 - t * 0.3} ${0.03 - t * 0.01} ${150 - t * 20}) 100%)`
    }
  }

  return (
    <div
      className={cn('fixed inset-0 -z-30 transition-all duration-300 pointer-events-none', className)}
      style={{ background: getBackgroundGradient() }}
    />
  )
}
