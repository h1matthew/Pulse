'use client'

import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface OrbitalPathsProps {
  className?: string
}

interface Satellite {
  id: number
  orbitRadius: number
  orbitDuration: number
  size: number
  color: string
  startAngle: number
}

export function OrbitalPaths({ className }: OrbitalPathsProps) {
  const [satellites] = useState<Satellite[]>([
    {
      id: 1,
      orbitRadius: 120,
      orbitDuration: 20,
      size: 6,
      color: 'oklch(0.65 0.2 250)',
      startAngle: 0,
    },
    {
      id: 2,
      orbitRadius: 180,
      orbitDuration: 30,
      size: 4,
      color: 'oklch(0.7 0.15 195)',
      startAngle: 120,
    },
    {
      id: 3,
      orbitRadius: 240,
      orbitDuration: 45,
      size: 5,
      color: 'oklch(0.75 0.12 280)',
      startAngle: 240,
    },
  ])

  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden pointer-events-none',
        className
      )}
    >
      {/* Orbital paths */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.65 0.2 250 / 0.3)" />
            <stop offset="50%" stopColor="oklch(0.7 0.15 195 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.75 0.12 280 / 0.1)" />
          </linearGradient>
        </defs>

        {/* Orbital rings */}
        {satellites.map((sat) => (
          <ellipse
            key={`orbit-${sat.id}`}
            cx="50"
            cy="50"
            rx={sat.orbitRadius / 4}
            ry={sat.orbitRadius / 6}
            fill="none"
            stroke="url(#orbitGradient)"
            strokeWidth="0.2"
            strokeDasharray="2 2"
            opacity="0.5"
            style={{
              transformOrigin: 'center',
              transform: `rotate(${sat.startAngle}deg)`,
            }}
          />
        ))}
      </svg>

      {/* Satellites */}
      {satellites.map((sat) => (
        <OrbitingSatellite key={sat.id} satellite={sat} />
      ))}

      {/* Central body (planet/rocket) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className="w-4 h-4 rounded-full animate-pulse-soft"
          style={{
            background: 'radial-gradient(circle, oklch(0.65 0.2 250), oklch(0.45 0.18 250))',
            boxShadow: '0 0 20px oklch(0.65 0.2 250 / 0.5)',
          }}
        />
      </div>
    </div>
  )
}

function OrbitingSatellite({ satellite }: { satellite: Satellite }) {
  const [angle, setAngle] = useState(satellite.startAngle)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    let lastTime = Date.now()

    const animate = () => {
      const currentTime = Date.now()
      const deltaTime = (currentTime - lastTime) / 1000
      lastTime = currentTime

      // Calculate angle based on orbit duration
      const angularVelocity = 360 / satellite.orbitDuration // degrees per second
      setAngle((prev) => (prev + angularVelocity * deltaTime) % 360)

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [satellite.orbitDuration])

  // Convert angle to position
  const radians = (angle * Math.PI) / 180
  const x = 50 + (satellite.orbitRadius / 4) * Math.cos(radians)
  const y = 50 + (satellite.orbitRadius / 6) * Math.sin(radians)

  // Calculate if satellite is "near" content (center of screen)
  const isNearContent = Math.abs(y - 50) < 10

  return (
    <div
      className="absolute transition-all duration-300"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        className={cn(
          'rounded-full transition-all duration-500',
          isNearContent && 'animate-satellite-glow'
        )}
        style={{
          width: satellite.size,
          height: satellite.size,
          background: satellite.color,
          boxShadow: isNearContent
            ? `0 0 ${satellite.size * 3}px ${satellite.color}`
            : `0 0 ${satellite.size}px ${satellite.color}80`,
        }}
      />

      {/* Trail effect */}
      <div
        className="absolute inset-0 rounded-full opacity-50"
        style={{
          background: `radial-gradient(circle, ${satellite.color}, transparent)`,
          transform: 'scale(2)',
          filter: 'blur(2px)',
        }}
      />
    </div>
  )
}

// Constellation lines between feature cards
interface ConstellationLinesProps {
  cardRefs: React.RefObject<(HTMLDivElement | null)[]>
  className?: string
}

export function ConstellationLines({ cardRefs, className }: ConstellationLinesProps) {
  const [lines, setLines] = useState<
    Array<{
      id: number
      x1: number
      y1: number
      x2: number
      y2: number
      opacity: number
    }>
  >([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const calculateLines = () => {
      if (!containerRef.current || !cardRefs.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const cards = cardRefs.current.filter(Boolean)

      const newLines: typeof lines = []
      let lineId = 0

      // Connect nearby cards
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const card1 = cards[i]
          const card2 = cards[j]

          if (!card1 || !card2) continue

          const rect1 = card1.getBoundingClientRect()
          const rect2 = card2.getBoundingClientRect()

          const x1 = rect1.left + rect1.width / 2 - containerRect.left
          const y1 = rect1.top + rect1.height / 2 - containerRect.top
          const x2 = rect2.left + rect2.width / 2 - containerRect.left
          const y2 = rect2.top + rect2.height / 2 - containerRect.top

          const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

          // Only connect cards that are reasonably close
          if (distance < 400) {
            newLines.push({
              id: lineId++,
              x1,
              y1,
              x2,
              y2,
              opacity: 1 - distance / 400,
            })
          }
        }
      }

      setLines(newLines)
    }

    calculateLines()

    window.addEventListener('resize', calculateLines)
    window.addEventListener('scroll', calculateLines, { passive: true })

    return () => {
      window.removeEventListener('resize', calculateLines)
      window.removeEventListener('scroll', calculateLines)
    }
  }, [cardRefs])

  return (
    <div
      ref={containerRef}
      className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}
    >
      <svg className="w-full h-full">
        {lines.map((line) => (
          <line
            key={line.id}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="oklch(0.65 0.2 250 / 0.3)"
            strokeWidth="1"
            strokeDasharray="5 5"
            opacity={line.opacity * 0.5}
            className="animate-line-draw"
            style={{
              strokeDashoffset: 1000,
              animation: 'line-draw 2s ease-out forwards',
            }}
          />
        ))}
      </svg>
    </div>
  )
}
