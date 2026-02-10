'use client'

import { cn } from '@/lib/utils'

interface GForceMeterProps {
  currentG: number
  maxTolerance: number  // Crew tolerance limit in g's
  maxScale?: number     // Scale max (default 15g)
}

export function GForceMeter({
  currentG,
  maxTolerance,
  maxScale = 15,
}: GForceMeterProps) {
  // Calculate angle for dial (0g = -135deg, maxScale = 135deg)
  const normalizedG = Math.min(currentG, maxScale)
  const angle = -135 + (normalizedG / maxScale) * 270

  // Calculate tolerance zone angle
  const toleranceAngle = -135 + (maxTolerance / maxScale) * 270

  // Color based on G level
  const getGColor = (g: number) => {
    if (g < maxTolerance * 0.5) return 'text-green-500'
    if (g < maxTolerance * 0.8) return 'text-yellow-500'
    if (g < maxTolerance) return 'text-orange-500'
    return 'text-red-500'
  }

  const gColor = getGColor(currentG)

  // Generate tick marks
  const ticks = Array.from({ length: 16 }, (_, i) => i)

  return (
    <div className="bg-card rounded-lg border border-border/50 p-4">
      <h4 className="text-sm font-medium text-foreground mb-3">G-Force</h4>

      {/* Dial */}
      <div className="relative flex justify-center">
        <svg viewBox="0 0 100 60" className="w-32 h-20">
          {/* Background arc */}
          <path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            opacity="0.1"
            strokeLinecap="round"
          />

          {/* Safe zone (green) */}
          <path
            d="M 10 55 A 40 40 0 0 1 30 20"
            fill="none"
            stroke="hsl(var(--chart-2))"
            strokeWidth="8"
            opacity="0.3"
            strokeLinecap="round"
          />

          {/* Caution zone (yellow) */}
          <path
            d="M 30 20 A 40 40 0 0 1 50 12"
            fill="none"
            stroke="hsl(var(--chart-5))"
            strokeWidth="8"
            opacity="0.3"
            strokeLinecap="round"
          />

          {/* Warning zone (orange) */}
          <path
            d="M 50 12 A 40 40 0 0 1 70 20"
            fill="none"
            stroke="hsl(var(--chart-3))"
            strokeWidth="8"
            opacity="0.3"
            strokeLinecap="round"
          />

          {/* Danger zone (red) */}
          <path
            d="M 70 20 A 40 40 0 0 1 90 55"
            fill="none"
            stroke="hsl(var(--destructive))"
            strokeWidth="8"
            opacity="0.3"
            strokeLinecap="round"
          />

          {/* Tick marks */}
          {ticks.map((i) => {
            const tickAngle = (-135 + (i / 15) * 270) * Math.PI / 180
            const innerR = 32
            const outerR = 38
            const x1 = 50 + innerR * Math.cos(tickAngle)
            const y1 = 55 + innerR * Math.sin(tickAngle)
            const x2 = 50 + outerR * Math.cos(tickAngle)
            const y2 = 55 + outerR * Math.sin(tickAngle)
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth={i % 5 === 0 ? 1.5 : 0.5}
                opacity={i % 5 === 0 ? 0.5 : 0.2}
              />
            )
          })}

          {/* Tolerance marker */}
          <g transform={`rotate(${toleranceAngle}, 50, 55)`}>
            <line
              x1="50"
              y1="20"
              x2="50"
              y2="25"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
          </g>

          {/* Needle */}
          <g transform={`rotate(${angle}, 50, 55)`}>
            <polygon
              points="50,20 48,52 50,55 52,52"
              fill="currentColor"
              className={gColor}
            />
          </g>

          {/* Center circle */}
          <circle cx="50" cy="55" r="4" fill="currentColor" opacity="0.3" />
          <circle cx="50" cy="55" r="2" fill="currentColor" />

          {/* Labels */}
          <text x="15" y="58" fontSize="6" fill="currentColor" opacity="0.5">0</text>
          <text x="50" y="8" fontSize="6" fill="currentColor" opacity="0.5" textAnchor="middle">{Math.round(maxScale / 2)}</text>
          <text x="82" y="58" fontSize="6" fill="currentColor" opacity="0.5">{maxScale}</text>
        </svg>
      </div>

      {/* Digital readout */}
      <div className="text-center mt-2">
        <span className={cn('text-2xl font-bold font-mono', gColor)}>
          {currentG.toFixed(1)}
        </span>
        <span className="text-sm text-muted-foreground ml-1">g</span>
      </div>

      {/* Status */}
      <div className="mt-2 text-center text-xs">
        {currentG < 1 && (
          <span className="text-green-500">Microgravity</span>
        )}
        {currentG >= 1 && currentG < maxTolerance * 0.5 && (
          <span className="text-green-500">Normal</span>
        )}
        {currentG >= maxTolerance * 0.5 && currentG < maxTolerance * 0.8 && (
          <span className="text-yellow-500">Elevated</span>
        )}
        {currentG >= maxTolerance * 0.8 && currentG < maxTolerance && (
          <span className="text-orange-500">High - Crew discomfort</span>
        )}
        {currentG >= maxTolerance && (
          <span className="text-red-500 animate-pulse">Exceeds tolerance!</span>
        )}
      </div>

      {/* Tolerance indicator */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Crew tolerance:</span>
        <span className="text-primary font-medium">{maxTolerance}g</span>
      </div>
    </div>
  )
}
