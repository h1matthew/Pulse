'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { ArrowRight, ChevronDown, ChevronRight, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlaybackControls } from '@/components/features/simulator/PlaybackControls'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  calculateHohmannTransfer,
  formatTime,
  ORBIT_PRESETS,
  EARTH_RADIUS_KM,
  type HohmannTransfer,
} from '@/lib/physics/orbitalMechanics'

function OrbitVisualization({
  transfer,
  animationProgress,
}: {
  transfer: HohmannTransfer | null
  animationProgress: number
}) {
  const viewBoxSize = 500
  const center = viewBoxSize / 2
  const maxRadius = viewBoxSize * 0.45

  // Generate deterministic stars using useMemo to prevent flickering
  const stars = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => {
      const seed = i * 7919 // Large prime for distribution
      return {
        id: i,
        cx: ((seed * 13) % 1000) / 1000 * viewBoxSize,
        cy: ((seed * 17) % 1000) / 1000 * viewBoxSize,
        r: 0.5 + ((seed * 23) % 100) / 100,
        opacity: 0.2 + ((seed * 29) % 100) / 100 * 0.5,
      }
    })
  }, [viewBoxSize])

  if (!transfer) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Set orbits and calculate transfer</p>
      </div>
    )
  }

  // Scale factor: map the largest orbit to maxRadius
  const maxOrbitRadius = Math.max(
    transfer.initialOrbit.apoapsisRadius,
    transfer.targetOrbit.apoapsisRadius,
    transfer.transferOrbit.apoapsisRadius
  )
  const scale = maxRadius / maxOrbitRadius

  // Earth radius in visualization
  const earthRadius = EARTH_RADIUS_KM * scale
  const initialRadius = transfer.initialOrbit.periapsisRadius * scale
  const targetRadius = transfer.targetOrbit.periapsisRadius * scale
  const transferPeriapsis = transfer.transferOrbit.periapsisRadius * scale
  const transferApoapsis = transfer.transferOrbit.apoapsisRadius * scale
  const transferSemiMajor = (transferPeriapsis + transferApoapsis) / 2
  const transferSemiMinor = Math.sqrt(transferPeriapsis * transferApoapsis)

  // Spacecraft position along transfer
  const angle = animationProgress * Math.PI // 0 to π for half orbit
  const spacecraftX = center + transferSemiMajor * Math.cos(angle + Math.PI)
  const spacecraftY = center + transferSemiMinor * Math.sin(angle + Math.PI)

  return (
    <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className="w-full h-full">
      {/* Background stars */}
      {stars.map((star) => (
        <circle
          key={star.id}
          cx={star.cx}
          cy={star.cy}
          r={star.r}
          fill="white"
          opacity={star.opacity}
        />
      ))}

      {/* Earth with atmosphere and continents */}
      <defs>
        {/* Atmosphere glow */}
        <radialGradient id="atmosphereGlow" cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor="#60a5fa" stopOpacity="0" />
          <stop offset="90%" stopColor="#60a5fa" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
        </radialGradient>
        {/* Ocean gradient with depth */}
        <radialGradient id="oceanGradient" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0369a1" />
        </radialGradient>
        {/* Land gradients */}
        <radialGradient id="landGradient1" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#166534" />
        </radialGradient>
        <radialGradient id="landGradient2" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#15803d" />
        </radialGradient>
        {/* Clip path for Earth */}
        <clipPath id="earthClip">
          <circle cx={center} cy={center} r={earthRadius} />
        </clipPath>
      </defs>

      {/* Atmosphere glow (outer ring) */}
      <circle
        cx={center}
        cy={center}
        r={earthRadius * 1.12}
        fill="url(#atmosphereGlow)"
      />

      {/* Ocean base */}
      <circle cx={center} cy={center} r={earthRadius} fill="url(#oceanGradient)" />

      {/* Continents */}
      <g clipPath="url(#earthClip)">
        {/* Americas (left side, vertical) */}
        <ellipse
          cx={center - earthRadius * 0.3}
          cy={center}
          rx={earthRadius * 0.25}
          ry={earthRadius * 0.55}
          fill="url(#landGradient1)"
          opacity={0.85}
        />
        {/* Europe/Africa (center-right, vertical) */}
        <ellipse
          cx={center + earthRadius * 0.2}
          cy={center + earthRadius * 0.05}
          rx={earthRadius * 0.28}
          ry={earthRadius * 0.6}
          fill="url(#landGradient2)"
          opacity={0.85}
        />
        {/* Asia (far right, horizontal) */}
        <ellipse
          cx={center + earthRadius * 0.5}
          cy={center - earthRadius * 0.15}
          rx={earthRadius * 0.4}
          ry={earthRadius * 0.35}
          fill="url(#landGradient1)"
          opacity={0.8}
        />
      </g>

      {/* Subtle highlight for 3D effect */}
      <circle
        cx={center - earthRadius * 0.3}
        cy={center - earthRadius * 0.3}
        r={earthRadius * 0.2}
        fill="white"
        opacity={0.1}
      />

      {/* Initial orbit (blue) */}
      <circle
        cx={center}
        cy={center}
        r={initialRadius}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1"
        strokeDasharray="4 2"
      />

      {/* Target orbit (green) */}
      <circle
        cx={center}
        cy={center}
        r={targetRadius}
        fill="none"
        stroke="var(--chart-2)"
        strokeWidth="1"
        strokeDasharray="4 2"
      />

      {/* Transfer orbit (orange, elliptical) */}
      <ellipse
        cx={center}
        cy={center}
        rx={transferSemiMajor}
        ry={transferSemiMinor}
        fill="none"
        stroke="var(--chart-3)"
        strokeWidth="1"
        opacity={0.8}
      />

      {/* Periapsis marker */}
      <circle
        cx={center - initialRadius}
        cy={center}
        r={4}
        fill="var(--primary)"
      />
      <text
        x={center - initialRadius - 10}
        y={center + 15}
        fill="var(--primary)"
        fontSize="10"
        textAnchor="end"
      >
        PE
      </text>

      {/* Apoapsis marker */}
      <circle
        cx={center + targetRadius}
        cy={center}
        r={4}
        fill="var(--chart-2)"
      />
      <text
        x={center + targetRadius + 10}
        y={center + 15}
        fill="var(--chart-2)"
        fontSize="10"
        textAnchor="start"
      >
        AP
      </text>

      {/* Spacecraft */}
      {animationProgress > 0 && animationProgress < 1 && (
        <g transform={`translate(${spacecraftX}, ${spacecraftY})`}>
          <circle r={6} fill="white" stroke="var(--chart-3)" strokeWidth="2" />
          <polygon
            points="-3,-4 3,-4 0,-8"
            fill="white"
            transform={`rotate(${(angle * 180) / Math.PI + 90})`}
          />
        </g>
      )}

      {/* Burn indicators */}
      <g transform={`translate(${center - initialRadius}, ${center})`}>
        <circle r={8} fill="none" stroke="orange" strokeWidth="2" strokeDasharray="2 2" />
        <text x={0} y={-15} fill="orange" fontSize="9" textAnchor="middle">
          ΔV₁
        </text>
      </g>
      <g transform={`translate(${center + targetRadius}, ${center})`}>
        <circle r={8} fill="none" stroke="orange" strokeWidth="2" strokeDasharray="2 2" />
        <text x={0} y={-15} fill="orange" fontSize="9" textAnchor="middle">
          ΔV₂
        </text>
      </g>

      {/* Legend */}
      <g transform="translate(10, 20)">
        <line x1="0" y1="0" x2="20" y2="0" stroke="var(--primary)" strokeWidth="2" strokeDasharray="4 2" />
        <text x="25" y="4" fill="currentColor" fontSize="10">Initial Orbit</text>
      </g>
      <g transform="translate(10, 35)">
        <line x1="0" y1="0" x2="20" y2="0" stroke="var(--chart-2)" strokeWidth="2" strokeDasharray="4 2" />
        <text x="25" y="4" fill="currentColor" fontSize="10">Target Orbit</text>
      </g>
      <g transform="translate(10, 50)">
        <line x1="0" y1="0" x2="20" y2="0" stroke="var(--chart-3)" strokeWidth="2" />
        <text x="25" y="4" fill="currentColor" fontSize="10">Transfer Orbit</text>
      </g>
    </svg>
  )
}

export default function OrbitalSimulatorPage() {
  const [initialAltitude, setInitialAltitude] = useState(400) // km
  const [targetAltitude, setTargetAltitude] = useState(35786) // km (GEO)
  const [transfer, setTransfer] = useState<HohmannTransfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [animationProgress, setAnimationProgress] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Collapsible state
  const [configOpen, setConfigOpen] = useState(true)

  // Playback effect
  useEffect(() => {
    if (isPlaying && transfer) {
      intervalRef.current = setInterval(() => {
        setAnimationProgress((prev) => {
          const next = prev + 0.01 * playbackSpeed
          if (next >= 1) {
            setIsPlaying(false)
            return 1
          }
          return next
        })
      }, 50)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isPlaying, transfer, playbackSpeed])

  const handleCalculate = useCallback(() => {
    const result = calculateHohmannTransfer(initialAltitude, targetAltitude)
    setTransfer(result)
    setAnimationProgress(0)
    setIsPlaying(false)
  }, [initialAltitude, targetAltitude])

  const handleAnimate = useCallback(() => {
    if (!transfer) return
    setAnimationProgress(0)
    setIsPlaying(true)
  }, [transfer])

  const handlePlayPause = useCallback(() => {
    if (!transfer) return
    if (animationProgress >= 1) {
      setAnimationProgress(0)
    }
    setIsPlaying((prev) => !prev)
  }, [transfer, animationProgress])

  const handleSeek = useCallback((progress: number) => {
    setAnimationProgress(progress)
  }, [])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setAnimationProgress(0)
  }, [])

  // Calculate on mount
  useEffect(() => {
    handleCalculate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Get current phase based on animation progress
  const currentPhase = useMemo(() => {
    if (animationProgress === 0) return 'Initial Orbit'
    if (animationProgress >= 1) return 'Target Orbit'
    if (animationProgress < 0.1) return 'First Burn'
    if (animationProgress > 0.9) return 'Second Burn'
    return 'Transfer'
  }, [animationProgress])

  const presetOptions = useMemo(() => Object.entries(ORBIT_PRESETS), [])

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
          Orbital Mechanics Simulator
        </h1>
        <p className="text-muted-foreground">
          Calculate Hohmann transfer orbits between two circular orbits. See delta-v requirements and transfer times.
        </p>
      </div>

      <div className="space-y-4">
        {/* 1. VISUALIZATION - Full width, top, centered square */}
        <div className="bg-card rounded-xl border border-border/50 p-4 h-[32rem] flex items-center justify-center">
          <div className="aspect-square h-full max-w-full">
            <OrbitVisualization transfer={transfer} animationProgress={animationProgress} />
          </div>
        </div>

        {/* 2. PLAYBACK CONTROLS */}
        {transfer && (
          <PlaybackControls
            isPlaying={isPlaying}
            currentTime={animationProgress}
            totalTime={1}
            playbackSpeed={playbackSpeed}
            onPlayPause={handlePlayPause}
            onReset={handleReset}
            onSpeedChange={setPlaybackSpeed}
            onSeek={handleSeek}
            currentPhase={currentPhase}
            showAsProgress
          />
        )}

        {/* 3. TRANSFER REQUIREMENTS */}
        {transfer && (
          <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Transfer Requirements</h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">First Burn (ΔV₁)</p>
                <p className="text-lg font-semibold text-orange-500">
                  {transfer.deltaV1.toFixed(1)} m/s
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Second Burn (ΔV₂)</p>
                <p className="text-lg font-semibold text-orange-500">
                  {transfer.deltaV2.toFixed(1)} m/s
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total ΔV</p>
                <p className="text-lg font-semibold text-foreground">
                  {transfer.totalDeltaV.toFixed(1)} m/s
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transfer Time</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatTime(transfer.transferTime)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. ORBITAL INFO CARDS */}
        {transfer && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-card rounded-xl border border-border/50 p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                Initial Orbit
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Altitude</span>
                  <span className="font-mono">{transfer.initialOrbit.periapsisAltitude} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Velocity</span>
                  <span className="font-mono">{transfer.initialOrbit.periapsisVelocity.toFixed(0)} m/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-mono">{formatTime(transfer.initialOrbit.orbitalPeriod)}</span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border/50 p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-chart-3" />
                Transfer Orbit
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Periapsis</span>
                  <span className="font-mono">{transfer.transferOrbit.periapsisAltitude} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Apoapsis</span>
                  <span className="font-mono">{transfer.transferOrbit.apoapsisAltitude} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Eccentricity</span>
                  <span className="font-mono">{transfer.transferOrbit.eccentricity.toFixed(3)}</span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border/50 p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-chart-2" />
                Target Orbit
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Altitude</span>
                  <span className="font-mono">{transfer.targetOrbit.periapsisAltitude} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Velocity</span>
                  <span className="font-mono">{transfer.targetOrbit.periapsisVelocity.toFixed(0)} m/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-mono">{formatTime(transfer.targetOrbit.orbitalPeriod)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. ORBIT CONFIGURATION - Collapsible */}
        <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
          {/* Quick Actions Bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <Button onClick={handleCalculate}>
              Calculate Transfer
            </Button>
            <Button
              variant="outline"
              onClick={handleAnimate}
              disabled={!transfer || isPlaying}
            >
              Start Transfer
            </Button>
          </div>

          {/* Collapsible: Orbit Parameters */}
          <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-semibold text-foreground hover:text-primary transition-colors">
              {configOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Settings2 className="h-4 w-4" />
              Orbit Configuration
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Initial Orbit */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <h4 className="text-sm font-medium text-foreground">Initial Orbit</h4>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">Altitude (km)</label>
                    <input
                      type="number"
                      value={initialAltitude}
                      onChange={(e) => setInitialAltitude(Math.max(100, parseInt(e.target.value) || 0))}
                      className="w-full mt-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {presetOptions.map(([key, { name, altitude }]) => (
                      <button
                        key={key}
                        onClick={() => setInitialAltitude(altitude)}
                        className={`text-xs px-2 py-1 rounded-md transition-colors ${
                          initialAltitude === altitude
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Orbit */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-chart-2" />
                    <h4 className="text-sm font-medium text-foreground">Target Orbit</h4>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">Altitude (km)</label>
                    <input
                      type="number"
                      value={targetAltitude}
                      onChange={(e) => setTargetAltitude(Math.max(100, parseInt(e.target.value) || 0))}
                      className="w-full mt-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {presetOptions.map(([key, { name, altitude }]) => (
                      <button
                        key={key}
                        onClick={() => setTargetAltitude(altitude)}
                        className={`text-xs px-2 py-1 rounded-md transition-colors ${
                          targetAltitude === altitude
                            ? 'bg-chart-2 text-white'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transfer Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </main>
  )
}
