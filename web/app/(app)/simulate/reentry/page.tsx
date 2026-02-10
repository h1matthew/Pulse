'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Play, ChevronDown, ChevronRight, Settings2, Rocket, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { PlaybackControls } from '@/components/features/simulator/PlaybackControls'
import { HeatShieldStatus } from '@/components/features/simulator/HeatShieldStatus'
import { GForceMeter } from '@/components/features/simulator/GForceMeter'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  simulateReentry,
  calculateEntryCorridor,
  REENTRY_PRESETS,
  type ReentryParams,
  type ReentryResults,
  type ReentryPreset,
} from '@/lib/physics/reentrySimulator'
import { formatNumber } from '@/lib/physics/flightSimulator'
import { cn } from '@/lib/utils'

function ReentryVisualization({
  results,
  currentTime,
  params,
}: {
  results: ReentryResults | null
  currentTime: number
  params: ReentryParams
}) {
  const currentPoint = useMemo(() => {
    if (!results) return null
    return results.data.find((d) => d.time >= currentTime) || results.data[results.data.length - 1]
  }, [results, currentTime])

  const trajectoryPoints = useMemo(() => {
    if (!results) return []
    return results.data
      .filter((d) => d.time <= currentTime)
      .filter((_, i) => i % 3 === 0)
      .map((d) => ({
        // Map altitude (0-120km) to y position
        y: 90 - (d.altitude / params.entryAltitude) * 80,
        // Map downrange distance to x position
        x: 10 + (d.downrangeDistance / (results.data[results.data.length - 1]?.downrangeDistance || 1)) * 80,
        heatFlux: d.heatFlux,
        phase: d.phase,
      }))
  }, [results, currentTime, params.entryAltitude])

  if (!results || !currentPoint) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Configure parameters and click Simulate to begin re-entry</p>
      </div>
    )
  }

  const altPercent = (currentPoint.altitude / params.entryAltitude) * 100
  const vehicleY = 90 - altPercent * 0.8
  const vehicleX = 10 + (currentPoint.downrangeDistance / (results.data[results.data.length - 1]?.downrangeDistance || 1)) * 80

  // Heat glow intensity
  const heatIntensity = Math.min(1, currentPoint.heatFlux / (results.maxHeatFlux || 1))

  // Atmosphere layers
  const atmosphereLayers = [
    { name: 'Thermosphere', top: 0, bottom: 15, color: 'rgba(0, 0, 50, 0.3)' },
    { name: 'Mesosphere', top: 15, bottom: 30, color: 'rgba(30, 30, 80, 0.3)' },
    { name: 'Stratosphere', top: 30, bottom: 50, color: 'rgba(60, 100, 150, 0.3)' },
    { name: 'Troposphere', top: 50, bottom: 85, color: 'rgba(135, 206, 235, 0.3)' },
  ]

  return (
    <div className="h-full relative rounded-lg overflow-hidden">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Space background */}
        <rect x="0" y="0" width="100" height="10" fill="#0a0a20" />

        {/* Atmosphere layers */}
        {atmosphereLayers.map((layer, i) => (
          <rect
            key={i}
            x="0"
            y={layer.top}
            width="100"
            height={layer.bottom - layer.top}
            fill={layer.color}
          />
        ))}

        {/* Ground */}
        <rect x="0" y="85" width="100" height="15" fill="url(#groundGradientRE)" />
        <defs>
          <linearGradient id="groundGradientRE" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#365314" />
            <stop offset="100%" stopColor="#1a2e05" />
          </linearGradient>
        </defs>

        {/* Altitude scale lines */}
        {[0, 30, 60, 90, 120].map((alt) => (
          <g key={alt}>
            <line
              x1="0"
              y1={90 - (alt / 120) * 80}
              x2="100"
              y2={90 - (alt / 120) * 80}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeDasharray="2 2"
            />
            <text
              x="2"
              y={91 - (alt / 120) * 80}
              fontSize="3"
              fill="currentColor"
              opacity="0.4"
            >
              {alt}km
            </text>
          </g>
        ))}

        {/* Blackout zone indicator */}
        {currentPoint.isInBlackout && (
          <rect
            x="0"
            y={90 - (90 / 120) * 80}
            width="100"
            height={(60 / 120) * 80}
            fill="rgba(255, 0, 0, 0.1)"
            className="animate-pulse"
          />
        )}

        {/* Trajectory trail with heat coloring */}
        {trajectoryPoints.length > 1 && (
          <polyline
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1"
            strokeOpacity="0.5"
            points={trajectoryPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          />
        )}

        {/* Heat particles along trajectory */}
        {trajectoryPoints
          .filter((p) => p.heatFlux > results.maxHeatFlux * 0.3)
          .map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={0.5}
              fill={`rgb(255, ${100 - (p.heatFlux / results.maxHeatFlux) * 100}, 0)`}
              opacity={0.3}
            />
          ))}

        {/* Vehicle */}
        <g transform={`translate(${vehicleX}, ${vehicleY})`}>
          {/* Heat glow */}
          {heatIntensity > 0.1 && (
            <ellipse
              cx="0"
              cy="0"
              rx={3 + heatIntensity * 3}
              ry={2 + heatIntensity * 2}
              fill={`rgba(255, ${100 - heatIntensity * 100}, 0, ${heatIntensity * 0.6})`}
              className="animate-pulse"
            />
          )}

          {/* Capsule shape */}
          <ellipse
            cx="0"
            cy="0"
            rx="2"
            ry="1.5"
            fill="#E8E8EC"
            stroke={currentPoint.isInBlackout ? '#FF4444' : '#666'}
            strokeWidth="0.3"
          />

          {/* Heat shield */}
          <path
            d="M -2 0.5 Q 0 2 2 0.5"
            fill={`hsl(${currentPoint.heatShieldRemaining * 1.2}, 60%, 45%)`}
            stroke="#444"
            strokeWidth="0.2"
          />

          {/* Parachute if deployed */}
          {currentPoint.phase === 'parachute' && (
            <g transform="translate(0, -5)">
              <path
                d="M -4 0 Q 0 -3 4 0"
                fill="rgba(255, 100, 0, 0.8)"
                stroke="#CC4400"
                strokeWidth="0.2"
              />
              <line x1="-3" y1="0" x2="0" y2="5" stroke="#666" strokeWidth="0.1" />
              <line x1="3" y1="0" x2="0" y2="5" stroke="#666" strokeWidth="0.1" />
              <line x1="0" y1="0" x2="0" y2="5" stroke="#666" strokeWidth="0.1" />
            </g>
          )}
        </g>

        {/* Landing zone target */}
        <circle cx="90" cy="88" r="3" fill="none" stroke="var(--primary)" strokeWidth="0.3" />
        <circle cx="90" cy="88" r="1.5" fill="none" stroke="var(--primary)" strokeWidth="0.3" />
        <circle cx="90" cy="88" r="0.5" fill="var(--primary)" />
      </svg>

      {/* Phase indicator */}
      <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs">
        <div className={cn(
          'font-medium',
          currentPoint.phase === 'entry' ? 'text-blue-500' :
          currentPoint.phase === 'peak-heating' ? 'text-orange-500' :
          currentPoint.phase === 'deceleration' ? 'text-yellow-500' :
          currentPoint.phase === 'parachute' ? 'text-green-500' : 'text-foreground'
        )}>
          {currentPoint.phase.charAt(0).toUpperCase() + currentPoint.phase.slice(1).replace('-', ' ')}
        </div>
      </div>

      {/* Blackout indicator */}
      {currentPoint.isInBlackout && (
        <div className="absolute top-2 right-2 bg-red-500/20 backdrop-blur-sm rounded-lg px-3 py-2 text-xs flex items-center gap-2 animate-pulse">
          <WifiOff className="h-3 w-3 text-red-500" />
          <span className="text-red-500 font-medium">Communications Blackout</span>
        </div>
      )}

      {/* Stats overlay */}
      <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Altitude:</span>
          <span className="font-mono text-foreground">{(currentPoint.altitude / 1000).toFixed(1)} km</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Velocity:</span>
          <span className="font-mono text-foreground">{(currentPoint.velocity / 1000).toFixed(2)} km/s</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Mach:</span>
          <span className="font-mono text-foreground">{currentPoint.mach.toFixed(1)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Downrange:</span>
          <span className="font-mono text-foreground">{(currentPoint.downrangeDistance / 1000).toFixed(0)} km</span>
        </div>
      </div>
    </div>
  )
}

function ReentryGraphs({ results, currentTime }: { results: ReentryResults | null; currentTime: number }) {
  if (!results || results.data.length === 0) return null

  const maxTime = results.totalFlightTime
  const maxAlt = results.data[0]?.altitude || 120000
  const maxVel = results.data[0]?.velocity || 11000
  const maxHeat = results.maxHeatFlux

  const visibleData = results.data.filter((d) => d.time <= currentTime)

  const altitudePoints = visibleData
    .filter((_, i) => i % 5 === 0)
    .map((d) => `${(d.time / maxTime) * 100},${100 - (d.altitude / maxAlt) * 100}`)
    .join(' ')

  const velocityPoints = visibleData
    .filter((_, i) => i % 5 === 0)
    .map((d) => `${(d.time / maxTime) * 100},${100 - (d.velocity / maxVel) * 100}`)
    .join(' ')

  const heatPoints = visibleData
    .filter((_, i) => i % 5 === 0)
    .map((d) => `${(d.time / maxTime) * 100},${100 - (d.heatFlux / maxHeat) * 100}`)
    .join(' ')

  const gLoadPoints = visibleData
    .filter((_, i) => i % 5 === 0)
    .map((d) => `${(d.time / maxTime) * 100},${100 - (d.gLoad / results.maxGLoad) * 100}`)
    .join(' ')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-card rounded-lg border border-border/50 p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Altitude</h4>
        <div className="aspect-[16/10] relative">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" />
            <polyline fill="none" stroke="var(--primary)" strokeWidth="1" points={altitudePoints} />
          </svg>
          <div className="absolute top-0 left-0 text-[10px] text-muted-foreground">{(maxAlt / 1000).toFixed(0)}km</div>
          <div className="absolute bottom-0 right-0 text-[10px] text-muted-foreground">{formatNumber(maxTime)}s</div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border/50 p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Velocity</h4>
        <div className="aspect-[16/10] relative">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" />
            <polyline fill="none" stroke="var(--chart-2)" strokeWidth="1" points={velocityPoints} />
          </svg>
          <div className="absolute top-0 left-0 text-[10px] text-muted-foreground">{(maxVel / 1000).toFixed(1)}km/s</div>
          <div className="absolute bottom-0 right-0 text-[10px] text-muted-foreground">{formatNumber(maxTime)}s</div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border/50 p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Heat Flux</h4>
        <div className="aspect-[16/10] relative">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" />
            <polyline fill="none" stroke="var(--chart-3)" strokeWidth="1" points={heatPoints} />
          </svg>
          <div className="absolute top-0 left-0 text-[10px] text-muted-foreground">
            {maxHeat >= 1e6 ? `${(maxHeat / 1e6).toFixed(1)}MW` : `${(maxHeat / 1e3).toFixed(0)}kW`}
          </div>
          <div className="absolute bottom-0 right-0 text-[10px] text-muted-foreground">{formatNumber(maxTime)}s</div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border/50 p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">G-Load</h4>
        <div className="aspect-[16/10] relative">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" />
            <polyline fill="none" stroke="var(--chart-5)" strokeWidth="1" points={gLoadPoints} />
          </svg>
          <div className="absolute top-0 left-0 text-[10px] text-muted-foreground">{results.maxGLoad.toFixed(1)}g</div>
          <div className="absolute bottom-0 right-0 text-[10px] text-muted-foreground">{formatNumber(maxTime)}s</div>
        </div>
      </div>
    </div>
  )
}

export default function ReentrySimulatorPage() {
  const [preset, setPreset] = useState<string>('dragon')
  const [params, setParams] = useState<ReentryParams>(REENTRY_PRESETS.dragon.params as ReentryParams)

  const [results, setResults] = useState<ReentryResults | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(5) // Faster default for re-entry
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Collapsible state
  const [configOpen, setConfigOpen] = useState(true)

  const currentPoint = useMemo(() => {
    if (!results) return null
    return results.data.find((d) => d.time >= currentTime) || results.data[results.data.length - 1]
  }, [results, currentTime])

  const maxTime = useMemo(() => results?.totalFlightTime || 0, [results])

  const entryCorridor = useMemo(() =>
    calculateEntryCorridor(params.entryVelocity, params.vehicle),
    [params.entryVelocity, params.vehicle]
  )

  useEffect(() => {
    if (isPlaying && results && maxTime > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.1 * playbackSpeed
          if (next >= maxTime) {
            setIsPlaying(false)
            return maxTime
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
  }, [isPlaying, results, playbackSpeed, maxTime])

  const handlePresetChange = useCallback((presetKey: string) => {
    setPreset(presetKey)
    if (presetKey in REENTRY_PRESETS) {
      setParams(REENTRY_PRESETS[presetKey as ReentryPreset].params as ReentryParams)
    }
    setResults(null)
    setCurrentTime(0)
    setIsPlaying(false)
  }, [])

  const handleSimulate = useCallback(() => {
    const simulationResults = simulateReentry(params)
    setResults(simulationResults)
    setCurrentTime(0)
    setIsPlaying(true)
  }, [params])

  const handlePlayPause = useCallback(() => {
    if (!results) return
    if (currentTime >= maxTime) {
      setCurrentTime(0)
    }
    setIsPlaying((prev) => !prev)
  }, [results, currentTime, maxTime])

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time)
  }, [])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  // Entry angle validation
  const isAngleValid = params.entryAngle <= entryCorridor.minAngle && params.entryAngle >= entryCorridor.maxAngle

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
          Atmospheric Re-entry Simulator
        </h1>
        <p className="text-muted-foreground">
          Simulate spacecraft re-entry with heat flux, G-forces, and communications blackout.
        </p>
      </div>

      <div className="space-y-4">
        {/* 1. VISUALIZATION - Full width, top */}
        <div className="bg-card rounded-xl border border-border/50 p-4 h-[32rem]">
          <ReentryVisualization
            results={results}
            currentTime={currentTime}
            params={params}
          />
        </div>

        {/* 2. PLAYBACK CONTROLS */}
        {results && (
          <PlaybackControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            totalTime={maxTime}
            playbackSpeed={playbackSpeed}
            onPlayPause={handlePlayPause}
            onReset={handleReset}
            onSpeedChange={setPlaybackSpeed}
            onSeek={handleSeek}
            currentPhase={currentPoint?.phase}
          />
        )}

        {/* 3. GRAPHS */}
        <ReentryGraphs results={results} currentTime={currentTime} />

        {/* 4. LIVE INSTRUMENTS */}
        {currentPoint && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HeatShieldStatus
              remaining={currentPoint.heatShieldRemaining}
              heatFlux={currentPoint.heatFlux}
              maxHeatFlux={results?.maxHeatFlux || 1}
            />
            <GForceMeter
              currentG={currentPoint.gLoad}
              maxTolerance={params.vehicle.maxGLoad}
            />
          </div>
        )}

        {/* 5. RESULTS SUMMARY */}
        {results && (
          <div className="bg-card rounded-xl border border-border/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Re-entry Results</h3>
              <span className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                results.success ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'
              )}>
                {results.success ? 'Successful' : 'Failed'}
              </span>
            </div>

            {results.failureReason && (
              <div className="mb-4 p-2 bg-red-500/10 rounded text-sm text-red-600">
                {results.failureReason}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Max G-Load</p>
                <p className="text-lg font-semibold text-foreground">{results.maxGLoad.toFixed(1)}g</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Peak Heat Flux</p>
                <p className="text-lg font-semibold text-foreground">
                  {results.maxHeatFlux >= 1e6
                    ? `${(results.maxHeatFlux / 1e6).toFixed(2)} MW/m²`
                    : `${(results.maxHeatFlux / 1e3).toFixed(0)} kW/m²`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Blackout Duration</p>
                <p className="text-lg font-semibold text-foreground">{results.blackoutDuration.toFixed(0)}s</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Flight Time</p>
                <p className="text-lg font-semibold text-foreground">{(results.totalFlightTime / 60).toFixed(1)} min</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Landing Velocity</p>
                <p className="text-lg font-semibold text-foreground">{results.landingVelocity.toFixed(1)} m/s</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Peak Heating Alt</p>
                <p className="text-lg font-semibold text-foreground">{(results.peakHeatingAltitude / 1000).toFixed(1)} km</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Heat Load</p>
                <p className="text-lg font-semibold text-foreground">
                  {(results.totalHeatLoad / 1e6).toFixed(1)} MJ/m²
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Blackout Range</p>
                <p className="text-lg font-semibold text-foreground">
                  {results.blackoutDuration > 0
                    ? `${(results.blackoutStartAlt / 1000).toFixed(0)}-${(results.blackoutEndAlt / 1000).toFixed(0)} km`
                    : 'None'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 6. ENTRY SETTINGS - Collapsible */}
        <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
          {/* Quick Launch Bar */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Preset Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Vehicle:</span>
              <div className="relative">
                <select
                  value={preset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="appearance-none rounded-lg border border-border/50 bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {Object.entries(REENTRY_PRESETS).map(([key, { name }]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Entry Angle Indicator */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg",
              isAngleValid ? "bg-muted/50" : "bg-yellow-500/10"
            )}>
              <span className="text-sm text-muted-foreground">Entry:</span>
              <span className={cn(
                "font-mono font-semibold",
                isAngleValid ? "text-green-500" : "text-yellow-500"
              )}>
                {params.entryAngle.toFixed(1)}°
              </span>
              {!isAngleValid && (
                <span className="text-xs text-yellow-500">(Outside corridor)</span>
              )}
            </div>

            {/* Simulate Button */}
            <Button onClick={handleSimulate} disabled={isPlaying} className="gap-2">
              <Play className="h-4 w-4" />
              Simulate Re-entry
            </Button>
          </div>

          {/* Collapsible: Entry Parameters */}
          <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-semibold text-foreground hover:text-primary transition-colors">
              {configOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Rocket className="h-4 w-4" />
              Entry Parameters
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">Entry Velocity</Label>
                    <span className="text-xs text-foreground">{(params.entryVelocity / 1000).toFixed(1)} km/s</span>
                  </div>
                  <Slider
                    value={[params.entryVelocity]}
                    onValueChange={([v]) => {
                      setParams(p => ({ ...p, entryVelocity: v }))
                      setPreset('custom')
                      setResults(null)
                    }}
                    min={3000}
                    max={15000}
                    step={100}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Suborbital</span>
                    <span>LEO (7.8)</span>
                    <span>Lunar (11)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">Entry Angle</Label>
                    <span className={cn('text-xs', isAngleValid ? 'text-foreground' : 'text-yellow-500')}>
                      {params.entryAngle.toFixed(1)}°
                    </span>
                  </div>
                  <Slider
                    value={[params.entryAngle]}
                    onValueChange={([v]) => {
                      setParams(p => ({ ...p, entryAngle: v }))
                      setPreset('custom')
                      setResults(null)
                    }}
                    min={-15}
                    max={-0.5}
                    step={0.1}
                  />
                  <div className="flex justify-between text-[10px]">
                    <span className="text-orange-500">Steep (high G)</span>
                    <span className="text-green-500">Corridor: {entryCorridor.maxAngle.toFixed(1)}° to {entryCorridor.minAngle.toFixed(1)}°</span>
                    <span className="text-blue-500">Shallow</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">Vehicle Mass</Label>
                    <span className="text-xs text-foreground">{params.vehicle.mass.toLocaleString()} kg</span>
                  </div>
                  <Slider
                    value={[params.vehicle.mass]}
                    onValueChange={([v]) => {
                      setParams(p => ({ ...p, vehicle: { ...p.vehicle, mass: v } }))
                      setPreset('custom')
                      setResults(null)
                    }}
                    min={1000}
                    max={150000}
                    step={100}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">Parachute Deploy Alt</Label>
                    <span className="text-xs text-foreground">{(params.parachute.deployAltitude / 1000).toFixed(1)} km</span>
                  </div>
                  <Slider
                    value={[params.parachute.deployAltitude]}
                    onValueChange={([v]) => {
                      setParams(p => ({ ...p, parachute: { ...p.parachute, deployAltitude: v } }))
                      setPreset('custom')
                      setResults(null)
                    }}
                    min={2000}
                    max={15000}
                    step={500}
                  />
                </div>
              </div>

              {/* Warning for invalid entry angle */}
              {!isAngleValid && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-xs text-yellow-600">
                    Entry angle outside safe corridor. Risk of {params.entryAngle > entryCorridor.minAngle ? 'skip-out (too shallow)' : 'excessive G-load (too steep)'}.
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </main>
  )
}
