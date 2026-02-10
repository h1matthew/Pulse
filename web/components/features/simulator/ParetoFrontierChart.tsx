'use client'

import { useMemo } from 'react'
import type { PayloadCapacity } from '@/lib/physics/payloadOptimizer'

interface ParetoFrontierChartProps {
  results: PayloadCapacity[]
  paretoFrontier: PayloadCapacity[]
  selectedId?: string
  onSelect?: (config: PayloadCapacity) => void
}

export function ParetoFrontierChart({
  results,
  paretoFrontier,
  selectedId,
  onSelect,
}: ParetoFrontierChartProps) {
  const chartData = useMemo(() => {
    if (results.length === 0) return null

    const maxPayload = Math.max(...results.map(r => r.maxPayload))
    const minPayload = Math.min(...results.map(r => r.maxPayload))
    const maxCost = Math.max(...results.map(r => r.totalCost))
    const minCost = Math.min(...results.map(r => r.totalCost))

    const payloadRange = maxPayload - minPayload || 1
    const costRange = maxCost - minCost || 1

    return {
      maxPayload,
      minPayload,
      maxCost,
      minCost,
      payloadRange,
      costRange,
    }
  }, [results])

  if (!chartData || results.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border/50 p-6 aspect-[16/9] flex items-center justify-center text-muted-foreground">
        No data to display
      </div>
    )
  }

  const paretoIds = new Set(paretoFrontier.map(p => p.configuration.id))

  // Sort pareto points for line
  const sortedPareto = [...paretoFrontier].sort((a, b) => a.totalCost - b.totalCost)

  return (
    <div className="bg-card rounded-xl border border-border/50 p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Payload vs Cost (Pareto Frontier)</h3>

      <div className="relative aspect-[16/9] w-full">
        <svg viewBox="0 0 160 90" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(v => (
            <g key={v}>
              <line
                x1="15"
                y1={80 - v * 0.7}
                x2="150"
                y2={80 - v * 0.7}
                stroke="currentColor"
                strokeOpacity="0.15"
                strokeWidth="0.5"
              />
              <line
                x1={15 + v * 1.35}
                y1="10"
                x2={15 + v * 1.35}
                y2="80"
                stroke="currentColor"
                strokeOpacity="0.15"
                strokeWidth="0.5"
              />
            </g>
          ))}

          {/* Pareto frontier line */}
          {sortedPareto.length > 1 && (
            <polyline
              fill="none"
              stroke="hsl(var(--chart-2))"
              strokeWidth="2"
              strokeDasharray="6 3"
              points={sortedPareto.map(p => {
                const x = 15 + ((p.totalCost - chartData.minCost) / chartData.costRange) * 135
                const y = 80 - ((p.maxPayload - chartData.minPayload) / chartData.payloadRange) * 70
                return `${x},${y}`
              }).join(' ')}
            />
          )}

          {/* Data points */}
          {results.map((result) => {
            const x = 15 + ((result.totalCost - chartData.minCost) / chartData.costRange) * 135
            const y = 80 - ((result.maxPayload - chartData.minPayload) / chartData.payloadRange) * 70
            const isPareto = paretoIds.has(result.configuration.id)
            const isSelected = result.configuration.id === selectedId

            return (
              <g
                key={result.configuration.id}
                className="cursor-pointer transition-transform origin-center hover:scale-110"
                style={{ transformOrigin: `${x}px ${y}px` }}
                onClick={() => onSelect?.(result)}
              >
                {/* Selection ring */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="1.5"
                    className="animate-pulse"
                  />
                )}

                {/* Point */}
                <circle
                  cx={x}
                  cy={y}
                  r={isPareto ? 2 : 1.5}
                  fill={isPareto ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-4))'}
                  stroke={isSelected ? 'hsl(var(--primary))' : 'none'}
                  strokeWidth="1.5"
                  opacity={isPareto ? 1 : 0.6}
                />

                {/* Label for Pareto points */}
                {isPareto && (
                  <text
                    x={x}
                    y={y - 7}
                    fontSize="4.5"
                    fill="currentColor"
                    textAnchor="middle"
                    opacity="0.8"
                  >
                    {result.configuration.name.split('-')[0]}
                  </text>
                )}
              </g>
            )
          })}

          {/* Axes labels */}
          <text x="82" y="88" fontSize="5" fill="currentColor" textAnchor="middle" opacity="0.6">
            Total Cost →
          </text>
          <text x="4" y="45" fontSize="5" fill="currentColor" textAnchor="middle" opacity="0.6" transform="rotate(-90, 4, 45)">
            Payload →
          </text>

          {/* Value labels */}
          <text x="15" y="86" fontSize="4" fill="currentColor" opacity="0.5">
            ${(chartData.minCost / 1e6).toFixed(0)}M
          </text>
          <text x="150" y="86" fontSize="4" fill="currentColor" opacity="0.5" textAnchor="end">
            ${(chartData.maxCost / 1e6).toFixed(0)}M
          </text>
          <text x="12" y="80" fontSize="4" fill="currentColor" opacity="0.5" textAnchor="end">
            {(chartData.minPayload / 1000).toFixed(0)}t
          </text>
          <text x="12" y="12" fontSize="4" fill="currentColor" opacity="0.5" textAnchor="end">
            {(chartData.maxPayload / 1000).toFixed(0)}t
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-chart-2" />
          <span className="text-muted-foreground">Pareto optimal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-chart-4 opacity-60" />
          <span className="text-muted-foreground">Dominated</span>
        </div>
      </div>
    </div>
  )
}
