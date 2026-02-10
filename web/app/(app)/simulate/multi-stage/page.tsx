'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Play, ChevronDown, ChevronRight, Settings2, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { PlaybackControls } from '@/components/features/simulator/PlaybackControls'
import { StageConfigurator } from '@/components/features/simulator/StageConfigurator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  simulateMultiStage,
  calculateTotalDeltaV,
  calculateInitialTWR,
  MULTI_STAGE_PRESETS,
  type MultiStageParams,
  type MultiStageResults,
  type Stage,
  type StagingEvent,
  type MultiStagePreset,
} from '@/lib/physics/multiStageSimulator'
import { formatNumber } from '@/lib/physics/flightSimulator'

// Stage colors for visualization
const STAGE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
]

function StageVisualization({
  results,
  currentTime,
  animationFrame,
  stages,
}: {
  results: MultiStageResults | null
  currentTime: number
  animationFrame: number
  stages: Stage[]
}) {
  const stars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => {
      const seed = i * 7919
      return {
        id: i,
        x: ((seed * 13) % 1000) / 1000 * 100,
        y: ((seed * 17) % 1000) / 1000 * 70,
        size: 0.3 + ((seed * 23) % 100) / 100 * 0.8,
        brightness: 0.3 + ((seed * 29) % 100) / 100 * 0.7,
      }
    })
  }, [])

  const currentPoint = useMemo(() => {
    if (!results) return null
    return results.data.find((d) => d.time >= currentTime) || results.data[results.data.length - 1]
  }, [results, currentTime])

  const trajectoryPoints = useMemo(() => {
    if (!results) return []
    return results.data
      .filter((d) => d.time <= currentTime)
      .filter((_, i) => i % 2 === 0)
      .map((d) => ({
        x: 50,
        y: 95 - (d.altitude / results.maxAltitude) * 85,
      }))
  }, [results, currentTime])

  const exhaustParticles = useMemo(() => {
    if (!currentPoint || currentPoint.phase !== 'powered') return []
    return Array.from({ length: 10 }, (_, i) => {
      const seed = (animationFrame * 0.15 + i * 0.7) % (Math.PI * 2)
      return {
        id: i,
        xOffset: Math.sin(seed + i) * 2,
        yOffset: 8 + i * 4,
        size: (10 - i) * 0.5,
        opacity: (1 - i / 10) * 0.9,
        color: i < 3 ? '#FFE0A0' : i < 6 ? '#FFA040' : '#FF4020',
      }
    })
  }, [currentPoint, animationFrame])

  // Get separated stages (stages that have been jettisoned)
  const separatedStages = useMemo(() => {
    if (!results) return []
    const separated: { stageIndex: number; separationTime: number; separationAlt: number }[] = []
    for (const event of results.events) {
      if (event.type === 'separation') {
        const stageIndex = stages.findIndex(s => s.id === event.stageId)
        if (stageIndex >= 0) {
          separated.push({
            stageIndex,
            separationTime: event.time,
            separationAlt: event.altitude,
          })
        }
      }
    }
    return separated
  }, [results, stages])

  if (!results || !currentPoint) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Configure stages and click Launch to simulate</p>
      </div>
    )
  }

  const altitudePercent = (currentPoint.altitude / results.maxAltitude) * 100
  const rocketY = 95 - altitudePercent * 0.85
  const velocityNormalized = Math.max(-1, Math.min(1, currentPoint.velocity / 50))
  const rocketRotation = velocityNormalized >= 0 ? 0 : 180
  const skyDarkness = Math.min(1, altitudePercent / 70)
  const starOpacity = Math.max(0, (altitudePercent - 30) / 70)

  // Determine which stages are still attached
  const attachedStageCount = stages.length - separatedStages.filter(s => currentTime > s.separationTime).length

  return (
    <div className="h-full relative rounded-lg overflow-hidden">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="skyGradientMS" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={`rgb(${Math.round(10 + (1 - skyDarkness) * 50)}, ${Math.round(20 + (1 - skyDarkness) * 60)}, ${Math.round(60 + (1 - skyDarkness) * 120)})`}
            />
            <stop
              offset="50%"
              stopColor={`rgb(${Math.round(80 - skyDarkness * 60)}, ${Math.round(160 - skyDarkness * 130)}, ${Math.round(220 - skyDarkness * 180)})`}
            />
            <stop offset="100%" stopColor="var(--background)" />
          </linearGradient>
          <linearGradient id="groundGradientMS" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#365314" />
            <stop offset="100%" stopColor="#1a2e05" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="100" fill="url(#skyGradientMS)" />

        {stars.map((star) => (
          <circle
            key={star.id}
            cx={star.x}
            cy={star.y}
            r={star.size}
            fill="white"
            opacity={star.brightness * starOpacity}
          />
        ))}

        <rect x="0" y="95" width="100" height="5" fill="url(#groundGradientMS)" />

        {trajectoryPoints.length > 1 && (
          <polyline
            fill="none"
            stroke="var(--primary)"
            strokeWidth="0.8"
            strokeOpacity="0.4"
            strokeDasharray="2 1"
            points={trajectoryPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          />
        )}

        {/* Staging event markers */}
        {results.events.map((event, i) => {
          if (event.time > currentTime) return null
          const eventY = 95 - (event.altitude / results.maxAltitude) * 85
          const stageIndex = stages.findIndex(s => s.id === event.stageId)
          const color = STAGE_COLORS[stageIndex % STAGE_COLORS.length]

          if (event.type === 'separation') {
            return (
              <g key={`event-${i}`}>
                <circle cx="50" cy={eventY} r="1.2" fill={color} stroke="white" strokeWidth="0.2" />
                <text x="53" y={eventY + 0.5} fontSize="2.5" fill={color}>Sep</text>
              </g>
            )
          }
          return null
        })}

        {/* Separated stages falling */}
        {separatedStages.map((sep) => {
          if (currentTime <= sep.separationTime) return null
          const timeSinceSep = currentTime - sep.separationTime
          const fallDistance = 0.5 * 9.81 * timeSinceSep * timeSinceSep
          const sepAltPercent = ((sep.separationAlt - fallDistance) / results.maxAltitude) * 100
          if (sepAltPercent < 0) return null
          const sepY = 95 - Math.max(0, sepAltPercent) * 0.85
          const color = STAGE_COLORS[sep.stageIndex % STAGE_COLORS.length]
          const tumbleAngle = timeSinceSep * 50

          return (
            <g key={`sep-stage-${sep.stageIndex}`} transform={`translate(${50 + timeSinceSep * 2}, ${sepY}) rotate(${tumbleAngle}) scale(0.08)`}>
              <rect x="-6" y="-15" width="12" height="30" fill={color} rx="2" />
            </g>
          )
        })}

        {/* Main rocket */}
        <g transform={`translate(50, ${rocketY}) rotate(${rocketRotation}) scale(0.12)`}>
          {/* Exhaust */}
          {exhaustParticles.map((p) => (
            <ellipse
              key={p.id}
              cx={p.xOffset}
              cy={p.yOffset + attachedStageCount * 25}
              rx={p.size * 0.6}
              ry={p.size}
              fill={p.color}
              opacity={p.opacity}
            />
          ))}

          {/* Stages (bottom to top) - only show attached ones */}
          {stages.slice(0, attachedStageCount).reverse().map((stage, reverseIndex) => {
            const actualIndex = attachedStageCount - 1 - reverseIndex
            const color = STAGE_COLORS[actualIndex % STAGE_COLORS.length]
            const yOffset = reverseIndex * 25
            const isActive = currentPoint.currentStage === actualIndex

            return (
              <g key={stage.id} transform={`translate(0, ${yOffset})`}>
                <rect
                  x="-10"
                  y="0"
                  width="20"
                  height="22"
                  fill={color}
                  stroke={isActive ? '#FFD700' : '#666'}
                  strokeWidth={isActive ? 2 : 0.5}
                  rx="2"
                />
                {actualIndex === 0 && (
                  <path d="M -6 0 L 0 -15 L 6 0 Z" fill={color} stroke="#666" strokeWidth="0.5" />
                )}
              </g>
            )
          })}

          {/* Payload (always on top) */}
          <g transform={`translate(0, ${-15})`}>
            <rect x="-6" y="-10" width="12" height="15" fill="#E8E8EC" stroke="#999" strokeWidth="0.5" rx="2" />
            <circle cx="0" cy="-5" r="3" fill="#60A5FA" stroke="#2563EB" strokeWidth="0.5" />
          </g>
        </g>

        <text x="3" y="8" fontSize="3" fill="currentColor" opacity="0.5">{formatNumber(results.maxAltitude)}m</text>
        <text x="3" y="50" fontSize="3" fill="currentColor" opacity="0.5">{formatNumber(results.maxAltitude * 0.5)}m</text>
        <text x="3" y="93" fontSize="3" fill="currentColor" opacity="0.5">0m</text>
      </svg>

      <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Altitude:</span>
          <span className="font-mono text-foreground">{formatNumber(currentPoint.altitude)}m</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Velocity:</span>
          <span className="font-mono text-foreground">{formatNumber(currentPoint.velocity)}m/s</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">ΔV Used:</span>
          <span className="font-mono text-foreground">{formatNumber(currentPoint.deltaVExpended)}m/s</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Phase:</span>
          <span className={`font-medium ${
            currentPoint.phase === 'powered' ? 'text-orange-500' :
            currentPoint.phase === 'separation' ? 'text-yellow-500' :
            currentPoint.phase === 'coast' ? 'text-blue-500' : 'text-green-500'
          }`}>
            {currentPoint.phase.charAt(0).toUpperCase() + currentPoint.phase.slice(1)}
            {currentPoint.currentStage >= 0 && ` (S${currentPoint.currentStage + 1})`}
          </span>
        </div>
      </div>
    </div>
  )
}

function FlightGraphs({ results, currentTime }: { results: MultiStageResults | null; currentTime: number }) {
  if (!results || results.data.length === 0) return null

  const maxTime = results.data[results.data.length - 1]?.time
  const maxAlt = results.maxAltitude
  const maxDV = results.theoreticalDeltaV

  if (!maxTime || maxTime === 0 || !maxAlt || maxAlt === 0) return null

  const velocities = results.data.map(d => d.velocity)
  const minVel = Math.min(...velocities)
  const maxVel = Math.max(...velocities)
  const velRange = maxVel - minVel || 1

  const visibleData = results.data.filter((d) => d.time <= currentTime)

  const altitudePoints = visibleData
    .filter((_, i) => i % 3 === 0)
    .map((d) => {
      const x = (d.time / maxTime) * 100
      const y = 100 - (d.altitude / maxAlt) * 100
      return isNaN(x) || isNaN(y) ? null : `${x},${y}`
    })
    .filter(Boolean)
    .join(' ')

  const velocityPoints = visibleData
    .filter((_, i) => i % 3 === 0)
    .map((d) => {
      const x = (d.time / maxTime) * 100
      const normalizedVel = (d.velocity - minVel) / velRange
      const y = 100 - normalizedVel * 100
      return isNaN(x) || isNaN(y) ? null : `${x},${y}`
    })
    .filter(Boolean)
    .join(' ')

  const deltaVPoints = visibleData
    .filter((_, i) => i % 3 === 0)
    .map((d) => {
      const x = (d.time / maxTime) * 100
      const y = 100 - (d.deltaVExpended / maxDV) * 100
      return isNaN(x) || isNaN(y) ? null : `${x},${y}`
    })
    .filter(Boolean)
    .join(' ')

  // Staging event lines
  const stagingMarkers = results.events
    .filter(e => e.time <= currentTime)
    .map((e, i) => {
      const x = (e.time / maxTime) * 100
      const color = e.type === 'separation' ? 'var(--chart-3)' : e.type === 'ignition' ? 'var(--chart-2)' : 'var(--chart-5)'
      return (
        <line
          key={i}
          x1={x}
          y1={0}
          x2={x}
          y2={100}
          stroke={color}
          strokeWidth="0.5"
          strokeDasharray="2 2"
          opacity="0.6"
        />
      )
    })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="bg-card rounded-lg border border-border/50 p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Altitude vs Time</h4>
        <div className="aspect-[16/10] relative">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" />
            {stagingMarkers}
            <polyline fill="none" stroke="var(--primary)" strokeWidth="1" points={altitudePoints} />
          </svg>
          <div className="absolute top-0 left-0 text-[10px] text-muted-foreground">{formatNumber(maxAlt)}m</div>
          <div className="absolute bottom-0 right-0 text-[10px] text-muted-foreground">{formatNumber(maxTime)}s</div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border/50 p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Velocity vs Time</h4>
        <div className="aspect-[16/10] relative">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" />
            {stagingMarkers}
            <polyline fill="none" stroke="var(--chart-2)" strokeWidth="1" points={velocityPoints} />
          </svg>
          <div className="absolute top-0 left-0 text-[10px] text-muted-foreground">{formatNumber(maxVel)}m/s</div>
          <div className="absolute bottom-0 right-0 text-[10px] text-muted-foreground">{formatNumber(maxTime)}s</div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border/50 p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">ΔV Expended</h4>
        <div className="aspect-[16/10] relative">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" />
            {stagingMarkers}
            <polyline fill="none" stroke="var(--chart-3)" strokeWidth="1" points={deltaVPoints} />
          </svg>
          <div className="absolute top-0 left-0 text-[10px] text-muted-foreground">{formatNumber(maxDV)}m/s</div>
          <div className="absolute bottom-0 right-0 text-[10px] text-muted-foreground">{formatNumber(maxTime)}s</div>
        </div>
      </div>
    </div>
  )
}

function EventTimeline({ events, currentTime }: { events: StagingEvent[]; currentTime: number }) {
  if (events.length === 0) return null

  const maxTime = events[events.length - 1]?.time || 1

  return (
    <div className="bg-card rounded-lg border border-border/50 p-4">
      <h4 className="text-sm font-medium text-foreground mb-3">Staging Events</h4>
      <div className="relative h-8 bg-muted rounded-full overflow-hidden">
        {events.map((event, i) => {
          const x = (event.time / maxTime) * 100
          const isPast = event.time <= currentTime
          const color = event.type === 'ignition' ? 'bg-green-500' :
                        event.type === 'burnout' ? 'bg-orange-500' : 'bg-red-500'
          return (
            <div
              key={i}
              className={`absolute top-0 bottom-0 w-1 ${color} ${isPast ? 'opacity-100' : 'opacity-30'}`}
              style={{ left: `${x}%` }}
              title={`${event.stageName}: ${event.type} at ${event.time.toFixed(1)}s`}
            />
          )
        })}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary"
          style={{ left: `${(currentTime / maxTime) * 100}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {events.filter(e => e.time <= currentTime).map((event, i) => (
          <span
            key={i}
            className={`text-xs px-2 py-0.5 rounded ${
              event.type === 'ignition' ? 'bg-green-500/20 text-green-600' :
              event.type === 'burnout' ? 'bg-orange-500/20 text-orange-600' :
              'bg-red-500/20 text-red-600'
            }`}
          >
            {event.stageName} {event.type} ({event.time.toFixed(1)}s)
          </span>
        ))}
      </div>
    </div>
  )
}

export default function MultiStageSimulatorPage() {
  const [preset, setPreset] = useState<string>('custom')
  const [stages, setStages] = useState<Stage[]>(MULTI_STAGE_PRESETS.custom.params.stages as unknown as Stage[])
  const [payloadMass, setPayloadMass] = useState<number>(MULTI_STAGE_PRESETS.custom.params.payloadMass)
  const [dragCoefficient, setDragCoefficient] = useState<number>(MULTI_STAGE_PRESETS.custom.params.dragCoefficient)
  const [crossSectionalArea, setCrossSectionalArea] = useState<number>(MULTI_STAGE_PRESETS.custom.params.crossSectionalArea)
  const [separationDelay, setSeparationDelay] = useState<number>(MULTI_STAGE_PRESETS.custom.params.separationDelay)

  const [results, setResults] = useState<MultiStageResults | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [animationFrame, setAnimationFrame] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Collapsible state
  const [configOpen, setConfigOpen] = useState(true)

  const params: MultiStageParams = useMemo(() => ({
    stages,
    payloadMass,
    dragCoefficient,
    crossSectionalArea,
    separationDelay,
  }), [stages, payloadMass, dragCoefficient, crossSectionalArea, separationDelay])

  const twr = useMemo(() => calculateInitialTWR(params), [params])
  const theoreticalDV = useMemo(() => calculateTotalDeltaV(params), [params])

  const currentPhase = useMemo(() => {
    if (!results) return undefined
    const point = results.data.find((d) => d.time >= currentTime) || results.data[results.data.length - 1]
    return point?.phase
  }, [results, currentTime])

  const maxTime = useMemo(() => {
    return results?.data[results.data.length - 1]?.time || 0
  }, [results])

  useEffect(() => {
    if (isPlaying && results && maxTime > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.05 * playbackSpeed
          if (next >= maxTime) {
            setIsPlaying(false)
            return maxTime
          }
          return next
        })
        setAnimationFrame((prev) => prev + 1)
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
    if (presetKey in MULTI_STAGE_PRESETS) {
      const p = MULTI_STAGE_PRESETS[presetKey as MultiStagePreset].params
      setStages(p.stages.map(s => ({ ...s })))
      setPayloadMass(p.payloadMass)
      setDragCoefficient(p.dragCoefficient)
      setCrossSectionalArea(p.crossSectionalArea)
      setSeparationDelay(p.separationDelay)
    }
    setResults(null)
    setCurrentTime(0)
    setIsPlaying(false)
  }, [])

  const handleLaunch = useCallback(() => {
    const simulationResults = simulateMultiStage(params)
    setResults(simulationResults)
    setCurrentTime(0)
    setAnimationFrame(0)
    setIsPlaying(true)
  }, [params])

  const handlePlayPause = useCallback(() => {
    if (!results) return
    if (currentTime >= maxTime) {
      setCurrentTime(0)
      setAnimationFrame(0)
    }
    setIsPlaying((prev) => !prev)
  }, [results, currentTime, maxTime])

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time)
  }, [])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setAnimationFrame(0)
  }, [])

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
          Multi-Stage Rocket Simulator
        </h1>
        <p className="text-muted-foreground">
          Design multi-stage rockets and watch staging events. Calculate delta-V using the Tsiolkovsky rocket equation.
        </p>
      </div>

      <div className="space-y-4">
        {/* 1. VISUALIZATION - Full width, top */}
        <div className="bg-card rounded-xl border border-border/50 p-4 h-[32rem]">
          <StageVisualization
            results={results}
            currentTime={currentTime}
            animationFrame={animationFrame}
            stages={stages}
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
            currentPhase={currentPhase}
          />
        )}

        {/* 3. GRAPHS */}
        <FlightGraphs results={results} currentTime={currentTime} />

        {/* 4. EVENT TIMELINE */}
        {results && <EventTimeline events={results.events} currentTime={currentTime} />}

        {/* 5. RESULTS SUMMARY */}
        {results && (
          <div className="bg-card rounded-xl border border-border/50 p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Flight Results</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Max Altitude</p>
                <p className="text-lg font-semibold text-foreground">
                  {results.maxAltitude >= 1000
                    ? `${(results.maxAltitude / 1000).toFixed(1)} km`
                    : `${formatNumber(results.maxAltitude)} m`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max Velocity</p>
                <p className="text-lg font-semibold text-foreground">
                  {results.maxVelocity >= 1000
                    ? `${(results.maxVelocity / 1000).toFixed(2)} km/s`
                    : `${formatNumber(results.maxVelocity)} m/s`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total ΔV Achieved</p>
                <p className="text-lg font-semibold text-foreground">{formatNumber(results.totalDeltaV)} m/s</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Theoretical ΔV</p>
                <p className="text-lg font-semibold text-foreground">{formatNumber(results.theoreticalDeltaV)} m/s</p>
              </div>
            </div>

            {results.stageContributions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Per-Stage ΔV Contribution</h4>
                <div className="flex gap-2">
                  {results.stageContributions.map((sc, i) => (
                    <div
                      key={sc.stageId}
                      className="flex-1 rounded-lg p-2 text-center"
                      style={{ backgroundColor: `${STAGE_COLORS[i % STAGE_COLORS.length]}20` }}
                    >
                      <p className="text-xs text-muted-foreground">Stage {i + 1}</p>
                      <p className="text-sm font-semibold" style={{ color: STAGE_COLORS[i % STAGE_COLORS.length] }}>
                        {formatNumber(sc.deltaV)} m/s
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. LAUNCH SETTINGS - Collapsible sections */}
        <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
          {/* Quick Launch Bar */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Preset Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Preset:</span>
              <div className="relative">
                <select
                  value={preset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="appearance-none rounded-lg border border-border/50 bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {Object.entries(MULTI_STAGE_PRESETS).map(([key, { name }]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* TWR Indicator */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">TWR:</span>
              <span className={`font-mono font-semibold ${twr >= 1 ? 'text-green-500' : 'text-red-500'}`}>
                {twr.toFixed(2)}
              </span>
              {twr < 1 && (
                <span className="text-xs text-red-500">(Won&apos;t lift off)</span>
              )}
            </div>

            {/* Launch Button */}
            <Button
              onClick={handleLaunch}
              disabled={isPlaying || twr < 1 || stages.length === 0}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Launch
            </Button>
          </div>

          {/* Collapsible: Stage Configurator & Vehicle Parameters */}
          <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-semibold text-foreground hover:text-primary transition-colors">
              {configOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Layers className="h-4 w-4" />
              Stage Configuration & Parameters
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-6">
              {/* Stage Configurator */}
              <StageConfigurator
                stages={stages}
                payloadMass={payloadMass}
                onChange={(newStages) => {
                  setStages(newStages)
                  setPreset('custom')
                  setResults(null)
                }}
              />

              {/* Vehicle Parameters */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Vehicle Parameters
                </h4>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-xs text-muted-foreground">Payload Mass</Label>
                      <span className="text-xs text-foreground">
                        {payloadMass >= 1000 ? `${(payloadMass / 1000).toFixed(1)} t` : `${payloadMass} kg`}
                      </span>
                    </div>
                    <Slider
                      value={[payloadMass]}
                      onValueChange={([v]) => {
                        setPayloadMass(v)
                        setPreset('custom')
                        setResults(null)
                      }}
                      min={10}
                      max={200000}
                      step={10}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-xs text-muted-foreground">Drag Coefficient</Label>
                      <span className="text-xs text-foreground">{dragCoefficient.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[dragCoefficient]}
                      onValueChange={([v]) => {
                        setDragCoefficient(v)
                        setPreset('custom')
                        setResults(null)
                      }}
                      min={0.1}
                      max={1.5}
                      step={0.05}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-xs text-muted-foreground">Separation Delay</Label>
                      <span className="text-xs text-foreground">{separationDelay}s</span>
                    </div>
                    <Slider
                      value={[separationDelay]}
                      onValueChange={([v]) => {
                        setSeparationDelay(v)
                        setPreset('custom')
                        setResults(null)
                      }}
                      min={0}
                      max={10}
                      step={0.5}
                    />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Delta-V Comparison (when no results) */}
        {!results && theoreticalDV.perStage.length > 0 && (
          <div className="bg-card rounded-xl border border-border/50 p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Theoretical ΔV Budget</h3>
            <div className="space-y-2">
              {theoreticalDV.perStage.map((stage, i) => (
                <div key={stage.stageId} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: STAGE_COLORS[i % STAGE_COLORS.length] }}
                  />
                  <span className="text-sm text-muted-foreground flex-1">Stage {i + 1}</span>
                  <span className="text-sm font-mono text-foreground">{formatNumber(stage.deltaV)} m/s</span>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                <div className="w-3 h-3" />
                <span className="text-sm font-medium text-foreground flex-1">Total</span>
                <span className="text-sm font-mono font-semibold text-primary">
                  {formatNumber(theoreticalDV.total)} m/s
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
