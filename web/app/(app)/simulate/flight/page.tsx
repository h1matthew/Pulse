'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Play, ChevronDown, ChevronRight, Settings2, Cloud } from 'lucide-react'
import type { FlightDataPoint, FlightResults } from '@/lib/physics/flightSimulator'

// Helper to interpolate between data points for smooth animation
function getInterpolatedPoint(results: FlightResults, time: number): FlightDataPoint {
  const data = results.data
  const index = data.findIndex((d) => d.time >= time)

  if (index <= 0) return data[0]
  if (index >= data.length) return data[data.length - 1]

  const prev = data[index - 1]
  const next = data[index]
  const t = (time - prev.time) / (next.time - prev.time)

  return {
    ...prev,
    time,
    altitude: prev.altitude + (next.altitude - prev.altitude) * t,
    velocity: prev.velocity + (next.velocity - prev.velocity) * t,
    acceleration: prev.acceleration + (next.acceleration - prev.acceleration) * t,
    mass: prev.mass + (next.mass - prev.mass) * t,
    thrust: prev.thrust + (next.thrust - prev.thrust) * t,
    drag: prev.drag + (next.drag - prev.drag) * t,
    weight: prev.weight + (next.weight - prev.weight) * t,
    horizontalDrift: prev.horizontalDrift !== undefined && next.horizontalDrift !== undefined
      ? prev.horizontalDrift + (next.horizontalDrift - prev.horizontalDrift) * t
      : prev.horizontalDrift,
  }
}
import { Button } from '@/components/ui/button'
import { PlaybackControls } from '@/components/features/simulator/PlaybackControls'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  simulateFlight,
  formatNumber,
  ROCKET_PRESETS,
  WEATHER_PRESETS,
  type RocketParams,
  type WeatherPreset,
} from '@/lib/physics/flightSimulator'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
}

function Slider({ label, value, min, max, step, unit, onChange }: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
      />
    </div>
  )
}

function FlightVisualization({
  results,
  currentTime,
  animationFrame
}: {
  results: FlightResults | null
  currentTime: number
  animationFrame: number
}) {
  // Generate deterministic stars
  const stars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => {
      const seed = i * 7919
      return {
        id: i,
        x: ((seed * 13) % 1000) / 1000 * 100,
        y: ((seed * 17) % 1000) / 1000 * 70, // Top 70% of view
        size: 0.3 + ((seed * 23) % 100) / 100 * 0.8,
        brightness: 0.3 + ((seed * 29) % 100) / 100 * 0.7,
      }
    })
  }, [])

  // Find burnout and apogee data points
  const burnoutPoint = useMemo(() => {
    if (!results) return null
    return results.data.find(
      (d, i) => i > 0 && results.data[i - 1].phase === 'powered' && d.phase !== 'powered'
    )
  }, [results])

  const apogeePoint = useMemo(() => {
    if (!results) return null
    return results.data.find(
      (d, i) => i > 0 && results.data[i - 1].velocity > 0 && d.velocity <= 0
    )
  }, [results])

  // Get trajectory points up to current time
  const trajectoryPoints = useMemo(() => {
    if (!results) return []
    return results.data
      .filter((d) => d.time <= currentTime)
      .filter((_, i) => i % 2 === 0) // Sample every 2nd point for performance
      .map((d) => ({
        x: 50, // Center x in percentage
        y: 95 - (d.altitude / results.maxAltitude) * 85, // 95% is ground, leaving 10% margin at top
        time: d.time,
      }))
  }, [results, currentTime])

  // Get current point using interpolation for smooth animation
  const currentPoint = useMemo(() => {
    if (!results) return null
    return getInterpolatedPoint(results, currentTime)
  }, [results, currentTime])

  // Exhaust particle generation (must be before early return to maintain hook order)
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

  if (!results || !currentPoint) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Adjust parameters and click Launch to simulate</p>
      </div>
    )
  }

  const altitudePercent = (currentPoint.altitude / results.maxAltitude) * 100
  const rocketY = 95 - altitudePercent * 0.85 // Match trajectory calculation

  // Rocket rotation: 0 when going up, 180 when going down
  // Smooth transition near zero velocity
  const velocityNormalized = Math.max(-1, Math.min(1, currentPoint.velocity / 50))
  const rocketRotation = velocityNormalized >= 0 ? 0 : 180

  // Sky darkness based on altitude (0 = bright sky, 1 = space)
  const skyDarkness = Math.min(1, altitudePercent / 70)

  // Star visibility (fade in above 30% altitude)
  const starOpacity = Math.max(0, (altitudePercent - 30) / 70)

  // Calculate marker positions
  const burnoutY = burnoutPoint ? 95 - (burnoutPoint.altitude / results.maxAltitude) * 85 : null
  const apogeeY = apogeePoint ? 95 - (apogeePoint.altitude / results.maxAltitude) * 85 : null

  return (
    <div className="h-full relative rounded-lg overflow-hidden">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Dynamic sky gradient */}
        <defs>
          <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
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
        </defs>

        {/* Sky background */}
        <rect x="0" y="0" width="100" height="100" fill="url(#skyGradient)" />

        {/* Stars (visible at high altitude) */}
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

        {/* Ground */}
        <rect x="0" y="95" width="100" height="5" fill="url(#groundGradient)" />
        <defs>
          <linearGradient id="groundGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#365314" />
            <stop offset="100%" stopColor="#1a2e05" />
          </linearGradient>
        </defs>

        {/* Trajectory trail */}
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

        {/* Burnout marker */}
        {burnoutY !== null && burnoutPoint && burnoutPoint.time <= currentTime && (
          <g>
            <circle cx="50" cy={burnoutY} r="1.5" fill="var(--chart-5)" stroke="white" strokeWidth="0.3" />
            <text x="53" y={burnoutY + 0.5} fontSize="3" fill="var(--chart-5)">Burnout</text>
          </g>
        )}

        {/* Apogee marker */}
        {apogeeY !== null && apogeePoint && apogeePoint.time <= currentTime && (
          <g>
            <circle cx="50" cy={apogeeY} r="1.5" fill="var(--chart-2)" stroke="white" strokeWidth="0.3" />
            <text x="53" y={apogeeY + 0.5} fontSize="3" fill="var(--chart-2)">Apogee</text>
          </g>
        )}

        {/* Rocket */}
        <g transform={`translate(50, ${rocketY}) rotate(${rocketRotation}) scale(0.15)`}>
          {/* Exhaust particles */}
          {exhaustParticles.map((p) => (
            <ellipse
              key={p.id}
              cx={p.xOffset}
              cy={p.yOffset}
              rx={p.size * 0.6}
              ry={p.size}
              fill={p.color}
              opacity={p.opacity}
            />
          ))}

          {/* Rocket body */}
          <ellipse cx={0} cy={0} rx={12} ry={40} fill="#E8E8EC" stroke="#999" strokeWidth={1} />

          {/* Nose cone */}
          <path d="M -12 -10 Q -12 -45 0 -55 Q 12 -45 12 -10" fill="#3B82F6" stroke="#2563EB" strokeWidth={1} />

          {/* Window */}
          <circle cx={0} cy={-15} r={5} fill="#60A5FA" stroke="#2563EB" strokeWidth={1} />
          <circle cx={-2} cy={-17} r={1.5} fill="white" opacity={0.6} />

          {/* Racing stripe */}
          <rect x={-2} y={-5} width={4} height={35} fill="#EF4444" rx={2} />

          {/* Left fin */}
          <path d="M -12 25 L -25 45 L -12 40 Z" fill="#EF4444" stroke="#DC2626" strokeWidth={0.5} />

          {/* Right fin */}
          <path d="M 12 25 L 25 45 L 12 40 Z" fill="#EF4444" stroke="#DC2626" strokeWidth={0.5} />

          {/* Engine bell */}
          <path d="M -8 38 L -10 48 L 10 48 L 8 38 Z" fill="#666" stroke="#444" strokeWidth={0.5} />
        </g>

        {/* Altitude scale */}
        <text x="3" y="8" fontSize="3" fill="currentColor" opacity="0.5">{formatNumber(results.maxAltitude)}m</text>
        <text x="3" y="50" fontSize="3" fill="currentColor" opacity="0.5">{formatNumber(results.maxAltitude * 0.5)}m</text>
        <text x="3" y="93" fontSize="3" fill="currentColor" opacity="0.5">0m</text>
      </svg>

      {/* Stats overlay */}
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
          <span className="text-muted-foreground">Phase:</span>
          <span className={`font-medium ${
            currentPoint.phase === 'powered' ? 'text-orange-500' :
            currentPoint.phase === 'coast' ? 'text-blue-500' : 'text-green-500'
          }`}>
            {currentPoint.phase.charAt(0).toUpperCase() + currentPoint.phase.slice(1)}
          </span>
        </div>
      </div>
    </div>
  )
}

function FlightGraphs({ results, currentTime }: { results: FlightResults | null; currentTime: number }) {
  if (!results || results.data.length === 0) return null

  const maxTime = results.data[results.data.length - 1]?.time
  const maxAlt = results.maxAltitude

  // Guard against invalid values
  if (!maxTime || maxTime === 0 || !maxAlt || maxAlt === 0) return null

  // Calculate actual min/max velocity from data (not absolute maxVelocity)
  const velocities = results.data.map(d => d.velocity)
  const minVel = Math.min(...velocities)
  const maxVel = Math.max(...velocities)
  const velRange = maxVel - minVel || 1

  // Find phase transition times for markers
  const burnoutTime = results.data.find(
    (d, i) => i > 0 && results.data[i - 1].phase === 'powered' && d.phase !== 'powered'
  )?.time
  const apogeeTime = results.timeToApogee

  // Filter data points up to current time for progressive drawing
  const visibleData = results.data.filter((d) => d.time <= currentTime)

  // Generate validated points (progressive)
  const altitudePoints = visibleData
    .filter((_, i) => i % 3 === 0)
    .map((d) => {
      const x = (d.time / maxTime) * 100
      const y = 100 - (d.altitude / maxAlt) * 100
      if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) return null
      return `${x},${y}`
    })
    .filter(Boolean)
    .join(' ')

  const velocityPoints = visibleData
    .filter((_, i) => i % 3 === 0)
    .map((d) => {
      const x = (d.time / maxTime) * 100
      const normalizedVel = (d.velocity - minVel) / velRange
      const y = 100 - normalizedVel * 100
      if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) return null
      return `${x},${y}`
    })
    .filter(Boolean)
    .join(' ')

  if (!altitudePoints || !velocityPoints) return null

  // Current point for marker - use interpolated values for smooth animation
  const currentPoint = getInterpolatedPoint(results, currentTime)
  const currentAltX = (currentPoint.time / maxTime) * 100
  const currentAltY = 100 - (currentPoint.altitude / maxAlt) * 100
  const currentVelNormalized = (currentPoint.velocity - minVel) / velRange
  const currentVelY = 100 - currentVelNormalized * 100

  // Phase marker renderer (only show markers that have been reached)
  const renderPhaseMarkers = () => (
    <>
      {burnoutTime && burnoutTime > 0 && burnoutTime <= currentTime && (
        <g>
          <line
            x1={(burnoutTime / maxTime) * 100}
            y1={0}
            x2={(burnoutTime / maxTime) * 100}
            y2={100}
            stroke="var(--chart-5)"
            strokeWidth="1"
            strokeDasharray="3 2"
            opacity={0.8}
          />
          <text
            x={(burnoutTime / maxTime) * 100}
            y={8}
            fill="var(--chart-5)"
            fontSize="6"
            textAnchor="middle"
          >
            Burnout
          </text>
        </g>
      )}
      {apogeeTime && apogeeTime > 0 && apogeeTime <= currentTime && (
        <g>
          <line
            x1={(apogeeTime / maxTime) * 100}
            y1={0}
            x2={(apogeeTime / maxTime) * 100}
            y2={100}
            stroke="var(--chart-2)"
            strokeWidth="1"
            strokeDasharray="3 2"
            opacity={0.8}
          />
          <text
            x={(apogeeTime / maxTime) * 100}
            y={8}
            fill="var(--chart-2)"
            fontSize="6"
            textAnchor="middle"
          >
            Apogee
          </text>
        </g>
      )}
    </>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Altitude Graph */}
      <div className="bg-card rounded-lg border border-border/50 p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Altitude vs Time</h4>
        <div className="aspect-[16/10] relative">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Grid */}
            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" />
            <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeOpacity="0.1" />

            {/* Phase markers */}
            {renderPhaseMarkers()}

            {/* Altitude line */}
            <polyline
              fill="none"
              stroke="var(--primary)"
              strokeWidth="1"
              points={altitudePoints}
            />

            {/* Current position marker (pulsing dot) */}
            {currentPoint && currentTime > 0 && (
              <circle
                cx={currentAltX}
                cy={currentAltY}
                r="3"
                fill="var(--primary)"
                className="animate-pulse"
              />
            )}
          </svg>

          {/* Labels */}
          <div className="absolute top-0 left-0 text-xs text-muted-foreground">{formatNumber(maxAlt)}m</div>
          <div className="absolute bottom-1 left-0 text-xs text-muted-foreground">0m</div>
          <div className="absolute bottom-0 right-0 text-xs text-muted-foreground">{formatNumber(maxTime)}s</div>
        </div>
      </div>

      {/* Velocity Graph */}
      <div className="bg-card rounded-lg border border-border/50 p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Velocity vs Time</h4>
        <div className="aspect-[16/10] relative">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Grid */}
            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" />
            <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeOpacity="0.1" />

            {/* Phase markers */}
            {renderPhaseMarkers()}

            {/* Velocity line */}
            <polyline
              fill="none"
              stroke="var(--chart-2)"
              strokeWidth="1"
              points={velocityPoints}
            />

            {/* Current position marker (pulsing dot) */}
            {currentPoint && currentTime > 0 && (
              <circle
                cx={currentAltX}
                cy={currentVelY}
                r="3"
                fill="var(--chart-2)"
                className="animate-pulse"
              />
            )}
          </svg>

          {/* Labels */}
          <div className="absolute top-0 left-0 text-xs text-muted-foreground">{formatNumber(maxVel)}m/s</div>
          <div className="absolute bottom-1 left-0 text-xs text-muted-foreground">{formatNumber(minVel)}m/s</div>
          <div className="absolute bottom-0 right-0 text-xs text-muted-foreground">{formatNumber(maxTime)}s</div>
        </div>
      </div>
    </div>
  )
}

export default function FlightSimulatorPage() {
  const [preset, setPreset] = useState<string>('custom')
  const [params, setParams] = useState<RocketParams>(ROCKET_PRESETS.custom.params)
  const [results, setResults] = useState<FlightResults | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(0.5)
  const [animationFrame, setAnimationFrame] = useState(0)

  // Weather/atmosphere state
  const [weatherPreset, setWeatherPreset] = useState<WeatherPreset>('none')
  const [windSpeed, setWindSpeed] = useState(0)
  const [turbulenceIntensity, setTurbulenceIntensity] = useState(0)
  const [useAdvancedAtmosphere, setUseAdvancedAtmosphere] = useState(false)

  // Get current phase from interpolated data
  const currentPhase = useMemo(() => {
    if (!results) return undefined
    return getInterpolatedPoint(results, currentTime).phase
  }, [results, currentTime])

  // Get max time from results
  const maxTime = useMemo(() => {
    return results?.data[results.data.length - 1]?.time || 0
  }, [results])

  // Playback effect using requestAnimationFrame for smooth 60fps animation
  useEffect(() => {
    if (!isPlaying || !results || maxTime <= 0) return

    let startTime: number | null = null
    let lastTimestamp: number | null = null
    let animationFrameId: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      if (!lastTimestamp) lastTimestamp = timestamp

      // Calculate elapsed time since last frame
      const deltaTime = (timestamp - lastTimestamp) / 1000 // Convert to seconds
      lastTimestamp = timestamp

      // Update current time based on playback speed
      setCurrentTime((prev) => {
        const next = prev + deltaTime * playbackSpeed
        if (next >= maxTime) {
          setIsPlaying(false)
          return maxTime
        }
        return next
      })

      setAnimationFrame((prev) => prev + 1)
      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrameId)
  }, [isPlaying, results, playbackSpeed, maxTime])

  const handlePresetChange = useCallback((presetKey: string) => {
    setPreset(presetKey)
    if (presetKey in ROCKET_PRESETS) {
      setParams(ROCKET_PRESETS[presetKey as keyof typeof ROCKET_PRESETS].params)
    }
    setResults(null)
    setCurrentTime(0)
    setIsPlaying(false)
  }, [])

  const updateParam = useCallback((key: keyof RocketParams, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }))
    setPreset('custom')
    setResults(null)
    setCurrentTime(0)
    setIsPlaying(false)
  }, [])

  const handleWeatherPresetChange = useCallback((preset: WeatherPreset) => {
    setWeatherPreset(preset)
    const weather = WEATHER_PRESETS[preset]
    setWindSpeed(weather.windSpeed)
    setTurbulenceIntensity(weather.turbulenceIntensity)
  }, [])

  const handleLaunch = useCallback(() => {
    const simulationResults = simulateFlight({
      ...params,
      windSpeed,
      turbulenceIntensity,
      useAdvancedAtmosphere,
    })
    setResults(simulationResults)
    setCurrentTime(0)
    setAnimationFrame(0)
    setIsPlaying(true)
  }, [params, windSpeed, turbulenceIntensity, useAdvancedAtmosphere])

  const handlePlayPause = useCallback(() => {
    if (!results) return
    // If at end, restart from beginning
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

  // Calculate TWR for display
  const twr = useMemo(() => {
    const totalMass = params.rocketMass + params.fuelMass
    return params.thrust / (totalMass * 9.81)
  }, [params])

  // Collapsible section state
  const [paramsOpen, setParamsOpen] = useState(true)
  const [weatherOpen, setWeatherOpen] = useState(false)

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
          Vertical Flight Simulator
        </h1>
        <p className="text-muted-foreground">
          Adjust rocket parameters and launch to see the trajectory. Experiment with thrust, mass, and drag.
        </p>
      </div>

      <div className="space-y-4">
        {/* 1. ROCKET VISUALIZATION - Full width, top, taller */}
        <div className="bg-card rounded-xl border border-border/50 p-4 h-[32rem]">
          <FlightVisualization results={results} currentTime={currentTime} animationFrame={animationFrame} />
        </div>

        {/* 2. PLAYBACK CONTROLS - Always visible when results exist */}
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

        {/* 3. GRAPHS - Side by side */}
        <FlightGraphs results={results} currentTime={currentTime} />

        {/* 4. RESULTS SUMMARY */}
        {results && (
          <div className="bg-card rounded-xl border border-border/50 p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Flight Results</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Max Altitude</p>
                <p className="text-lg font-semibold text-foreground">{formatNumber(results.maxAltitude)}m</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max Velocity</p>
                <p className="text-lg font-semibold text-foreground">{formatNumber(results.maxVelocity)}m/s</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time to Apogee</p>
                <p className="text-lg font-semibold text-foreground">{formatNumber(results.timeToApogee)}s</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Flight Time</p>
                <p className="text-lg font-semibold text-foreground">{formatNumber(results.totalFlightTime)}s</p>
              </div>
            </div>
            {results.windEnabled && results.maxHorizontalDrift !== undefined && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Max Wind Drift</span>
                  <span className="font-mono font-semibold text-foreground">{formatNumber(results.maxHorizontalDrift)}m</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. LAUNCH SETTINGS - Collapsible sections */}
        <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
          {/* Quick Launch Bar - Always visible */}
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
                  {Object.entries(ROCKET_PRESETS).map(([key, { name }]) => (
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
              disabled={isPlaying || twr < 1}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Launch
            </Button>
          </div>

          {/* Collapsible: Rocket Parameters */}
          <Collapsible open={paramsOpen} onOpenChange={setParamsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-semibold text-foreground hover:text-primary transition-colors">
              {paramsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Settings2 className="h-4 w-4" />
              Rocket Parameters
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Slider
                  label="Thrust"
                  value={params.thrust}
                  min={1}
                  max={500}
                  step={1}
                  unit="N"
                  onChange={(v) => updateParam('thrust', v)}
                />

                <Slider
                  label="Rocket Mass (dry)"
                  value={params.rocketMass}
                  min={0.01}
                  max={5}
                  step={0.01}
                  unit="kg"
                  onChange={(v) => updateParam('rocketMass', v)}
                />

                <Slider
                  label="Fuel Mass"
                  value={params.fuelMass}
                  min={0.01}
                  max={2}
                  step={0.01}
                  unit="kg"
                  onChange={(v) => updateParam('fuelMass', v)}
                />

                <Slider
                  label="Burn Time"
                  value={params.burnTime}
                  min={0.1}
                  max={10}
                  step={0.1}
                  unit="s"
                  onChange={(v) => updateParam('burnTime', v)}
                />

                <Slider
                  label="Drag Coefficient"
                  value={params.dragCoefficient}
                  min={0.1}
                  max={1.5}
                  step={0.05}
                  unit=""
                  onChange={(v) => updateParam('dragCoefficient', v)}
                />

                <Slider
                  label="Cross-sectional Area"
                  value={params.crossSectionalArea * 10000}
                  min={1}
                  max={100}
                  step={1}
                  unit="cm²"
                  onChange={(v) => updateParam('crossSectionalArea', v / 10000)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Collapsible: Weather & Atmosphere */}
          <Collapsible open={weatherOpen} onOpenChange={setWeatherOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-semibold text-foreground hover:text-primary transition-colors">
              {weatherOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Cloud className="h-4 w-4" />
              Weather & Atmosphere
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              {/* Weather Preset */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Weather Conditions</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(WEATHER_PRESETS) as [WeatherPreset, { label: string }][]).map(([key, { label }]) => (
                    <button
                      key={key}
                      onClick={() => handleWeatherPresetChange(key)}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                        weatherPreset === key
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Wind Speed */}
                <Slider
                  label="Wind Speed"
                  value={windSpeed}
                  min={0}
                  max={15}
                  step={1}
                  unit="m/s"
                  onChange={(v) => {
                    setWindSpeed(v)
                    setWeatherPreset('none')
                  }}
                />

                {/* Turbulence */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Turbulence</span>
                    <span className="font-mono text-foreground">
                      {turbulenceIntensity === 0 ? 'None' : turbulenceIntensity <= 0.2 ? 'Light' : turbulenceIntensity <= 0.4 ? 'Moderate' : 'Heavy'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.6}
                    step={0.1}
                    value={turbulenceIntensity}
                    onChange={(e) => {
                      setTurbulenceIntensity(parseFloat(e.target.value))
                      setWeatherPreset('none')
                    }}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Advanced Atmosphere Toggle */}
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAdvancedAtmosphere}
                      onChange={(e) => setUseAdvancedAtmosphere(e.target.checked)}
                      className="rounded border-border/50 text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm text-muted-foreground">Use ISA Atmosphere Model</span>
                  </label>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </main>
  )
}
