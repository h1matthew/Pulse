'use client'

import { useState, useMemo, useCallback } from 'react'
import { ChevronDown, Target, DollarSign, Scale, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { RocketComparisonTable } from '@/components/features/simulator/RocketComparisonTable'
import { ParetoFrontierChart } from '@/components/features/simulator/ParetoFrontierChart'
import {
  calculateAllCapacities,
  calculateRequiredDeltaV,
  generateParetoFrontier,
  getRecommendation,
  ORBIT_PROFILES,
  LAUNCH_SITES,
  type MissionProfile,
  type OrbitType,
  type LaunchSite,
  type PayloadCapacity,
} from '@/lib/physics/payloadOptimizer'
import { cn } from '@/lib/utils'

export default function PayloadOptimizerPage() {
  const [orbitType, setOrbitType] = useState<OrbitType | 'custom'>('LEO')
  const [customDeltaV, setCustomDeltaV] = useState(9400)
  const [launchSite, setLaunchSite] = useState<LaunchSite>('cape-canaveral')
  const [prioritySlider, setPrioritySlider] = useState(0.5) // 0 = cost, 1 = payload
  const [selectedConfig, setSelectedConfig] = useState<PayloadCapacity | null>(null)

  const missionProfile: MissionProfile = useMemo(() => ({
    targetOrbit: orbitType,
    customDeltaV: orbitType === 'custom' ? customDeltaV : undefined,
    launchSite,
  }), [orbitType, customDeltaV, launchSite])

  const requiredDeltaV = useMemo(() => calculateRequiredDeltaV(missionProfile), [missionProfile])

  const results = useMemo(() => calculateAllCapacities(missionProfile), [missionProfile])

  const paretoFrontier = useMemo(() => generateParetoFrontier(results), [results])

  const recommendation = useMemo(() =>
    getRecommendation(results, prioritySlider),
    [results, prioritySlider]
  )

  const handleSelectConfig = useCallback((config: PayloadCapacity) => {
    setSelectedConfig(config)
  }, [])

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            Payload Optimization
          </h1>
          <p className="text-muted-foreground">
            Compare rocket configurations for your mission. Find the optimal balance between payload capacity and cost.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          {/* Mission Profile Panel */}
          <div className="space-y-4">
            {/* Target Orbit */}
            <div className="bg-card rounded-xl border border-border/50 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Target Orbit
              </h3>

              <div className="space-y-3">
                <div className="relative">
                  <select
                    value={orbitType}
                    onChange={(e) => setOrbitType(e.target.value as OrbitType | 'custom')}
                    className="w-full appearance-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {Object.entries(ORBIT_PROFILES).map(([key, profile]) => (
                      <option key={key} value={key}>
                        {profile.name}
                      </option>
                    ))}
                    <option value="custom">Custom Delta-V</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>

                {orbitType !== 'custom' && (
                  <p className="text-xs text-muted-foreground">
                    {ORBIT_PROFILES[orbitType].description}
                  </p>
                )}

                {orbitType === 'custom' && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-xs text-muted-foreground">Required ΔV</Label>
                      <span className="text-xs text-foreground">{customDeltaV.toLocaleString()} m/s</span>
                    </div>
                    <Slider
                      value={[customDeltaV]}
                      onValueChange={([v]) => setCustomDeltaV(v)}
                      min={5000}
                      max={20000}
                      step={100}
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-border/50">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Base ΔV requirement:</span>
                    <span className="font-mono text-foreground">
                      {orbitType !== 'custom' ? ORBIT_PROFILES[orbitType].deltaV.toLocaleString() : customDeltaV.toLocaleString()} m/s
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Site */}
            <div className="bg-card rounded-xl border border-border/50 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Launch Site</h3>

              <div className="space-y-2">
                {Object.entries(LAUNCH_SITES).map(([key, site]) => (
                  <label
                    key={key}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors',
                      launchSite === key ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="launchSite"
                        value={key}
                        checked={launchSite === key}
                        onChange={() => setLaunchSite(key as LaunchSite)}
                        className="text-primary"
                      />
                      <div>
                        <span className="text-sm text-foreground">{site.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{site.latitude}°N</span>
                      </div>
                    </div>
                    <span className="text-xs text-green-500">+{site.deltaVBonus} m/s</span>
                  </label>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Net ΔV required:</span>
                  <span className="font-mono font-semibold text-primary">
                    {requiredDeltaV.toLocaleString()} m/s
                  </span>
                </div>
              </div>
            </div>

            {/* Priority Slider */}
            <div className="bg-card rounded-xl border border-border/50 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Optimization Priority
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className={cn(
                    'flex items-center gap-1',
                    prioritySlider < 0.3 ? 'text-primary font-medium' : 'text-muted-foreground'
                  )}>
                    <DollarSign className="h-3 w-3" />
                    Minimize Cost
                  </span>
                  <span className={cn(
                    'flex items-center gap-1',
                    prioritySlider > 0.7 ? 'text-primary font-medium' : 'text-muted-foreground'
                  )}>
                    Maximize Payload
                    <Target className="h-3 w-3" />
                  </span>
                </div>

                <Slider
                  value={[prioritySlider]}
                  onValueChange={([v]) => setPrioritySlider(v)}
                  min={0}
                  max={1}
                  step={0.05}
                />

                <p className="text-xs text-center text-muted-foreground">
                  {prioritySlider < 0.3 ? 'Prioritizing cost efficiency' :
                   prioritySlider > 0.7 ? 'Prioritizing payload capacity' :
                   'Balanced approach'}
                </p>
              </div>
            </div>

            {/* Recommendation */}
            {recommendation && (
              <div className="bg-chart-2/10 border border-chart-2/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-chart-2 fill-chart-2" />
                  <h3 className="text-sm font-semibold text-foreground">Recommended</h3>
                </div>
                <p className="text-lg font-semibold text-foreground mb-1">
                  {recommendation.recommended.configuration.name}
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  {recommendation.reason}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Payload:</span>
                    <span className="ml-1 font-mono text-foreground">
                      {(recommendation.recommended.maxPayload / 1000).toFixed(1)} t
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="ml-1 font-mono text-foreground">
                      ${(recommendation.recommended.totalCost / 1e6).toFixed(1)}M
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">$/kg:</span>
                    <span className="ml-1 font-mono text-foreground">
                      ${recommendation.recommended.costPerKg.toFixed(0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ΔV margin:</span>
                    <span className="ml-1 font-mono text-foreground">
                      +{recommendation.recommended.deltaVMargin.toFixed(0)} m/s
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Area */}
          <div className="space-y-6">
            {/* Pareto Chart */}
            <ParetoFrontierChart
              results={results}
              paretoFrontier={paretoFrontier}
              selectedId={selectedConfig?.configuration.id}
              onSelect={handleSelectConfig}
            />

            {/* Comparison Table */}
            <RocketComparisonTable
              results={results}
              recommendedId={recommendation?.recommended.configuration.id}
              selectedId={selectedConfig?.configuration.id}
              onSelect={handleSelectConfig}
            />

            {/* Selected Configuration Details */}
            {selectedConfig && (
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  Configuration Details: {selectedConfig.configuration.name}
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Stage breakdown */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Stage Breakdown</h4>
                    <div className="space-y-2">
                      {selectedConfig.configuration.stages.map((stage, i) => (
                        <div key={i} className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-foreground">Stage {i + 1}</span>
                            <span className="text-xs text-muted-foreground">
                              {stage.engineCount}x {stage.engineId}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Propellant:</span>
                              <span className="ml-1 font-mono text-foreground">
                                {(stage.propellantMass / 1000).toFixed(1)}t
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Structure:</span>
                              <span className="ml-1 font-mono text-foreground">
                                {(stage.structuralMass / 1000).toFixed(1)}t
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance metrics */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Performance Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between p-2 bg-muted/30 rounded-lg">
                        <span className="text-sm text-muted-foreground">Max Payload to {orbitType}</span>
                        <span className="text-sm font-mono font-semibold text-foreground">
                          {selectedConfig.maxPayload >= 1000
                            ? `${(selectedConfig.maxPayload / 1000).toFixed(2)} tons`
                            : `${selectedConfig.maxPayload.toFixed(0)} kg`}
                        </span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted/30 rounded-lg">
                        <span className="text-sm text-muted-foreground">Total Launch Cost</span>
                        <span className="text-sm font-mono font-semibold text-foreground">
                          ${(selectedConfig.totalCost / 1e6).toFixed(2)} million
                        </span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted/30 rounded-lg">
                        <span className="text-sm text-muted-foreground">Cost per Kilogram</span>
                        <span className={cn(
                          'text-sm font-mono font-semibold',
                          selectedConfig.costPerKg < 3000 ? 'text-green-500' :
                          selectedConfig.costPerKg < 10000 ? 'text-yellow-500' : 'text-orange-500'
                        )}>
                          ${selectedConfig.costPerKg.toFixed(0)}/kg
                        </span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted/30 rounded-lg">
                        <span className="text-sm text-muted-foreground">Initial TWR</span>
                        <span className={cn(
                          'text-sm font-mono font-semibold',
                          selectedConfig.twr >= 1.3 ? 'text-green-500' :
                          selectedConfig.twr >= 1.1 ? 'text-yellow-500' : 'text-red-500'
                        )}>
                          {selectedConfig.twr.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted/30 rounded-lg">
                        <span className="text-sm text-muted-foreground">ΔV Margin</span>
                        <span className="text-sm font-mono font-semibold text-green-500">
                          +{selectedConfig.deltaVMargin.toFixed(0)} m/s
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Info card */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <h4 className="text-sm font-medium text-foreground mb-2">About Pareto Optimization</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The Pareto frontier shows configurations where you cannot improve one metric (payload or cost)
                without worsening the other. Points on this frontier represent optimal trade-offs. The
                recommendation changes based on your priority slider, helping you find the best fit for your mission.
              </p>
            </div>
          </div>
        </div>
    </main>
  )
}
