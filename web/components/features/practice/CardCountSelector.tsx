'use client'

import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface CardCountSelectorProps {
  value: number
  maxAvailable: number
  useAll: boolean
  onValueChange: (count: number) => void
  onUseAllChange: (useAll: boolean) => void
}

export function CardCountSelector({
  value,
  maxAvailable,
  useAll,
  onValueChange,
  onUseAllChange,
}: CardCountSelectorProps) {
  const effectiveMax = Math.min(50, maxAvailable)

  return (
    <div className="space-y-3 rounded-lg border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="card-count" className="text-sm font-medium text-foreground">
          Card Count
        </Label>
        <span className="text-sm font-medium text-muted-foreground">
          {useAll ? `All ${maxAvailable}` : value} cards
        </span>
      </div>

      <Slider
        id="card-count"
        min={5}
        max={effectiveMax}
        step={5}
        value={[value]}
        onValueChange={([val]) => onValueChange(val)}
        disabled={useAll}
        className="py-2"
      />

      <div className="flex items-center gap-2 pt-1">
        <Switch
          id="use-all-cards"
          checked={useAll}
          onCheckedChange={onUseAllChange}
        />
        <Label
          htmlFor="use-all-cards"
          className="text-xs text-muted-foreground cursor-pointer"
        >
          Use all available cards
        </Label>
      </div>
    </div>
  )
}
