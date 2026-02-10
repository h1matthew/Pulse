'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface RocketThrustProps {
  className?: string
}

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

// Physics constants for realistic thrust-based movement
const ROTATION_SPEED = 0.03 // How fast rocket can turn toward cursor
const ANGULAR_DAMPING = 0.9 // Damping for rotation
const THRUST_FORCE = 0.4 // Acceleration per frame when thrusting
const DAMPING = 0.985 // Space has low friction - slow drift
const MAX_VELOCITY = 10 // Speed cap
const THRUST_DISTANCE = 150 // Distance threshold for thrust activation

// Threshold for triggering re-render (avoids 60fps state updates)
const POSITION_THRESHOLD = 0.5
const ANGLE_THRESHOLD = 0.02

export function RocketThrust({ className }: RocketThrustProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null })

  // Only use state for values that need to trigger re-renders
  // Use refs for high-frequency animation values
  const [renderTrigger, setRenderTrigger] = useState(0)

  // Rocket physics state (refs for animation, state only for significant changes)
  const positionRef = useRef({ x: 0, y: 0 })
  const velocityRef = useRef({ x: 0, y: 0 })
  const angleRef = useRef(-Math.PI / 2) // Start pointing up (-90 degrees)
  const angularVelocityRef = useRef(0)
  const thrustingRef = useRef(false)
  const thrustLevelRef = useRef(0)
  const particlesRef = useRef<Particle[]>([])

  const particleIdRef = useRef(0)
  const animationRef = useRef<number | null>(null)
  const lastRenderRef = useRef({ x: 0, y: 0, angle: -Math.PI / 2 })

  // Track mouse position within component bounds (using refs, no state updates)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      cursorRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    const handleMouseLeave = () => {
      cursorRef.current = { x: null, y: null }
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  // Normalize angle to [-PI, PI]
  const normalizeAngle = (angle: number): number => {
    while (angle > Math.PI) angle -= 2 * Math.PI
    while (angle < -Math.PI) angle += 2 * Math.PI
    return angle
  }

  // Physics animation loop - operates on refs, only triggers render when needed
  useEffect(() => {
    const animate = () => {
      const { x: cursorX, y: cursorY } = cursorRef.current
      let { x: posX, y: posY } = positionRef.current
      let velocityX = velocityRef.current.x
      let velocityY = velocityRef.current.y
      let angle = angleRef.current
      let angularVelocity = angularVelocityRef.current

      const containerWidth = 128
      const containerHeight = 192
      const rocketCenterX = containerWidth / 2 + posX
      const rocketCenterY = containerHeight / 2 + posY

      let thrusting = false
      let currentThrustLevel = 0

      if (cursorX !== null && cursorY !== null) {
        // Calculate distance to cursor
        const deltaX = cursorX - rocketCenterX
        const deltaY = cursorY - rocketCenterY
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

        // Calculate desired angle toward cursor
        const desiredAngle = Math.atan2(deltaY, deltaX)

        // Calculate angle difference and rotate toward cursor
        const angleDiff = normalizeAngle(desiredAngle - angle)

        // Apply rotation with limited turn rate
        angularVelocity += angleDiff * ROTATION_SPEED
        angularVelocity *= ANGULAR_DAMPING
        angle += angularVelocity
        angle = normalizeAngle(angle)

        // Thrust when cursor is within range
        thrusting = distance < THRUST_DISTANCE
        if (thrusting) {
          // Thrust is stronger when closer to cursor
          currentThrustLevel = Math.min(1, (THRUST_DISTANCE - distance) / 50)

          // Apply thrust in the direction the rocket is pointing
          velocityX += Math.cos(angle) * THRUST_FORCE * currentThrustLevel
          velocityY += Math.sin(angle) * THRUST_FORCE * currentThrustLevel
        }
      }

      // Apply velocity damping (space friction)
      velocityX *= DAMPING
      velocityY *= DAMPING

      // Cap maximum velocity
      const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY)
      if (speed > MAX_VELOCITY) {
        const scale = MAX_VELOCITY / speed
        velocityX *= scale
        velocityY *= scale
      }

      // Update position
      let newX = posX + velocityX
      let newY = posY + velocityY

      // Soft bounds with bounce
      if (newX < -50) {
        newX = -50
        velocityX *= -0.5
      }
      if (newX > 50) {
        newX = 50
        velocityX *= -0.5
      }
      if (newY < -70) {
        newY = -70
        velocityY *= -0.5
      }
      if (newY > 70) {
        newY = 70
        velocityY *= -0.5
      }

      // Spawn exhaust particles when thrusting
      if (thrusting && speed > 0.5) {
        const particleCount = Math.floor(currentThrustLevel * 2) + 1

        for (let i = 0; i < particleCount; i++) {
          // Exhaust comes from the back of the rocket (opposite to angle)
          const exhaustAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5
          const exhaustSpeed = 2 + Math.random() * 3 * currentThrustLevel

          particlesRef.current.push({
            id: particleIdRef.current++,
            x: 0,
            y: 0,
            vx: Math.cos(exhaustAngle) * exhaustSpeed - velocityX * 0.5,
            vy: Math.sin(exhaustAngle) * exhaustSpeed - velocityY * 0.5,
            life: 1
          })
        }

        // Limit particles (in-place truncation)
        if (particlesRef.current.length > 35) {
          particlesRef.current.splice(0, particlesRef.current.length - 30)
        }
      }

      // Update particle positions in-place (avoids ~2100 object allocs/sec)
      const parts = particlesRef.current
      let writeIdx = 0
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.02
        if (p.life > 0) {
          parts[writeIdx++] = p
        }
      }
      parts.length = writeIdx

      // Update all refs
      positionRef.current = { x: newX, y: newY }
      velocityRef.current = { x: velocityX, y: velocityY }
      angleRef.current = angle
      angularVelocityRef.current = angularVelocity
      thrustingRef.current = thrusting
      thrustLevelRef.current = currentThrustLevel

      // Only trigger React re-render when values change significantly
      const last = lastRenderRef.current
      const positionChanged = Math.abs(newX - last.x) > POSITION_THRESHOLD ||
                              Math.abs(newY - last.y) > POSITION_THRESHOLD
      const angleChanged = Math.abs(angle - last.angle) > ANGLE_THRESHOLD

      if (positionChanged || angleChanged) {
        lastRenderRef.current = { x: newX, y: newY, angle }
        setRenderTrigger(t => t + 1)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
    }
  }, []) // No dependencies - uses refs only

  // Read current values from refs for render
  const rocketX = positionRef.current.x
  const rocketY = positionRef.current.y
  const displayAngle = angleRef.current
  const isThrusting = thrustingRef.current
  const thrustLevel = thrustLevelRef.current
  const particles = particlesRef.current
  const { x: cursorX, y: cursorY } = cursorRef.current

  // Calculate force vectors for display
  const containerWidth = 128
  const containerHeight = 192
  const rocketCenterX = containerWidth / 2 + rocketX
  const rocketCenterY = containerHeight / 2 + rocketY

  let showVectors = false
  let actionForceX = 0
  let actionForceY = 0

  if (cursorX !== null && cursorY !== null) {
    const deltaX = cursorX - rocketCenterX
    const deltaY = cursorY - rocketCenterY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    if (distance > 10) {
      showVectors = true
      // Action force points toward cursor (thrust direction)
      actionForceX = (deltaX / distance) * (1 - Math.min(distance / THRUST_DISTANCE, 1))
      actionForceY = (deltaY / distance) * (1 - Math.min(distance / THRUST_DISTANCE, 1))
    }
  }

  const forceMagnitude = Math.sqrt(actionForceX * actionForceX + actionForceY * actionForceY)
  const arrowLength = 20 + forceMagnitude * 60

  return (
    <div
      ref={containerRef}
      className={cn('w-32 h-48 relative select-none cursor-crosshair', className)}
    >
      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            left: rocketCenterX,
            top: rocketCenterY,
            transform: `translate(${p.x}px, ${p.y}px)`,
            opacity: p.life,
            background: `radial-gradient(circle, #fbbf24, #f97316)`,
            boxShadow: `0 0 4px #f97316`
          }}
        />
      ))}

      {/* Force Vectors */}
      {showVectors && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          {/* Thrust vector (green) - in direction rocket is pointing */}
          <g transform={`translate(${rocketCenterX}, ${rocketCenterY})`}>
            <line
              x1={0}
              y1={0}
              x2={Math.cos(displayAngle) * arrowLength * 0.7}
              y2={Math.sin(displayAngle) * arrowLength * 0.7}
              stroke="#22c55e"
              strokeWidth={2}
              markerEnd="url(#thrust-arrowhead)"
            />
            <text
              x={Math.cos(displayAngle) * arrowLength * 0.7 + (Math.cos(displayAngle) > 0 ? 5 : -35)}
              y={Math.sin(displayAngle) * arrowLength * 0.7 + (Math.sin(displayAngle) > 0 ? 15 : -10)}
              fill="#22c55e"
              fontSize={9}
              fontWeight={500}
            >
              Thrust
            </text>
          </g>

          {/* Cursor/target indicator */}
          {cursorX !== null && cursorY !== null && (
            <g>
              <circle
                cx={cursorX}
                cy={cursorY}
                r={4}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2}
                opacity={0.6}
              />
              <circle
                cx={cursorX}
                cy={cursorY}
                r={THRUST_DISTANCE}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.2}
              />
            </g>
          )}

          {/* Arrowhead markers */}
          <defs>
            <marker
              id="thrust-arrowhead"
              markerWidth={8}
              markerHeight={8}
              refX={7}
              refY={4}
              orient="auto"
            >
              <polygon points="0 0, 8 4, 0 8" fill="#22c55e" />
            </marker>
          </defs>
        </svg>
      )}

      {/* Rocket */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          transform: `translate(calc(-50% + ${rocketX}px), calc(-50% + ${rocketY}px)) rotate(${displayAngle + Math.PI / 2}rad)`,
          willChange: 'transform',
        }}
      >
        <svg width="32" height="48" viewBox="0 0 32 48" fill="none">
          {/* Body */}
          <ellipse cx="16" cy="28" rx="8" ry="16" fill="#e2e8f0"/>
          {/* Nose */}
          <path d="M8 16 Q16 4 24 16" fill="#94a3b8"/>
          {/* Fins */}
          <path d="M8 36 L4 44 L8 40" fill="#64748b"/>
          <path d="M24 36 L28 44 L24 40" fill="#64748b"/>
          {/* Window */}
          <circle cx="16" cy="24" r="4" fill="#3b82f6"/>
        </svg>

        {/* Exhaust flame when thrusting */}
        {isThrusting && (
          <div
            className="absolute left-1/2 top-full -translate-x-1/2"
            style={{
              width: 8 + thrustLevel * 8,
              height: 20 + thrustLevel * 30,
              background: `linear-gradient(to bottom, #fbbf24, #f97316, #dc2626)`,
              borderRadius: '50%',
              filter: 'blur(2px)',
              opacity: 0.8 + thrustLevel * 0.2,
              transform: 'translateX(-50%)',
              animation: 'pulse 0.1s ease-in-out infinite alternate'
            }}
          />
        )}
      </div>

      {/* Hint */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/70 whitespace-nowrap">
        Move cursor to thrust
      </div>
    </div>
  )
}
