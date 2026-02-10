'use client'

import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  type Stage,
  calculateStageMetrics,
  type MultiStageParams,
} from '@/lib/physics/multiStageSimulator'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface StageConfiguratorProps {
  stages: Stage[]
  payloadMass: number
  onChange: (stages: Stage[]) => void
  maxStages?: number
}

// Stage colors for visualization
const STAGE_COLORS = [
  'bg-primary',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
]

// Helper to generate unique IDs
function generateId(): string {
  return `stage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Default stage template
function createDefaultStage(index: number): Stage {
  return {
    id: generateId(),
    name: `Stage ${index + 1}`,
    dryMass: 500,
    fuelMass: 4500,
    thrust: 100000,
    isp: 280,
    burnTime: 120,
  }
}

export function StageConfigurator({
  stages,
  payloadMass,
  onChange,
  maxStages = 4,
}: StageConfiguratorProps) {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(
    new Set(stages.map((s) => s.id))
  )

  // Calculate metrics for display
  const params: MultiStageParams = {
    stages,
    payloadMass,
    dragCoefficient: 0.5,
    crossSectionalArea: 2,
    separationDelay: 2,
  }
  const metrics = calculateStageMetrics(params)

  function toggleExpanded(stageId: string) {
    const newExpanded = new Set(expandedStages)
    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId)
    } else {
      newExpanded.add(stageId)
    }
    setExpandedStages(newExpanded)
  }

  function updateStage(index: number, updates: Partial<Stage>) {
    const newStages = [...stages]
    newStages[index] = { ...newStages[index], ...updates }
    onChange(newStages)
  }

  function addStage() {
    if (stages.length >= maxStages) return
    const newStage = createDefaultStage(stages.length)
    setExpandedStages(new Set([...expandedStages, newStage.id]))
    onChange([...stages, newStage])
  }

  function removeStage(index: number) {
    if (stages.length <= 1) return
    const newStages = stages.filter((_, i) => i !== index)
    onChange(newStages)
  }

  function moveStage(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= stages.length) return

    const newStages = [...stages]
    const temp = newStages[index]
    newStages[index] = newStages[newIndex]
    newStages[newIndex] = temp
    onChange(newStages)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Stages ({stages.length}/{maxStages})
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={addStage}
          disabled={stages.length >= maxStages}
          className="gap-1 h-7 text-xs"
        >
          <Plus className="h-3 w-3" />
          Add Stage
        </Button>
      </div>

      {/* Stage list - displayed bottom to top visually */}
      <div className="space-y-2">
        {stages.map((stage, index) => {
          const stageMetrics = metrics[index]
          const isExpanded = expandedStages.has(stage.id)
          const colorClass = STAGE_COLORS[index % STAGE_COLORS.length]

          return (
            <div
              key={stage.id}
              className="rounded-lg border border-border/50 bg-card overflow-hidden"
            >
              {/* Stage header */}
              <div
                className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpanded(stage.id)}
              >
                <div className={cn('w-3 h-8 rounded', colorClass)} />

                <div className="flex items-center gap-1 text-muted-foreground">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      moveStage(index, 'up')
                    }}
                    disabled={index === 0}
                    className="p-0.5 hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      moveStage(index, 'down')
                    }}
                    disabled={index === stages.length - 1}
                    className="p-0.5 hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {stage.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {index === 0 ? '(First)' : index === stages.length - 1 ? '(Final)' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>ΔV: {stageMetrics?.deltaV.toFixed(0) || 0} m/s</span>
                    <span>TWR: {stageMetrics?.twr.toFixed(2) || 0}</span>
                    <span>Mass: {((stageMetrics?.wetMass || 0) / 1000).toFixed(1)}t</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeStage(index)
                  }}
                  disabled={stages.length <= 1}
                  className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    isExpanded && 'rotate-180'
                  )}
                />
              </div>

              {/* Stage controls */}
              {isExpanded && (
                <div className="p-4 pt-0 space-y-4 border-t border-border/50">
                  {/* Stage name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <Input
                      value={stage.name}
                      onChange={(e) => updateStage(index, { name: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Thrust */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Thrust
                      </Label>
                      <span className="text-xs text-foreground">
                        {(stage.thrust / 1000).toFixed(0)} kN
                      </span>
                    </div>
                    <Slider
                      value={[stage.thrust]}
                      onValueChange={([v]) => updateStage(index, { thrust: v })}
                      min={1000}
                      max={50000000}
                      step={1000}
                    />
                  </div>

                  {/* Specific Impulse */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Specific Impulse (Isp)
                      </Label>
                      <span className="text-xs text-foreground">{stage.isp} s</span>
                    </div>
                    <Slider
                      value={[stage.isp]}
                      onValueChange={([v]) => updateStage(index, { isp: v })}
                      min={100}
                      max={500}
                      step={1}
                    />
                  </div>

                  {/* Dry Mass */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Dry Mass (structure)
                      </Label>
                      <span className="text-xs text-foreground">
                        {stage.dryMass >= 1000
                          ? `${(stage.dryMass / 1000).toFixed(1)} t`
                          : `${stage.dryMass} kg`}
                      </span>
                    </div>
                    <Slider
                      value={[stage.dryMass]}
                      onValueChange={([v]) => updateStage(index, { dryMass: v })}
                      min={10}
                      max={200000}
                      step={10}
                    />
                  </div>

                  {/* Fuel Mass */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Fuel Mass
                      </Label>
                      <span className="text-xs text-foreground">
                        {stage.fuelMass >= 1000
                          ? `${(stage.fuelMass / 1000).toFixed(1)} t`
                          : `${stage.fuelMass} kg`}
                      </span>
                    </div>
                    <Slider
                      value={[stage.fuelMass]}
                      onValueChange={([v]) => updateStage(index, { fuelMass: v })}
                      min={10}
                      max={3000000}
                      step={10}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Total stats */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Total ΔV:</span>{' '}
            <span className="font-semibold text-foreground">
              {metrics.reduce((sum, m) => sum + m.deltaV, 0).toFixed(0)} m/s
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Initial TWR:</span>{' '}
            <span
              className={cn(
                'font-semibold',
                metrics[0]?.twr >= 1 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {metrics[0]?.twr.toFixed(2) || 0}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Mass:</span>{' '}
            <span className="font-semibold text-foreground">
              {(
                (stages.reduce((sum, s) => sum + s.dryMass + s.fuelMass, 0) +
                  payloadMass) /
                1000
              ).toFixed(1)}{' '}
              t
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Payload:</span>{' '}
            <span className="font-semibold text-foreground">
              {payloadMass >= 1000
                ? `${(payloadMass / 1000).toFixed(1)} t`
                : `${payloadMass} kg`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
