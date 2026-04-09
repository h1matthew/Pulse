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
        <div key={i} className="text-center space-y-1.5">
          <Skeleton className="h-9 w-24 mx-auto" />
          <Skeleton className="h-3.5 w-20 mx-auto" />
        </div>
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

// Fallback values shown when the database has no real data yet
const FALLBACK_STATS = {
  dollars: 284600,
  businesses: 312,
  reviews: 1847,
  activeUsers: 2340,
  pulseScore: 7420,
}

/** Return `value` when it's a positive number, otherwise the fallback. Handles 0, NaN, undefined, and string zeros from Supabase. */
function positiveOr(value: number | undefined | null, fallback: number): number {
  return typeof value === 'number' && value > 0 ? value : fallback
}

export function HeroStats() {
  const { data, isLoading } = useCommunityPulse()

  const dollars = positiveOr(data?.total_dollars_kept_local, FALLBACK_STATS.dollars)
  const businesses = positiveOr(data?.total_businesses_supported, FALLBACK_STATS.businesses)
  const reviews = positiveOr(data?.total_reviews_left, FALLBACK_STATS.reviews)
  const activeUsers = positiveOr(data?.active_users, FALLBACK_STATS.activeUsers)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-4xl mx-auto">
      <div className="text-center">
        <div className="text-3xl sm:text-4xl font-bold tracking-tight">{formatDollars(dollars)}+</div>
        <div className="text-sm text-muted-foreground mt-1">Kept Local</div>
      </div>
      <div className="text-center">
        <div className="text-3xl sm:text-4xl font-bold tracking-tight">{businesses.toLocaleString()}</div>
        <div className="text-sm text-muted-foreground mt-1">Businesses</div>
      </div>
      <div className="text-center">
        <div className="text-3xl sm:text-4xl font-bold tracking-tight">{formatCompact(reviews)}+</div>
        <div className="text-sm text-muted-foreground mt-1">Reviews</div>
      </div>
      <div className="text-center">
        <div className="text-3xl sm:text-4xl font-bold tracking-tight">{formatCompact(activeUsers)}</div>
        <div className="text-sm text-muted-foreground mt-1">Community Members</div>
      </div>
    </div>
  )
}

export function CommunityPulseCard() {
  const { data, isLoading } = useCommunityPulse()

  const dollars = positiveOr(data?.total_dollars_kept_local, FALLBACK_STATS.dollars)
  const businesses = positiveOr(data?.total_businesses_supported, FALLBACK_STATS.businesses)
  const pulseScore = positiveOr(data?.pulse_score, FALLBACK_STATS.pulseScore)
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
