'use client'

import { useCommunityPulse } from '@/hooks/useImpact'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// Inline formatters (cannot import from impact-calculator.ts — it pulls in supabase/server)
function formatDollars(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`
  return `$${amount}`
}

function formatCompact(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

// Bar width scale maximums
const MAX_DOLLARS = 3_200_000
const MAX_BUSINESSES = 1_000
const MAX_JOBS = 200

function barPct(value: number, max: number): number {
  return Math.min(95, Math.round((value / max) * 100))
}

// ============================================================================
// Sub-components
// ============================================================================

interface StatCardProps {
  value: string
  label: string
  colorClass: string
}

function StatCard({ value, label, colorClass }: StatCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardContent className="p-4 text-center">
        <div className={cn('text-2xl font-bold', colorClass)}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}

interface MetricRowProps {
  label: string
  value: string
  pct: number
  gradientClass: string
}

function MetricRow({ label, value, pct, gradientClass }: MetricRowProps) {
  return (
    <>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full bg-gradient-to-r rounded-full', gradientClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </>
  )
}

// ============================================================================
// Skeletons
// ============================================================================

function HeroStatsSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="bg-card/50 backdrop-blur">
          <CardContent className="p-4 text-center space-y-2">
            <Skeleton className="h-7 w-16 mx-auto" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </CardContent>
        </Card>
      ))}
    </>
  )
}

function PulseCardSkeleton() {
  return (
    <Card className="relative bg-card/80 backdrop-blur">
      <CardContent className="p-8">
        <div className="text-center mb-8 space-y-2">
          <Skeleton className="h-12 w-32 mx-auto" />
          <Skeleton className="h-4 w-40 mx-auto" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Exported Components
// ============================================================================

export function HeroStats() {
  const { data, isLoading } = useCommunityPulse()

  const dollars = data?.total_dollars_kept_local ?? 0
  const businesses = data?.total_businesses_supported ?? 0
  const reviews = data?.total_reviews_left ?? 0
  const activeUsers = data?.active_users ?? 0

  return (
    <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
      {isLoading ? (
        <HeroStatsSkeleton />
      ) : (
        <>
          <StatCard value={formatDollars(dollars)} label="Kept Local" colorClass="text-primary" />
          <StatCard value={businesses.toLocaleString()} label="Businesses" colorClass="text-chart-2" />
          <StatCard value={formatCompact(reviews)} label="Reviews" colorClass="text-chart-3" />
          <StatCard value={formatCompact(activeUsers)} label="Community Members" colorClass="text-chart-4" />
        </>
      )}
    </div>
  )
}

export function CommunityPulseCard() {
  const { data, isLoading } = useCommunityPulse()

  const dollars = data?.total_dollars_kept_local ?? 0
  const businesses = data?.total_businesses_supported ?? 0
  const pulseScore = data?.pulse_score ?? 0
  const jobs = Math.max(0, Math.floor(dollars / 15_000))

  if (isLoading) {
    return <PulseCardSkeleton />
  }

  return (
    <Card className="relative bg-card/80 backdrop-blur">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <div className="text-5xl font-bold gradient-text mb-2">
            {pulseScore.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">Community Pulse Score</div>
        </div>
        <div className="space-y-4">
          <MetricRow
            label="Dollars Kept Local"
            value={formatDollars(dollars)}
            pct={barPct(dollars, MAX_DOLLARS)}
            gradientClass="from-primary to-chart-2"
          />
          <MetricRow
            label="Businesses Supported"
            value={businesses.toLocaleString()}
            pct={barPct(businesses, MAX_BUSINESSES)}
            gradientClass="from-chart-3 to-chart-4"
          />
          <MetricRow
            label="Jobs Impacted"
            value={jobs.toString()}
            pct={barPct(jobs, MAX_JOBS)}
            gradientClass="from-chart-5 to-primary"
          />
        </div>
      </CardContent>
    </Card>
  )
}
