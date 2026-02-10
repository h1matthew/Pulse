'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface ParticleFountainProps {
  className?: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  hue: number
  gravity: number
  bounce: number
}

export function ParticleFountain({ className }: ParticleFountainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [particleCount, setParticleCount] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const lastClickRef = useRef(0)

  const CANVAS_WIDTH = 320
  const CANVAS_HEIGHT = 240
  const GRAVITY = 0.25
  const BOUNCE_DAMPING = 0.7
  const FRICTION = 0.99

  const colors = [
    { hue: 25, name: 'Orange' },   // Rocket flame
    { hue: 45, name: 'Yellow' },   // Gold
    { hue: 150, name: 'Green' },   // Success
    { hue: 200, name: 'Blue' },    // Sky
    { hue: 280, name: 'Purple' },  // Space
    { hue: 350, name: 'Red' },     // Mars
  ]

  const createParticle = useCallback((x: number, y: number, hue: number): Particle => {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 8 + 4
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3, // Initial upward bias
      life: 1,
      maxLife: 1,
      size: Math.random() * 6 + 3,
      hue: hue + (Math.random() - 0.5) * 30,
      gravity: GRAVITY * (0.8 + Math.random() * 0.4),
      bounce: BOUNCE_DAMPING * (0.9 + Math.random() * 0.2),
    }
  }, [])

  const spawnBurst = useCallback((x: number, y: number, colorIndex?: number) => {
    const hue = colorIndex !== undefined
      ? colors[colorIndex % colors.length].hue
      : colors[Math.floor(Math.random() * colors.length)].hue

    const count = 15 + Math.floor(Math.random() * 10)
    for (let i = 0; i < count; i++) {
      particlesRef.current.push(createParticle(x, y, hue))
    }
    setParticleCount(particlesRef.current.length)
  }, [createParticle])

  const updatePhysics = useCallback(() => {
    particlesRef.current = particlesRef.current.filter(p => {
      // Apply gravity
      p.vy += p.gravity

      // Apply friction
      p.vx *= FRICTION
      p.vy *= FRICTION

      // Update position
      p.x += p.vx
      p.y += p.vy

      // Bounce off walls
      if (p.x < p.size) {
        p.x = p.size
        p.vx = -p.vx * p.bounce
      }
      if (p.x > CANVAS_WIDTH - p.size) {
        p.x = CANVAS_WIDTH - p.size
        p.vx = -p.vx * p.bounce
      }

      // Bounce off floor
      if (p.y > CANVAS_HEIGHT - p.size) {
        p.y = CANVAS_HEIGHT - p.size
        p.vy = -p.vy * p.bounce

        // Stop tiny bounces
        if (Math.abs(p.vy) < 1) {
          p.vy = 0
        }
      }

      // Bounce off ceiling
      if (p.y < p.size) {
        p.y = p.size
        p.vy = -p.vy * p.bounce
      }

      // Decay life
      p.life -= 0.008

      return p.life > 0
    })

    setParticleCount(particlesRef.current.length)
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Create offscreen grid canvas once
    if (!gridCanvasRef.current) {
      const gridCanvas = document.createElement('canvas')
      gridCanvas.width = CANVAS_WIDTH
      gridCanvas.height = CANVAS_HEIGHT
      const gridCtx = gridCanvas.getContext('2d')
      if (gridCtx) {
        gridCtx.strokeStyle = 'oklch(1 0 0 / 0.02)'
        gridCtx.lineWidth = 1
        for (let i = 0; i < CANVAS_WIDTH; i += 40) {
          gridCtx.beginPath()
          gridCtx.moveTo(i, 0)
          gridCtx.lineTo(i, CANVAS_HEIGHT)
          gridCtx.stroke()
        }
        for (let i = 0; i < CANVAS_HEIGHT; i += 40) {
          gridCtx.beginPath()
          gridCtx.moveTo(0, i)
          gridCtx.lineTo(CANVAS_WIDTH, i)
          gridCtx.stroke()
        }
      }
      gridCanvasRef.current = gridCanvas
    }

    // Clear with fade effect for trails
    ctx.fillStyle = 'oklch(0.05 0.02 270 / 0.3)'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw particles - using simple fills instead of per-particle gradients
    const particles = particlesRef.current
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      const alpha = p.life * 0.9

      // Glow pass: larger semi-transparent circle (replaces shadowBlur)
      ctx.globalAlpha = alpha * 0.3
      ctx.fillStyle = `oklch(0.6 0.2 ${p.hue})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
      ctx.fill()

      // Core particle
      ctx.globalAlpha = alpha
      ctx.fillStyle = `oklch(${0.7 + p.life * 0.1} 0.25 ${p.hue})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Draw cached grid
    ctx.drawImage(gridCanvasRef.current, 0, 0)
  }, [])

  const animate = useCallback(() => {
    updatePhysics()
    draw()
    animationRef.current = requestAnimationFrame(animate)
  }, [updatePhysics, draw])

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [animate])

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Rate limit clicks
    const now = Date.now()
    if (now - lastClickRef.current < 50) return
    lastClickRef.current = now

    spawnBurst(x, y)
  }

  const clearParticles = () => {
    particlesRef.current = []
    setParticleCount(0)
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative flex flex-col items-center gap-2', className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative rounded-xl border border-border/50 overflow-hidden shadow-lg">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="cursor-pointer block bg-gradient-to-b from-background to-muted/20"
          onClick={handleClick}
        />

        {/* Particle count */}
        <div className="absolute top-2 left-2 text-xs text-white/70 bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
          <span className="font-medium text-primary">{particleCount}</span> particles
        </div>

        {/* Clear button */}
        {particleCount > 0 && (
          <button
            onClick={clearParticles}
            className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded bg-background/80 hover:bg-background border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}

        {/* Hint */}
        {isHovering && particleCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-white/80 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
              Click anywhere to spawn particles
            </span>
          </div>
        )}

        {/* Color palette hint */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          {colors.map((c, i) => (
            <button
              key={c.name}
              onClick={(e) => {
                const rect = canvasRef.current?.getBoundingClientRect()
                if (rect) {
                  spawnBurst(
                    Math.random() * CANVAS_WIDTH * 0.6 + CANVAS_WIDTH * 0.2,
                    Math.random() * CANVAS_HEIGHT * 0.4 + CANVAS_HEIGHT * 0.2,
                    i
                  )
                }
              }}
              className="w-4 h-4 rounded-full border border-white/20 hover:scale-110 transition-transform"
              style={{ backgroundColor: `oklch(0.7 0.25 ${c.hue})` }}
              title={c.name}
            />
          ))}
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs font-medium text-muted-foreground">Particle Fountain</p>
        <p className="text-[10px] text-muted-foreground/60">Click to create physics-based explosions</p>
      </div>
    </div>
  )
}
