'use client'

import { ArrowUpDown, Check, Star } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { PayloadCapacity } from '@/lib/physics/payloadOptimizer'

interface RocketComparisonTableProps {
  results: PayloadCapacity[]
  recommendedId?: string
  onSelect?: (config: PayloadCapacity) => void
  selectedId?: string
}

type SortKey = 'payload' | 'cost' | 'costPerKg' | 'stages' | 'twr'
type SortDirection = 'asc' | 'desc'

export function RocketComparisonTable({
  results,
  recommendedId,
  onSelect,
  selectedId,
}: RocketComparisonTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('payload')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const sortedResults = [...results].sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'payload':
        cmp = a.maxPayload - b.maxPayload
        break
      case 'cost':
        cmp = a.totalCost - b.totalCost
        break
      case 'costPerKg':
        cmp = a.costPerKg - b.costPerKg
        break
      case 'stages':
        cmp = a.configuration.stages.length - b.configuration.stages.length
        break
      case 'twr':
        cmp = a.twr - b.twr
        break
    }
    return sortDirection === 'desc' ? -cmp : cmp
  })

  const SortHeader = ({ label, sortKeyValue }: { label: string; sortKeyValue: SortKey }) => (
    <th
      className="text-left text-xs font-medium text-muted-foreground py-2 px-3 cursor-pointer hover:text-foreground transition-colors"
      onClick={() => handleSort(sortKeyValue)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn(
          'h-3 w-3',
          sortKey === sortKeyValue ? 'opacity-100' : 'opacity-30'
        )} />
      </div>
    </th>
  )

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border/50 bg-muted/30">
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground py-2 px-3 w-8"></th>
              <th className="text-left text-xs font-medium text-muted-foreground py-2 px-3">Configuration</th>
              <SortHeader label="Payload" sortKeyValue="payload" />
              <SortHeader label="Total Cost" sortKeyValue="cost" />
              <SortHeader label="$/kg" sortKeyValue="costPerKg" />
              <SortHeader label="Stages" sortKeyValue="stages" />
              <SortHeader label="TWR" sortKeyValue="twr" />
              <th className="text-left text-xs font-medium text-muted-foreground py-2 px-3">ΔV Margin</th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((result) => {
              const isRecommended = result.configuration.id === recommendedId
              const isSelected = result.configuration.id === selectedId

              return (
                <tr
                  key={result.configuration.id}
                  className={cn(
                    'border-b border-border/30 transition-colors cursor-pointer',
                    isSelected ? 'bg-primary/10' : 'hover:bg-muted/30',
                    isRecommended && 'bg-chart-2/5'
                  )}
                  onClick={() => onSelect?.(result)}
                >
                  <td className="py-2 px-3">
                    {isRecommended && (
                      <Star className="h-4 w-4 text-chart-2 fill-chart-2" />
                    )}
                    {isSelected && !isRecommended && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-sm font-medium text-foreground">
                      {result.configuration.name}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-sm font-mono text-foreground">
                      {result.maxPayload >= 1000
                        ? `${(result.maxPayload / 1000).toFixed(1)} t`
                        : `${result.maxPayload.toFixed(0)} kg`}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-sm font-mono text-foreground">
                      ${(result.totalCost / 1e6).toFixed(1)}M
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={cn(
                      'text-sm font-mono',
                      result.costPerKg < 3000 ? 'text-green-500' :
                      result.costPerKg < 10000 ? 'text-yellow-500' : 'text-orange-500'
                    )}>
                      ${result.costPerKg.toFixed(0)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-sm text-muted-foreground">
                      {result.configuration.stages.length}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={cn(
                      'text-sm font-mono',
                      result.twr >= 1.3 ? 'text-green-500' :
                      result.twr >= 1.1 ? 'text-yellow-500' : 'text-red-500'
                    )}>
                      {result.twr.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-sm font-mono text-muted-foreground">
                      +{result.deltaVMargin.toFixed(0)} m/s
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {results.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No configurations meet the mission requirements
        </div>
      )}
    </div>
  )
}
