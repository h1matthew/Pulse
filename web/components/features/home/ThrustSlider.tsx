'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface ThrustSliderProps {
  className?: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  color: string
}

export function ThrustSlider({ className }: ThrustSliderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const [thrust, setThrust] = useState(0)
  const [rocketY, setRocketY] = useState(0)
  const [velocity, setVelocity] = useState(0)
  const [isLanded, setIsLanded] = useState(true)
  const particlesRef = useRef<Particle[]>([])
  const rocketYRef = useRef(0)
  const velocityRef = useRef(0)

  const CANVAS_WIDTH = 300
  const CANVAS_HEIGHT = 280
  const ROCKET_SIZE = 25
  const GROUND_Y = CANVAS_HEIGHT - 40
  const ROCKET_MASS = 1
  const GRAVITY = 0.15
  const MAX_THRUST_FORCE = 0.4

  const createParticle = useCallback((x: number, y: number, thrustRatio: number): Particle => {
    const spread = (Math.random() - 0.5) * 1.5
    const speed = Math.random() * 4 + 3 + thrustRatio * 5
    const hue = 30 + Math.random() * 40 // Orange to yellow range
    return {
      x: x + (Math.random() - 0.5) * 16,
      y: y,
      vx: Math.sin(spread) * speed,
      vy: Math.cos(spread) * speed * 0.5 + thrustRatio * 3,
      life: 1,
      size: Math.random() * 6 + 4 + thrustRatio * 4,
      color: `oklch(${0.6 + Math.random() * 0.2} ${0.2 + thrustRatio * 0.1} ${hue})`,
    }
  }, [])

  const twr = (thrust / 100) * 2 // Max TWR of 2.0 at 100% thrust

  const updatePhysics = useCallback(() => {
    const thrustForce = (thrust / 100) * MAX_THRUST_FORCE
    const weightForce = ROCKET_MASS * GRAVITY
    const netForce = thrustForce - weightForce
    const acceleration = netForce / ROCKET_MASS

    velocityRef.current += acceleration

    // Apply some damping when near ground
    if (rocketYRef.current >= GROUND_Y - ROCKET_SIZE - 10 && velocityRef.current > 0) {
      velocityRef.current *= 0.8
    }

    rocketYRef.current -= velocityRef.current

    // Ground collision
    if (rocketYRef.current > GROUND_Y - ROCKET_SIZE) {
      rocketYRef.current = GROUND_Y - ROCKET_SIZE
      velocityRef.current = -velocityRef.current * 0.3 // Bounce with damping
      if (Math.abs(velocityRef.current) < 0.1) {
        velocityRef.current = 0
      }
    }

    // Ceiling collision
    if (rocketYRef.current < ROCKET_SIZE) {
      rocketYRef.current = ROCKET_SIZE
      velocityRef.current = 0
    }

    setRocketY(rocketYRef.current)
    setVelocity(velocityRef.current)
    setIsLanded(rocketYRef.current >= GROUND_Y - ROCKET_SIZE - 1 && Math.abs(velocityRef.current) < 0.1)

    // Create exhaust particles
    if (thrust > 5) {
      const thrustRatio = thrust / 100
      const exhaustY = GROUND_Y - rocketYRef.current - ROCKET_SIZE + 10
      const exhaustX = CANVAS_WIDTH / 2
      const particleCount = Math.floor(thrustRatio * 3) + 1
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push(createParticle(exhaustX, exhaustY, thrustRatio))
      }
    }
  }, [thrust, createParticle])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear with gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    bgGradient.addColorStop(0, 'oklch(0.08 0.02 270)')
    bgGradient.addColorStop(1, 'oklch(0.06 0.02 270)')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Grid lines
    ctx.strokeStyle = 'oklch(1 0 0 / 0.03)'
    ctx.lineWidth = 1
    for (let i = 0; i < CANVAS_WIDTH; i += 30) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, CANVAS_HEIGHT)
      ctx.stroke()
    }
    for (let i = 0; i < CANVAS_HEIGHT; i += 30) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(CANVAS_WIDTH, i)
      ctx.stroke()
    }

    const centerX = CANVAS_WIDTH / 2
    const rocketBottomY = GROUND_Y - rocketYRef.current
    const rocketTopY = rocketBottomY - ROCKET_SIZE * 2

    // Draw launch pad
    ctx.fillStyle = 'oklch(0.3 0.05 270)'
    ctx.fillRect(centerX - 40, GROUND_Y - 5, 80, 5)
    ctx.fillStyle = 'oklch(0.25 0.05 270)'
    ctx.fillRect(centerX - 30, GROUND_Y, 60, 8)

    // Draw ground
    ctx.fillStyle = 'oklch(0.15 0.05 270)'
    ctx.fillRect(0, GROUND_Y + 8, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y - 8)

    // Ground line
    ctx.beginPath()
    ctx.moveTo(0, GROUND_Y + 8)
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y + 8)
    ctx.strokeStyle = 'oklch(0.3 0.05 270)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Update and draw particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx
      p.y += p.vy
      p.life -= 0.025
      p.size *= 0.97

      if (p.life > 0) {
        const alpha = p.life * 0.8
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
        gradient.addColorStop(0, p.color.replace(')', ` / ${alpha})`))
        gradient.addColorStop(0.5, p.color.replace(')', ` / ${alpha * 0.5})`))
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        return true
      }
      return false
    })

    // Draw rocket
    const rocketX = centerX
    const rocketYPos = rocketTopY + ROCKET_SIZE

    ctx.save()
    ctx.translate(rocketX, rocketYPos)

    // Rocket body
    ctx.fillStyle = 'oklch(0.9 0 0)'
    ctx.beginPath()
    ctx.ellipse(0, 0, ROCKET_SIZE * 0.5, ROCKET_SIZE, 0, 0, Math.PI * 2)
    ctx.fill()

    // Nose cone
    ctx.fillStyle = 'oklch(0.7 0.15 25)'
    ctx.beginPath()
    ctx.moveTo(0, -ROCKET_SIZE - 10)
    ctx.lineTo(-ROCKET_SIZE * 0.5, -ROCKET_SIZE)
    ctx.lineTo(ROCKET_SIZE * 0.5, -ROCKET_SIZE)
    ctx.closePath()
    ctx.fill()

    // Fins
    ctx.fillStyle = 'oklch(0.5 0.1 25)'
    ctx.beginPath()
    ctx.moveTo(-ROCKET_SIZE * 0.5, ROCKET_SIZE - 8)
    ctx.lineTo(-ROCKET_SIZE * 0.5 - 10, ROCKET_SIZE + 10)
    ctx.lineTo(-ROCKET_SIZE * 0.5, ROCKET_SIZE + 3)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(ROCKET_SIZE * 0.5, ROCKET_SIZE - 8)
    ctx.lineTo(ROCKET_SIZE * 0.5 + 10, ROCKET_SIZE + 10)
    ctx.lineTo(ROCKET_SIZE * 0.5, ROCKET_SIZE + 3)
    ctx.fill()

    // Window
    ctx.fillStyle = 'oklch(0.3 0.2 250)'
    ctx.beginPath()
    ctx.arc(0, -8, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'oklch(0.6 0.25 200)'
    ctx.beginPath()
    ctx.arc(-2, -10, 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()

    // Draw force arrows when on ground or near it
    if (rocketYRef.current < 50) {
      const arrowBaseY = rocketYPos + ROCKET_SIZE + 15

      // Thrust arrow (green, pointing up from bottom)
      const thrustArrowLength = Math.min((thrust / 100) * 50 + 10, 70)
      ctx.beginPath()
      ctx.moveTo(rocketX + 20, arrowBaseY)
      ctx.lineTo(rocketX + 20, arrowBaseY - thrustArrowLength)
      ctx.strokeStyle = 'oklch(0.7 0.25 150)'
      ctx.lineWidth = 4
      ctx.stroke()

      // Thrust arrowhead
      ctx.beginPath()
      ctx.moveTo(rocketX + 20, arrowBaseY - thrustArrowLength)
      ctx.lineTo(rocketX + 16, arrowBaseY - thrustArrowLength + 10)
      ctx.moveTo(rocketX + 20, arrowBaseY - thrustArrowLength)
      ctx.lineTo(rocketX + 24, arrowBaseY - thrustArrowLength + 10)
      ctx.stroke()

      // Weight arrow (red, pointing down from bottom)
      const weightArrowLength = 50
      ctx.beginPath()
      ctx.moveTo(rocketX - 20, arrowBaseY)
      ctx.lineTo(rocketX - 20, arrowBaseY + weightArrowLength)
      ctx.strokeStyle = 'oklch(0.7 0.25 25)'
      ctx.lineWidth = 4
      ctx.stroke()

      // Weight arrowhead
      ctx.beginPath()
      ctx.moveTo(rocketX - 20, arrowBaseY + weightArrowLength)
      ctx.lineTo(rocketX - 24, arrowBaseY + weightArrowLength - 10)
      ctx.moveTo(rocketX - 20, arrowBaseY + weightArrowLength)
      ctx.lineTo(rocketX - 16, arrowBaseY + weightArrowLength - 10)
      ctx.stroke()
    }

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

  const getTwrColor = () => {
    if (twr < 1) return 'text-red-400'
    if (twr < 1.5) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getTwrStatus = () => {
    if (twr < 1) return 'Too heavy to lift'
    if (twr === 1) return 'Hovering'
    return 'Liftoff!'
  }

  return (
    <div className={cn('relative flex flex-col items-center gap-2', className)}>
      <div className="relative rounded-xl border border-border/50 overflow-hidden shadow-lg">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block"
        />

        {/* TWR Display */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
          <div className="text-[10px] text-white/60 uppercase tracking-wider">TWR</div>
          <div className={cn('text-xl font-bold tabular-nums', getTwrColor())}>
            {twr.toFixed(2)}
          </div>
          <div className={cn('text-[10px]', getTwrColor())}>
            {getTwrStatus()}
          </div>
        </div>

        {/* Altitude */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
          <div className="text-[10px] text-white/60 uppercase tracking-wider">Altitude</div>
          <div className="text-xl font-bold tabular-nums text-white">
            {Math.max(0, Math.round(rocketY))}
          </div>
          <div className="text-[10px] text-white/60">meters</div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-[280px] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Thrust</span>
          <span className="font-medium text-primary">{thrust}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={thrust}
          onChange={(e) => setThrust(Number(e.target.value))}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/50">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs font-medium text-muted-foreground">Thrust-to-Weight Ratio</p>
        <p className="text-[10px] text-muted-foreground/60">TWR &gt; 1.0 needed for liftoff</p>
      </div>
    </div>
  )
}
