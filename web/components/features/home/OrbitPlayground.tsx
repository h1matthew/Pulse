'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface OrbitPlaygroundProps {
  className?: string
}

interface Satellite {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  trail: { x: number; y: number }[]
  trailStart: number
  trailCount: number
}

interface DragState {
  isDragging: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
}

// PERFORMANCE FIX: Move static data outside component to avoid recreation
const COLORS = [
  'oklch(0.75 0.2 30)',   // Red
  'oklch(0.75 0.2 150)',  // Green
  'oklch(0.7 0.2 250)',   // Blue
  'oklch(0.75 0.2 300)',  // Purple
  'oklch(0.8 0.18 60)',   // Yellow
  'oklch(0.75 0.18 180)', // Cyan
] as const

// PERFORMANCE FIX: Static star positions - no need to recreate every frame
const STARS = [
  { x: -300, y: -250, s: 1.5 }, { x: 280, y: -220, s: 1 },
  { x: -250, y: 280, s: 1.2 }, { x: 320, y: 250, s: 0.8 },
  { x: -180, y: -300, s: 1 }, { x: 200, y: 300, s: 1.3 },
  { x: -350, y: 100, s: 0.9 }, { x: 380, y: -180, s: 1.1 },
  { x: 100, y: -350, s: 0.7 }, { x: -200, y: 320, s: 1 },
  { x: 400, y: 150, s: 0.8 }, { x: -380, y: -150, s: 1.2 },
  { x: 50, y: 380, s: 0.6 }, { x: -150, y: -380, s: 1 },
] as const

export function OrbitPlayground({ className }: OrbitPlaygroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const satellitesRef = useRef<Satellite[]>([])
  const animationRef = useRef<number | null>(null)
  const dragRef = useRef<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  })
  const [satelliteCount, setSatelliteCount] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const hoveredSatRef = useRef<number | null>(null)

  // PERFORMANCE FIX: Use constants and refs to avoid recreation
  const CANVAS_SIZE = 320
  const CENTER_X = CANVAS_SIZE / 2
  const CENTER_Y = CANVAS_SIZE / 2
  const BASE_PLANET_RADIUS = 35
  const G = 0.4
  const TRAIL_LENGTH = 50

  // PERFORMANCE FIX: Cache gradients in refs to avoid recreating every frame
  // Gradients are expensive to create and don't change
  const gradientCacheRef = useRef<{
    planetGlow: CanvasGradient | null
    planetGradient: CanvasGradient | null
    shadowGradient: CanvasGradient | null
  }>({ planetGlow: null, planetGradient: null, shadowGradient: null })

  const createSatellite = useCallback((x: number, y: number, vx: number, vy: number): Satellite => {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    // Pre-allocate circular buffer for trail
    const trail = new Array<{ x: number; y: number }>(TRAIL_LENGTH)
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      trail[i] = { x: 0, y: 0 }
    }
    return {
      id: Date.now() + Math.random(),
      x,
      y,
      vx,
      vy,
      color,
      trail,
      trailStart: 0,
      trailCount: 0,
    }
  }, [])

  const screenToWorld = useCallback((x: number, y: number) => {
    return {
      x: (x - CENTER_X) / zoom + offset.x,
      y: (y - CENTER_Y) / zoom + offset.y,
    }
  }, [offset, zoom])

  const updatePhysics = useCallback(() => {
    const satellites = satellitesRef.current

    satellites.forEach((sat) => {
      const dx = -sat.x
      const dy = -sat.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < BASE_PLANET_RADIUS + 5) {
        return
      }

      const force = G * 150 / (dist * dist)
      const ax = (dx / dist) * force
      const ay = (dy / dist) * force

      sat.vx += ax
      sat.vy += ay
      sat.x += sat.vx
      sat.y += sat.vy

      // Circular buffer trail (O(1) vs O(n) for shift)
      const writeIdx = (sat.trailStart + sat.trailCount) % TRAIL_LENGTH
      sat.trail[writeIdx].x = sat.x
      sat.trail[writeIdx].y = sat.y
      if (sat.trailCount < TRAIL_LENGTH) {
        sat.trailCount++
      } else {
        sat.trailStart = (sat.trailStart + 1) % TRAIL_LENGTH
      }
    })

    satellitesRef.current = satellites.filter((sat) => {
      const dist = Math.sqrt(sat.x * sat.x + sat.y * sat.y)
      return dist > BASE_PLANET_RADIUS + 5 && dist < 800
    })

    setSatelliteCount(satellitesRef.current.length)
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Dark space background
    ctx.fillStyle = 'oklch(0.05 0.02 270)'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    ctx.save()
    ctx.translate(CENTER_X, CENTER_Y)
    ctx.scale(zoom, zoom)
    ctx.translate(-offset.x, -offset.y)

    // PERFORMANCE FIX: Use static STARS array instead of recreating every frame
    // Also use a consistent opacity instead of random for less jitter
    STARS.forEach((star, i) => {
      // Use index-based pseudo-random for consistent twinkle effect
      const twinkle = 0.4 + ((i * 7) % 10) / 30
      ctx.fillStyle = `oklch(1 0 0 / ${twinkle})`
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.s / zoom, 0, Math.PI * 2)
      ctx.fill()
    })

    // PERFORMANCE FIX: Cache gradients - only create once, reuse every frame
    // Gradients don't depend on zoom/offset, so they can be cached
    const cache = gradientCacheRef.current
    if (!cache.planetGlow) {
      cache.planetGlow = ctx.createRadialGradient(0, 0, BASE_PLANET_RADIUS, 0, 0, BASE_PLANET_RADIUS * 2.5)
      cache.planetGlow.addColorStop(0, 'oklch(0.5 0.2 220 / 0.5)')
      cache.planetGlow.addColorStop(0.5, 'oklch(0.4 0.15 240 / 0.2)')
      cache.planetGlow.addColorStop(1, 'transparent')
    }
    if (!cache.planetGradient) {
      cache.planetGradient = ctx.createRadialGradient(-10, -10, 0, 0, 0, BASE_PLANET_RADIUS)
      cache.planetGradient.addColorStop(0, 'oklch(0.6 0.15 200)')
      cache.planetGradient.addColorStop(0.3, 'oklch(0.5 0.2 230)')
      cache.planetGradient.addColorStop(0.7, 'oklch(0.4 0.18 250)')
      cache.planetGradient.addColorStop(1, 'oklch(0.2 0.1 260)')
    }
    if (!cache.shadowGradient) {
      cache.shadowGradient = ctx.createRadialGradient(15, 15, 0, 0, 0, BASE_PLANET_RADIUS)
      cache.shadowGradient.addColorStop(0, 'transparent')
      cache.shadowGradient.addColorStop(0.4, 'transparent')
      cache.shadowGradient.addColorStop(1, 'oklch(0.05 0.05 270 / 0.7)')
    }

    // Planet glow (atmosphere) - use cached gradient
    ctx.fillStyle = cache.planetGlow
    ctx.beginPath()
    ctx.arc(0, 0, BASE_PLANET_RADIUS * 2.5, 0, Math.PI * 2)
    ctx.fill()

    // Earth-like planet - use cached gradient
    ctx.beginPath()
    ctx.arc(0, 0, BASE_PLANET_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = cache.planetGradient
    ctx.fill()

    // Simple continent patterns
    ctx.fillStyle = 'oklch(0.5 0.15 140 / 0.4)'
    ctx.beginPath()
    ctx.arc(-15, -10, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(10, 5, 15, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(-5, 18, 10, 0, Math.PI * 2)
    ctx.fill()

    // Cloud bands
    ctx.fillStyle = 'oklch(1 0 0 / 0.15)'
    ctx.beginPath()
    ctx.ellipse(0, -8, BASE_PLANET_RADIUS * 0.8, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(0, 12, BASE_PLANET_RADIUS * 0.6, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    // Planet shadow (night side) - use cached gradient
    ctx.beginPath()
    ctx.arc(0, 0, BASE_PLANET_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = cache.shadowGradient
    ctx.fill()

    // Atmosphere ring
    ctx.beginPath()
    ctx.arc(0, 0, BASE_PLANET_RADIUS + 5, 0, Math.PI * 2)
    ctx.strokeStyle = 'oklch(0.7 0.15 200 / 0.3)'
    ctx.lineWidth = 2 / zoom
    ctx.stroke()

    // Get mouse position for hover detection
    const mousePos = dragRef.current.isDragging
      ? { x: dragRef.current.currentX, y: dragRef.current.currentY }
      : null

    // Cache font strings (avoid per-frame font metric recalculation)
    const labelFont = `bold ${10/zoom}px sans-serif`
    const velocityFont = `${11/zoom}px sans-serif`

    // Draw satellites
    satellitesRef.current.forEach((sat, index) => {
      // Trail (iterate circular buffer)
      if (sat.trailCount > 1) {
        ctx.beginPath()
        const firstIdx = sat.trailStart
        ctx.moveTo(sat.trail[firstIdx].x, sat.trail[firstIdx].y)
        for (let i = 1; i < sat.trailCount; i++) {
          const idx = (sat.trailStart + i) % TRAIL_LENGTH
          ctx.lineTo(sat.trail[idx].x, sat.trail[idx].y)
        }
        ctx.strokeStyle = sat.color.replace(')', ' / 0.4)')
        ctx.lineWidth = 2 / zoom
        ctx.stroke()
      }

      // Check if mouse is hovering over satellite
      const worldMouse = mousePos ? screenToWorld(mousePos.x, mousePos.y) : null
      const isHovered = worldMouse &&
        Math.sqrt((worldMouse.x - sat.x) ** 2 + (worldMouse.y - sat.y) ** 2) < 15 / zoom

      if (isHovered) {
        hoveredSatRef.current = index

        // Calculate velocity and acceleration vectors
        const speed = Math.sqrt(sat.vx * sat.vx + sat.vy * sat.vy)
        if (speed > 0.1) {
          // Velocity vector (green) - points in direction of motion (tangential)
          const vScale = 15 / zoom
          ctx.beginPath()
          ctx.moveTo(sat.x, sat.y)
          ctx.lineTo(sat.x + sat.vx * vScale, sat.y + sat.vy * vScale)
          ctx.strokeStyle = 'oklch(0.75 0.25 150)'
          ctx.lineWidth = 2 / zoom
          ctx.stroke()

          // Velocity arrowhead
          const vAngle = Math.atan2(sat.vy, sat.vx)
          const arrowLen = 6 / zoom
          ctx.beginPath()
          ctx.moveTo(sat.x + sat.vx * vScale, sat.y + sat.vy * vScale)
          ctx.lineTo(
            sat.x + sat.vx * vScale - arrowLen * Math.cos(vAngle - Math.PI / 6),
            sat.y + sat.vy * vScale - arrowLen * Math.sin(vAngle - Math.PI / 6)
          )
          ctx.moveTo(sat.x + sat.vx * vScale, sat.y + sat.vy * vScale)
          ctx.lineTo(
            sat.x + sat.vx * vScale - arrowLen * Math.cos(vAngle + Math.PI / 6),
            sat.y + sat.vy * vScale - arrowLen * Math.sin(vAngle + Math.PI / 6)
          )
          ctx.strokeStyle = 'oklch(0.75 0.25 150)'
          ctx.lineWidth = 2 / zoom
          ctx.stroke()

          // Label velocity
          ctx.fillStyle = 'oklch(0.75 0.25 150)'
          ctx.font = labelFont
          ctx.fillText('v', sat.x + sat.vx * vScale + 5/zoom, sat.y + sat.vy * vScale)
        }

        // Acceleration vector (red) - points toward center (gravity)
        const distToCenter = Math.sqrt(sat.x * sat.x + sat.y * sat.y)
        if (distToCenter > 0) {
          const ax = -sat.x / distToCenter
          const ay = -sat.y / distToCenter
          const aScale = 12 / zoom

          ctx.beginPath()
          ctx.moveTo(sat.x, sat.y)
          ctx.lineTo(sat.x + ax * aScale, sat.y + ay * aScale)
          ctx.strokeStyle = 'oklch(0.7 0.25 25)'
          ctx.lineWidth = 2 / zoom
          ctx.stroke()

          // Acceleration arrowhead
          const aAngle = Math.atan2(ay, ax)
          const arrowLen = 6 / zoom
          ctx.beginPath()
          ctx.moveTo(sat.x + ax * aScale, sat.y + ay * aScale)
          ctx.lineTo(
            sat.x + ax * aScale - arrowLen * Math.cos(aAngle - Math.PI / 6),
            sat.y + ay * aScale - arrowLen * Math.sin(aAngle - Math.PI / 6)
          )
          ctx.moveTo(sat.x + ax * aScale, sat.y + ay * aScale)
          ctx.lineTo(
            sat.x + ax * aScale - arrowLen * Math.cos(aAngle + Math.PI / 6),
            sat.y + ay * aScale - arrowLen * Math.sin(aAngle + Math.PI / 6)
          )
          ctx.strokeStyle = 'oklch(0.7 0.25 25)'
          ctx.lineWidth = 2 / zoom
          ctx.stroke()

          // Label acceleration
          ctx.fillStyle = 'oklch(0.7 0.25 25)'
          ctx.font = labelFont
          ctx.fillText('a', sat.x + ax * aScale + 5/zoom, sat.y + ay * aScale)
        }

        // Highlight ring
        ctx.beginPath()
        ctx.arc(sat.x, sat.y, 12 / zoom, 0, Math.PI * 2)
        ctx.strokeStyle = 'oklch(1 0 0 / 0.5)'
        ctx.lineWidth = 1 / zoom
        ctx.stroke()
      } else if (hoveredSatRef.current === index && !isHovered) {
        hoveredSatRef.current = null
      }

      // Satellite glow
      ctx.beginPath()
      ctx.arc(sat.x, sat.y, 10 / zoom, 0, Math.PI * 2)
      ctx.fillStyle = sat.color.replace(')', ' / 0.3)')
      ctx.fill()

      // Satellite body
      ctx.beginPath()
      ctx.arc(sat.x, sat.y, 5 / zoom, 0, Math.PI * 2)
      ctx.fillStyle = sat.color
      ctx.fill()

      // Highlight
      ctx.beginPath()
      ctx.arc(sat.x - 1/zoom, sat.y - 1/zoom, 2/zoom, 0, Math.PI * 2)
      ctx.fillStyle = 'oklch(1 0 0 / 0.8)'
      ctx.fill()
    })

    // Draw drag preview
    if (dragRef.current.isDragging) {
      const { startX, startY, currentX, currentY } = dragRef.current
      const worldStart = screenToWorld(startX, startY)

      ctx.beginPath()
      ctx.arc(worldStart.x, worldStart.y, 6 / zoom, 0, Math.PI * 2)
      ctx.fillStyle = 'oklch(0.7 0.2 150 / 0.9)'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(worldStart.x, worldStart.y, 10 / zoom, 0, Math.PI * 2)
      ctx.strokeStyle = 'oklch(0.7 0.2 150 / 0.5)'
      ctx.lineWidth = 2 / zoom
      ctx.stroke()

      const dx = startX - currentX
      const dy = startY - currentY
      const magnitude = Math.sqrt(dx * dx + dy * dy)

      if (magnitude > 5) {
        const velocityScale = 0.05 / zoom
        const vx = dx * velocityScale
        const vy = dy * velocityScale

        ctx.beginPath()
        ctx.moveTo(worldStart.x, worldStart.y)
        ctx.lineTo(worldStart.x + vx * 20, worldStart.y + vy * 20)
        ctx.strokeStyle = 'oklch(0.75 0.25 150)'
        ctx.lineWidth = 3 / zoom
        ctx.stroke()

        const angle = Math.atan2(vy, vx)
        const arrowLen = 12 / zoom
        ctx.beginPath()
        ctx.moveTo(worldStart.x + vx * 20, worldStart.y + vy * 20)
        ctx.lineTo(
          worldStart.x + vx * 20 - arrowLen * Math.cos(angle - Math.PI / 6),
          worldStart.y + vy * 20 - arrowLen * Math.sin(angle - Math.PI / 6)
        )
        ctx.moveTo(worldStart.x + vx * 20, worldStart.y + vy * 20)
        ctx.lineTo(
          worldStart.x + vx * 20 - arrowLen * Math.cos(angle + Math.PI / 6),
          worldStart.y + vy * 20 - arrowLen * Math.sin(angle + Math.PI / 6)
        )
        ctx.strokeStyle = 'oklch(0.75 0.25 150)'
        ctx.lineWidth = 3 / zoom
        ctx.stroke()

        ctx.beginPath()
        let px = worldStart.x
        let py = worldStart.y
        let pvx = vx
        let pvy = vy
        ctx.moveTo(px, py)

        for (let i = 0; i < 40; i++) {
          const distToCenter = Math.sqrt(px * px + py * py)
          if (distToCenter < BASE_PLANET_RADIUS + 5) break

          const force = G * 150 / (distToCenter * distToCenter)
          const ax = (-px / distToCenter) * force
          const ay = (-py / distToCenter) * force

          pvx += ax
          pvy += ay
          px += pvx
          py += pvy
          ctx.lineTo(px, py)
        }
        ctx.strokeStyle = 'oklch(0.75 0.25 150 / 0.4)'
        ctx.lineWidth = 2 / zoom
        ctx.setLineDash([4 / zoom, 4 / zoom])
        ctx.stroke()
        ctx.setLineDash([])

        ctx.fillStyle = 'oklch(0.75 0.25 150)'
        ctx.font = velocityFont
        ctx.fillText(`v: ${(magnitude * 0.05).toFixed(1)}`, worldStart.x + vx * 20 + 10/zoom, worldStart.y + vy * 20)
      }
    }

    ctx.restore()
  }, [offset, zoom, screenToWorld])

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

  const getMousePos = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      isPanningRef.current = true
      const pos = getMousePos(e)
      panStartRef.current = { x: pos.x - offset.x * zoom, y: pos.y - offset.y * zoom }
      return
    }

    const pos = getMousePos(e)
    dragRef.current = {
      isDragging: true,
      startX: pos.x,
      startY: pos.y,
      currentX: pos.x,
      currentY: pos.y,
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const pos = getMousePos(e)
      setOffset({
        x: (pos.x - panStartRef.current.x) / zoom,
        y: (pos.y - panStartRef.current.y) / zoom,
      })
      return
    }

    if (!dragRef.current.isDragging) {
      // Track mouse for hover detection
      const pos = getMousePos(e)
      dragRef.current.currentX = pos.x
      dragRef.current.currentY = pos.y
      return
    }

    const pos = getMousePos(e)
    dragRef.current.currentX = pos.x
    dragRef.current.currentY = pos.y
  }

  const handleMouseUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false
      return
    }

    if (!dragRef.current.isDragging) return

    const { startX, startY, currentX, currentY } = dragRef.current
    const dx = startX - currentX
    const dy = startY - currentY

    if (Math.sqrt(dx * dx + dy * dy) > 5) {
      const worldStart = screenToWorld(startX, startY)
      const newSatellite = createSatellite(
        worldStart.x,
        worldStart.y,
        dx * 0.05 / zoom,
        dy * 0.05 / zoom
      )
      satellitesRef.current.push(newSatellite)
      setSatelliteCount(satellitesRef.current.length)
    }

    dragRef.current.isDragging = false
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.3, Math.min(5, zoom * delta))
    setZoom(newZoom)
  }

  const resetView = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  const clearSatellites = () => {
    satellitesRef.current = []
    setSatelliteCount(0)
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
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="cursor-crosshair block"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            dragRef.current.isDragging = false
            isPanningRef.current = false
            setIsHovering(false)
            hoveredSatRef.current = null
          }}
          onWheel={handleWheel}
        />

        {/* Controls */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <button
            onClick={() => setZoom(z => Math.min(5, z * 1.2))}
            className="w-7 h-7 rounded bg-background/90 hover:bg-background border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(0.3, z * 0.8))}
            className="w-7 h-7 rounded bg-background/90 hover:bg-background border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            className="w-7 h-7 rounded bg-background/90 hover:bg-background border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Reset view"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Satellite count and Clear button */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <div className="text-xs text-white/80 bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
            <span className="font-medium text-primary">{satelliteCount}</span> satellites
          </div>
          {satelliteCount > 0 && (
            <button
              onClick={clearSatellites}
              className="text-xs px-2 py-1 rounded bg-background/80 hover:bg-background border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 text-[10px] bg-black/60 backdrop-blur-sm px-2 py-1.5 rounded text-white/70">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-3 h-0.5 bg-green-400"></span>
            <span>velocity (v)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-red-400"></span>
            <span>acceleration (a)</span>
          </div>
        </div>

        {/* Hint */}
        {isHovering && satelliteCount === 0 && !dragRef.current.isDragging && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-white/80 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
              Drag to aim • Scroll to zoom • Hover satellite for vectors
            </span>
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-xs font-medium text-muted-foreground">Orbit Playground</p>
        <p className="text-[10px] text-muted-foreground/60">Launch satellites • v ⟂ a toward Earth</p>
      </div>
    </div>
  )
}
