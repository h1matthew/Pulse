'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Rocket, Circle, Feather } from 'lucide-react'

interface GravityDropProps {
  className?: string
}

type ObjectType = 'feather' | 'ball' | 'rocket'
type GravityLevel = 'moon' | 'earth' | 'jupiter' | 'sun'

interface FallingObject {
  id: number
  type: ObjectType
  y: number
  vy: number
  x: number
  rotation: number
}

const GRAVITY_LEVELS: Record<GravityLevel, { value: number; label: string; color: string; icon: string }> = {
  moon: { value: 1.6, label: 'Moon', color: 'oklch(0.75 0.02 250)', icon: '🌙' },
  earth: { value: 9.8, label: 'Earth', color: 'oklch(0.55 0.18 150)', icon: '🌍' },
  jupiter: { value: 24.8, label: 'Jupiter', color: 'oklch(0.6 0.12 50)', icon: '🪐' },
  sun: { value: 274, label: 'Sun', color: 'oklch(0.65 0.18 30)', icon: '☀️' },
}

const OBJECT_CONFIG: Record<ObjectType, { mass: number; drag: number; label: string; icon: React.ReactNode; color: string }> = {
  feather: {
    mass: 0.001,
    drag: 0.15,
    label: 'Feather',
    icon: <Feather className="w-5 h-5" />,
    color: 'oklch(0.8 0.1 60)',
  },
  ball: {
    mass: 1,
    drag: 0.02,
    label: 'Ball',
    icon: <Circle className="w-5 h-5 fill-current" />,
    color: 'oklch(0.6 0.15 250)',
  },
  rocket: {
    mass: 5,
    drag: 0.03,
    label: 'Rocket',
    icon: <Rocket className="w-5 h-5" />,
    color: 'oklch(0.55 0.2 25)',
  },
}

export function GravityDrop({ className }: GravityDropProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const [gravity, setGravity] = useState<GravityLevel>('earth')
  const [objects, setObjects] = useState<FallingObject[]>([])
  const [isDropping, setIsDropping] = useState(false)

  // Use refs to avoid recreating the animate callback
  const gravityRef = useRef(gravity)
  const isDroppingRef = useRef(isDropping)
  const objectsRef = useRef<FallingObject[]>([])
  const frameCountRef = useRef(0)

  useEffect(() => { gravityRef.current = gravity }, [gravity])
  useEffect(() => { isDroppingRef.current = isDropping }, [isDropping])

  const CONTAINER_HEIGHT = 240
  const SCALE = 25 // Scale factor for visualization

  const dropObjects = useCallback(() => {
    const newObjects: FallingObject[] = [
      { id: 1, type: 'feather', y: 30, vy: 0, x: 20, rotation: 0 },
      { id: 2, type: 'ball', y: 30, vy: 0, x: 50, rotation: 0 },
      { id: 3, type: 'rocket', y: 30, vy: 0, x: 80, rotation: 0 },
    ]
    objectsRef.current = newObjects
    setObjects(newObjects)
    setIsDropping(true)
  }, [])

  // Stable animate callback - reads from refs, no dependencies
  const animate = useCallback(() => {
    if (!isDroppingRef.current) return

    const g = GRAVITY_LEVELS[gravityRef.current].value
    const prev = objectsRef.current

    const updated = prev.map((obj) => {
      const config = OBJECT_CONFIG[obj.type]

      // Calculate forces
      const gravityForce = g * config.mass
      const dragForce = config.drag * obj.vy * obj.vy * (obj.vy > 0 ? 1 : -1)

      // Net acceleration
      const acceleration = (gravityForce - dragForce) / config.mass

      // Update velocity and position
      const newVy = obj.vy + acceleration * 0.016 // 60fps
      const newY = Math.min(obj.y + newVy * SCALE * 0.016, CONTAINER_HEIGHT - 40)

      // Add rotation for feather (tumbling effect)
      let newRotation = obj.rotation
      if (obj.type === 'feather') {
        newRotation += newVy * 2
      }

      // Stop at ground
      if (newY >= CONTAINER_HEIGHT - 40) {
        return { ...obj, y: CONTAINER_HEIGHT - 40, vy: 0, rotation: newRotation }
      }

      return { ...obj, y: newY, vy: newVy, rotation: newRotation }
    })

    objectsRef.current = updated

    // Check if all objects have landed
    const allLanded = updated.every((obj) => obj.y >= CONTAINER_HEIGHT - 40)
    if (allLanded) {
      isDroppingRef.current = false
      setIsDropping(false)
      setObjects(updated)
      return
    }

    // Throttle React state updates to every 2 frames to reduce re-renders
    frameCountRef.current++
    if (frameCountRef.current % 2 === 0) {
      setObjects(updated)
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    if (isDropping) {
      frameCountRef.current = 0
      animationRef.current = requestAnimationFrame(animate)
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isDropping, animate])

  const handleGravityChange = (newGravity: GravityLevel) => {
    setGravity(newGravity)
    setObjects([])
    setIsDropping(false)
  }

  const currentGravity = GRAVITY_LEVELS[gravity]

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div
        ref={containerRef}
        className="relative w-[320px] h-[280px] rounded-xl border border-border/50 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm overflow-hidden"
      >
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--foreground) 1px, transparent 1px),
              linear-gradient(to bottom, var(--foreground) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Gravity indicator - top right */}
        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/50 z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentGravity.icon}</span>
            <div>
              <div
                className="text-sm font-bold"
                style={{ color: currentGravity.color }}
              >
                {currentGravity.label}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {currentGravity.value} m/s²
              </div>
            </div>
          </div>
        </div>

        {/* Object labels at top */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {(Object.keys(OBJECT_CONFIG) as ObjectType[]).map((type) => (
            <div key={type} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span style={{ color: OBJECT_CONFIG[type].color }}>
                {OBJECT_CONFIG[type].icon}
              </span>
              <span>{OBJECT_CONFIG[type].label}</span>
            </div>
          ))}
        </div>

        {/* Falling objects */}
        {objects.map((obj) => (
          <div
            key={obj.id}
            className="absolute flex flex-col items-center"
            style={{
              left: `${obj.x}%`,
              top: `${obj.y}px`,
              transform: `translateX(-50%) rotate(${obj.rotation}deg)`,
              transition: isDropping ? 'none' : 'transform 0.3s ease-out',
            }}
          >
            {/* Trail effect */}
            {obj.vy > 0.5 && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 rounded-full"
                style={{
                  height: `${Math.min(obj.vy * 3, 50)}px`,
                  background: `linear-gradient(to top, ${OBJECT_CONFIG[obj.type].color}, transparent)`,
                  transform: 'translateY(-100%)',
                  opacity: 0.6,
                }}
              />
            )}

            {/* Object icon */}
            <div
              className="relative flex items-center justify-center w-8 h-8 rounded-full bg-background/80 border border-border/50 shadow-sm"
              style={{ color: OBJECT_CONFIG[obj.type].color }}
            >
              {OBJECT_CONFIG[obj.type].icon}
            </div>

            {/* Velocity indicator */}
            {obj.vy > 1 && (
              <div className="absolute -right-8 text-[9px] text-muted-foreground/70 tabular-nums">
                {obj.vy.toFixed(0)} m/s
              </div>
            )}
          </div>
        ))}

        {/* Ground */}
        <div
          className="absolute left-0 right-0 bottom-0 h-10 bg-gradient-to-t from-border/60 via-border/30 to-transparent"
        />
        <div className="absolute bottom-[38px] left-0 right-0 h-0.5 bg-border/50" />

        {/* Ground label */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/50">
          Surface
        </div>

        {/* Drop button */}
        {!isDropping && objects.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[1px]">
            <button
              onClick={dropObjects}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              Drop Objects
            </button>
          </div>
        )}

        {/* Reset button */}
        {!isDropping && objects.length > 0 && (
          <div className="absolute bottom-3 right-3">
            <button
              onClick={() => { setObjects([]); setIsDropping(false); }}
              className="text-xs px-3 py-1.5 rounded-md bg-background/90 hover:bg-background border border-border/50 text-muted-foreground hover:text-foreground transition-colors shadow-sm"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Gravity selector */}
      <div className="flex gap-1.5">
        {(Object.keys(GRAVITY_LEVELS) as GravityLevel[]).map((level) => (
          <button
            key={level}
            onClick={() => handleGravityChange(level)}
            className={cn(
              'px-3 py-2 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5',
              gravity === level
                ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                : 'bg-background border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-muted/50'
            )}
          >
            <span>{GRAVITY_LEVELS[level].icon}</span>
            <span>{GRAVITY_LEVELS[level].label}</span>
          </button>
        ))}
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="text-xs font-medium text-muted-foreground">Gravity Lab</p>
        <p className="text-[10px] text-muted-foreground/60">See how mass and air resistance affect falling objects</p>
      </div>
    </div>
  )
}
