'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

interface Star {
  x: number
  y: number
  size: number
  baseOpacity: number
  twinkleSpeed: number
  twinklePhase: number
  depth: number // 0-1, affects parallax speed
  // Pre-computed color RGB values to avoid parsing in animation loop
  r: number
  g: number
  b: number
}

interface SpaceBackgroundProps {
  className?: string
}

// Seeded random number generator for consistent SSR/client rendering
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Pre-computed color palette with RGB values
const STAR_COLORS = [
  { hex: '#ffffff', r: 255, g: 255, b: 255 },
  { hex: '#e0e7ff', r: 224, g: 231, b: 255 },
  { hex: '#c7d2fe', r: 199, g: 210, b: 254 },
  { hex: '#a5b4fc', r: 165, g: 180, b: 252 },
]

/**
 * SpaceBackground - Animated space background with twinkling stars, nebula, and scroll parallax
 *
 * Layers (back to front):
 * 1. Deep space gradient (dark base)
 * 2. Canvas-based star field with twinkling animation and scroll parallax
 * 3. Nebula clouds (subtle colored gradients with drift and scroll parallax)
 */
export function SpaceBackground({ className }: SpaceBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nebulaContainerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const timeRef = useRef(0)
  const scrollRef = useRef(0)
  const sizeRef = useRef({ width: 0, height: 0 })
  const lastFrameTimeRef = useRef(0)
  const [mounted, setMounted] = useState(false)

  // Use fixed star count for SSR compatibility
  const starCount = 100

  const stars = useMemo(() => {
    const newStars: Star[] = []
    for (let i = 0; i < starCount; i++) {
      // Use seeded random for consistent server/client rendering
      const seed = i * 7
      // Pre-compute color for this star (avoids parsing hex in animation loop)
      const color = STAR_COLORS[i % STAR_COLORS.length]
      newStars.push({
        x: seededRandom(seed + 1),
        y: seededRandom(seed + 2),
        size: 0.5 + seededRandom(seed + 3) * 2,
        baseOpacity: 0.3 + seededRandom(seed + 4) * 0.7,
        twinkleSpeed: 0.3 + seededRandom(seed + 5) * 0.8,
        twinklePhase: seededRandom(seed + 6) * Math.PI * 2,
        depth: 0.2 + seededRandom(seed + 7) * 0.8, // Depth for parallax (0.2-1.0)
        // Pre-computed RGB values
        r: color.r,
        g: color.g,
        b: color.b,
      })
    }
    return newStars
  }, [starCount])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const targetFps = prefersReducedMotion ? 0 : 30
    const frameInterval = targetFps > 0 ? 1000 / targetFps : 0

    const resize = () => {
      const dpr = prefersReducedMotion ? 1 : Math.min(window.devicePixelRatio, 1.5)
      sizeRef.current.width = window.innerWidth
      sizeRef.current.height = window.innerHeight
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // Throttled scroll handler - uses direct DOM manipulation instead of state
    let scrollTicking = false
    const handleScroll = () => {
      if (!scrollTicking) {
        requestAnimationFrame(() => {
          scrollRef.current = window.scrollY
          // Update nebula offset via direct DOM manipulation (avoids React re-render)
          if (!prefersReducedMotion && nebulaContainerRef.current) {
            const scrollY = window.scrollY
            const nebulas = nebulaContainerRef.current.children
            if (nebulas[0]) (nebulas[0] as HTMLElement).style.transform = `translateY(${scrollY * 0.05}px)`
            if (nebulas[1]) (nebulas[1] as HTMLElement).style.transform = `translateY(${scrollY * 0.08}px)`
            if (nebulas[2]) (nebulas[2] as HTMLElement).style.transform = `translateY(${scrollY * 0.12}px)`
          }
          scrollTicking = false
        })
        scrollTicking = true
      }
    }

    const drawFrame = (now: number) => {
      const elapsed = now - lastFrameTimeRef.current
      if (targetFps > 0 && elapsed < frameInterval) {
        animationRef.current = requestAnimationFrame(drawFrame)
        return
      }
      lastFrameTimeRef.current = now

      const width = sizeRef.current.width
      const height = sizeRef.current.height

      ctx.clearRect(0, 0, width, height)

      // Update time for animation
      const deltaSeconds = elapsed > 0 ? elapsed / 1000 : 0.016
      timeRef.current += deltaSeconds

      const scrollY = scrollRef.current

      stars.forEach((star) => {
        // Apply parallax - deeper stars move slower
        const parallaxOffset = prefersReducedMotion ? 0 : scrollY * star.depth * 0.1

        const x = star.x * width
        // Wrap stars vertically with parallax
        let y = (star.y * height - parallaxOffset) % height
        if (y < 0) y += height

        // Use pre-computed RGB values (no hex parsing needed)
        const { r, g, b } = star

        // Calculate twinkling opacity
        let opacity = star.baseOpacity
        if (!prefersReducedMotion) {
          const twinkle = Math.sin(timeRef.current * star.twinkleSpeed + star.twinklePhase)
          opacity = star.baseOpacity * (0.5 + twinkle * 0.5)
        }

        ctx.beginPath()
        ctx.arc(x, y, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
        ctx.fill()

        // Add subtle glow for larger stars
        if (star.size > 1.5) {
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, star.size * 3)
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity * 0.3})`)
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.beginPath()
          ctx.arc(x, y, star.size * 3, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        }
      })

      if (targetFps > 0) {
        animationRef.current = requestAnimationFrame(drawFrame)
      }
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', handleScroll, { passive: true })
    lastFrameTimeRef.current = performance.now()
    if (targetFps > 0) {
      animationRef.current = requestAnimationFrame(drawFrame)
    } else {
      drawFrame(performance.now())
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && targetFps > 0) {
        lastFrameTimeRef.current = performance.now()
        animationRef.current = requestAnimationFrame(drawFrame)
      } else if (document.visibilityState !== 'visible') {
        cancelAnimationFrame(animationRef.current)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      cancelAnimationFrame(animationRef.current)
    }
  }, [mounted, stars])

  return (
    <div className={cn('fixed inset-0 -z-10 overflow-hidden', className)}>
      {/* Deep space gradient base */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />

      {mounted && (
        <>
          {/* Star field canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ opacity: 0.9 }}
          />

          {/* Nebula clouds with drift animation and scroll parallax */}
          <div ref={nebulaContainerRef} className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Deep purple nebula - top left (moves slow) */}
            <div
              className="absolute -top-[20%] -left-[10%] h-[600px] w-[600px] animate-drift"
              style={{
                backgroundImage: 'radial-gradient(circle, oklch(0.4 0.12 280 / 0.06), transparent 60%)',
                filter: 'blur(100px)',
                transform: 'translateY(0px)',
              }}
            />

            {/* Teal nebula - bottom right (moves medium) */}
            <div
              className="absolute -bottom-[10%] -right-[5%] h-[500px] w-[500px] animate-drift [animation-delay:-15s]"
              style={{
                backgroundImage: 'radial-gradient(circle, oklch(0.5 0.1 195 / 0.04), transparent 60%)',
                filter: 'blur(80px)',
                transform: 'translateY(0px)',
              }}
            />

            {/* Blue accent nebula - center right (moves faster) */}
            <div
              className="absolute top-[40%] -right-[10%] h-[400px] w-[400px] animate-drift [animation-delay:-25s]"
              style={{
                backgroundImage: 'radial-gradient(circle, oklch(0.5 0.12 250 / 0.04), transparent 60%)',
                filter: 'blur(70px)',
                transform: 'translateY(0px)',
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
