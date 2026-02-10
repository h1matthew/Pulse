'use client'

import { cn } from '@/lib/utils'

interface HeatShieldStatusProps {
  remaining: number  // 0-100 percentage
  heatFlux: number   // W/m² current heat flux
  maxHeatFlux: number // W/m² for scale
}

export function HeatShieldStatus({
  remaining,
  heatFlux,
  maxHeatFlux,
}: HeatShieldStatusProps) {
  // Calculate heat intensity for color
  const heatIntensity = Math.min(1, heatFlux / (maxHeatFlux || 1))

  // Shield color based on remaining %
  const shieldColor = remaining > 70
    ? 'bg-green-500'
    : remaining > 40
    ? 'bg-yellow-500'
    : remaining > 20
    ? 'bg-orange-500'
    : 'bg-red-500'

  // Heat glow color
  const glowIntensity = heatIntensity * 0.8
  const glowColor = `rgba(255, ${Math.round(100 - heatIntensity * 100)}, 0, ${glowIntensity})`

  return (
    <div className="bg-card rounded-lg border border-border/50 p-4">
      <h4 className="text-sm font-medium text-foreground mb-3">Heat Shield Status</h4>

      {/* Shield visualization */}
      <div className="relative flex justify-center mb-4">
        <svg viewBox="0 0 100 60" className="w-32 h-20">
          {/* Glow effect */}
          {heatFlux > 0 && (
            <ellipse
              cx="50"
              cy="45"
              rx="45"
              ry="20"
              fill="none"
              stroke={glowColor}
              strokeWidth="8"
              className="animate-pulse"
              style={{ filter: `blur(${4 + heatIntensity * 4}px)` }}
            />
          )}

          {/* Heat shield arc */}
          <path
            d="M 10 45 Q 50 70 90 45 Q 85 30 50 25 Q 15 30 10 45 Z"
            fill={`hsl(${remaining * 1.2}, 60%, 45%)`}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.9"
          />

          {/* Ablation particles */}
          {heatFlux > 100000 && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <circle
                  key={i}
                  cx={30 + i * 10}
                  cy={50 + Math.sin(Date.now() / 200 + i) * 5}
                  r={1 + Math.random()}
                  fill="orange"
                  opacity={0.5 + Math.random() * 0.3}
                />
              ))}
            </>
          )}

          {/* Temperature indicator */}
          <text
            x="50"
            y="42"
            textAnchor="middle"
            fontSize="10"
            fill="white"
            fontWeight="bold"
          >
            {remaining.toFixed(0)}%
          </text>
        </svg>
      </div>

      {/* Shield remaining bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Shield Integrity</span>
          <span className={cn(
            'font-medium',
            remaining > 70 ? 'text-green-500' :
            remaining > 40 ? 'text-yellow-500' :
            remaining > 20 ? 'text-orange-500' : 'text-red-500'
          )}>
            {remaining.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', shieldColor)}
            style={{ width: `${remaining}%` }}
          />
        </div>
      </div>

      {/* Heat flux indicator */}
      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Heat Flux</span>
          <span className="font-mono text-foreground">
            {heatFlux >= 1e6
              ? `${(heatFlux / 1e6).toFixed(2)} MW/m²`
              : heatFlux >= 1e3
              ? `${(heatFlux / 1e3).toFixed(1)} kW/m²`
              : `${heatFlux.toFixed(0)} W/m²`}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 transition-all duration-100"
            style={{ width: `${Math.min(100, heatIntensity * 100)}%` }}
          />
        </div>
      </div>

      {/* Warning */}
      {remaining < 30 && (
        <div className="mt-3 text-xs text-red-500 flex items-center gap-1">
          <span className="animate-pulse">⚠</span>
          Critical shield level
        </div>
      )}
    </div>
  )
}
