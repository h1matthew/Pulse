'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface OrbitRingProps {
  className?: string
  radius?: number
  duration?: number
  particleCount?: number
  particleSize?: number
  color?: string
  direction?: 'clockwise' | 'counterclockwise'
  children?: React.ReactNode
}

export function OrbitRing({
  className,
  radius = 100,
  duration = 20,
  particleCount = 3,
  particleSize = 8,
  color = 'oklch(0.65 0.2 250)',
  direction = 'clockwise',
  children,
}: OrbitRingProps) {
  const [rotation, setRotation] = useState(0)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    let lastTime = performance.now()
    const speed = direction === 'clockwise' ? 360 / (duration * 1000) : -360 / (duration * 1000)

    const animate = (currentTime: number) => {
      const delta = currentTime - lastTime
      lastTime = currentTime

      setRotation((prev) => (prev + speed * delta) % 360)
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [duration, direction])

  const particles = Array.from({ length: particleCount }, (_, i) => ({
    angle: (360 / particleCount) * i,
    id: i,
  }))

  return (
    <div
      className={cn('relative', className)}
      style={{
        width: radius * 2,
        height: radius * 2,
      }}
    >
      {/* Orbit path */}
      <div
        className="absolute rounded-full border border-dashed border-primary/20"
        style={{
          width: radius * 2,
          height: radius * 2,
          top: 0,
          left: 0,
        }}
      />

      {/* Rotating container */}
      <div
        className="absolute inset-0"
        style={{
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {particles.map((particle) => {
          const angleRad = (particle.angle * Math.PI) / 180
          const x = radius + radius * Math.cos(angleRad) - particleSize / 2
          const y = radius + radius * Math.sin(angleRad) - particleSize / 2

          return (
            <div
              key={particle.id}
              className="absolute rounded-full shadow-lg animate-pulse-soft"
              style={{
                width: particleSize,
                height: particleSize,
                left: x,
                top: y,
                backgroundColor: color,
                boxShadow: `0 0 ${particleSize * 2}px ${color}`,
              }}
            />
          )
        })}
      </div>

      {/* Center content */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}

// Multiple concentric orbit rings
interface OrbitSystemProps {
  className?: string
  rings?: Array<{
    radius: number
    duration: number
    particleCount: number
    color: string
    direction?: 'clockwise' | 'counterclockwise'
  }>
}

export function OrbitSystem({ className, rings }: OrbitSystemProps) {
  const defaultRings = [
    { radius: 60, duration: 15, particleCount: 2, color: 'oklch(0.65 0.2 250)', direction: 'clockwise' as const },
    { radius: 100, duration: 25, particleCount: 3, color: 'oklch(0.7 0.15 195)', direction: 'counterclockwise' as const },
    { radius: 140, duration: 35, particleCount: 4, color: 'oklch(0.6 0.18 280)', direction: 'clockwise' as const },
  ]

  const ringConfigs = rings || defaultRings
  const maxRadius = Math.max(...ringConfigs.map((r) => r.radius))

  return (
    <div
      className={cn('relative', className)}
      style={{
        width: maxRadius * 2,
        height: maxRadius * 2,
      }}
    >
      {ringConfigs.map((ring, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            left: maxRadius - ring.radius,
            top: maxRadius - ring.radius,
          }}
        >
          <OrbitRing
            radius={ring.radius}
            duration={ring.duration}
            particleCount={ring.particleCount}
            color={ring.color}
            direction={ring.direction}
            particleSize={6 + index * 2}
          />
        </div>
      ))}
    </div>
  )
}

// Decorative orbital ring for backgrounds
interface DecorativeOrbitProps {
  className?: string
}

export function DecorativeOrbit({ className }: DecorativeOrbitProps) {
  return (
    <div className={cn('absolute pointer-events-none', className)}>
      <OrbitSystem
        rings={[
          { radius: 80, duration: 20, particleCount: 2, color: 'oklch(0.65 0.2 250 / 0.6)', direction: 'clockwise' },
          { radius: 120, duration: 30, particleCount: 3, color: 'oklch(0.7 0.15 195 / 0.4)', direction: 'counterclockwise' },
        ]}
      />
    </div>
  )
}
