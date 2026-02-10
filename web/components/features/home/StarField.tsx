'use client'

import { useEffect, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface Star {
  x: number
  y: number
  size: number
  opacity: number
  twinkleSpeed: number
  twinklePhase: number
  depth: number
}

interface StarFieldProps {
  className?: string
  starCount?: number
  minSize?: number
  maxSize?: number
  parallax?: boolean
  colors?: string[]
}

export function StarField({
  className,
  starCount = 100,
  minSize = 1,
  maxSize = 3,
  parallax = true,
  colors = ['#ffffff', '#e0e7ff', '#c7d2fe'],
}: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const animationRef = useRef<number>(0)
  const scrollRef = useRef(0)
  const timeRef = useRef(0)

  const stars = useMemo(() => {
    const newStars: Star[] = []
    for (let i = 0; i < starCount; i++) {
      newStars.push({
        x: Math.random(),
        y: Math.random(),
        size: minSize + Math.random() * (maxSize - minSize),
        opacity: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 1.5,
        twinklePhase: Math.random() * Math.PI * 2,
        depth: 0.2 + Math.random() * 0.8,
      })
    }
    return newStars
  }, [starCount, minSize, maxSize])

  useEffect(() => {
    starsRef.current = stars
  }, [stars])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let mounted = true

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const enableTwinkle = !prefersReducedMotion

    const resize = () => {
      if (!mounted) return
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      // Reset transform before scaling to prevent compounding
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }

    resize()
    window.addEventListener('resize', resize)

    const handleScroll = () => {
      if (parallax) {
        scrollRef.current = window.scrollY
      }
    }

    if (parallax) {
      window.addEventListener('scroll', handleScroll, { passive: true })
    }

    const animate = () => {
      if (!mounted) return

      const width = window.innerWidth
      const height = window.innerHeight

      ctx.clearRect(0, 0, width, height)

      timeRef.current += 0.016

      starsRef.current.forEach((star, i) => {
        // Calculate parallax offset
        const parallaxOffset = parallax ? scrollRef.current * star.depth * 0.3 : 0
        const y = (star.y * height - parallaxOffset) % height
        const normalizedY = y < 0 ? y + height : y

        // Calculate twinkle
        let opacity = star.opacity
        if (enableTwinkle) {
          const twinkle = Math.sin(timeRef.current * star.twinkleSpeed + star.twinklePhase)
          opacity = star.opacity * (0.5 + twinkle * 0.5)
        }

        // Draw star
        const x = star.x * width
        const color = colors[i % colors.length]

        ctx.beginPath()
        ctx.arc(x, normalizedY, star.size, 0, Math.PI * 2)
        ctx.fillStyle = color.replace(')', `, ${opacity})`).replace('rgb', 'rgba').replace('#', '')

        // Handle hex colors
        if (color.startsWith('#')) {
          const r = parseInt(color.slice(1, 3), 16)
          const g = parseInt(color.slice(3, 5), 16)
          const b = parseInt(color.slice(5, 7), 16)
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
        } else {
          ctx.fillStyle = color
        }

        ctx.fill()

        // Add glow for larger stars
        if (star.size > 2 && enableTwinkle) {
          const gradient = ctx.createRadialGradient(x, normalizedY, 0, x, normalizedY, star.size * 3)
          gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.3})`)
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.beginPath()
          ctx.arc(x, normalizedY, star.size * 3, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        }
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      mounted = false
      window.removeEventListener('resize', resize)
      if (parallax) {
        window.removeEventListener('scroll', handleScroll)
      }
      cancelAnimationFrame(animationRef.current)
      starsRef.current = []
    }
  }, [parallax, colors])

  return (
    <canvas
      ref={canvasRef}
      className={cn('pointer-events-none fixed inset-0', className)}
      style={{ opacity: 0.8 }}
    />
  )
}

// Seeded random number generator for consistent SSR/client rendering
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Simpler CSS-based star field for static backgrounds
interface StaticStarFieldProps {
  className?: string
  density?: 'low' | 'medium' | 'high'
}

export function StaticStarField({ className, density = 'medium' }: StaticStarFieldProps) {
  const starCounts = { low: 30, medium: 60, high: 100 }
  const count = starCounts[density]

  const stars = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // Use seeded random so server and client produce identical values
      const seed1 = i * 4 + 1
      const seed2 = i * 4 + 2
      const seed3 = i * 4 + 3
      const seed4 = i * 4 + 4
      const seed5 = i * 4 + 5

      // Round to fixed precision to ensure identical strings on server/client
      return {
        id: i,
        left: `${(seededRandom(seed1) * 100).toFixed(2)}%`,
        top: `${(seededRandom(seed2) * 100).toFixed(2)}%`,
        size: `${(1 + seededRandom(seed3) * 2).toFixed(2)}px`,
        delay: `${(seededRandom(seed4) * 3).toFixed(2)}s`,
        duration: `${(2 + seededRandom(seed5) * 2).toFixed(2)}s`,
      }
    })
  }, [count])

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white animate-star-twinkle"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            animationDelay: star.delay,
            animationDuration: star.duration,
            opacity: 0.3,
          }}
        />
      ))}
    </div>
  )
}
