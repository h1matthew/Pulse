'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCommunityPulse } from '@/hooks/useImpact'
import { useLocation } from '@/hooks/useLocation'
import { useNearbyBusinesses } from '@/hooks/useBusinesses'
import { isChainBusiness } from '@/lib/business/classify'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { BusinessWithCategory, LatLng } from '@/types/business'

// Diamond Bar, CA — where the seeded data lives. Used when the visitor hasn't
// shared their location, so the headline stats always reflect real businesses.
const DEFAULT_LOCATION: LatLng = { lat: 34.0286, lng: -117.8103 }
const RADIUS_METERS = 10000

function isIndependent(b: BusinessWithCategory): boolean {
  if (b.is_chain === true) return false
  if (b.is_chain === false) return true
  return !isChainBusiness({ name: b.name, tags: Array.isArray(b.tags) ? b.tags : [] })
}

/**
 * React Query can hydrate persisted community-pulse data on the client before
 * the server ever fetched it, so the server renders the skeleton while the
 * client's first paint would render numbers — a hydration mismatch. Gate the
 * "loaded" branch behind a mount flag so the first client render always
 * matches the server (skeleton), then reveal real data after mount.
 */
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

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
    <Card className="bg-card">
      <CardContent className="p-4 text-center">
        <div className={cn('text-2xl font-mono font-semibold', colorClass)}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}

interface MetricRowProps {
  label: string
  value: string
  pct: number
}

function MetricRow({ label, value, pct }: MetricRowProps) {
  return (
    <>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium text-foreground">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
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
    <Card className="relative bg-card">
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
  supported: 96,
  activeUsers: 2340,
  pulseScore: 7420,
}

/** Return `value` when it's a positive number, otherwise the fallback. Handles 0, NaN, undefined, and string zeros from Supabase. */
function positiveOr(value: number | undefined | null, fallback: number): number {
  return typeof value === 'number' && value > 0 ? value : fallback
}

/**
 * Headline stats. Three of the four are location-aware — they recompute from the
 * businesses near the visitor (falling back to the seeded Diamond Bar set), so
 * they change as the visitor's location changes:
 *   - Businesses      → independent shops nearby
 *   - Reviews         → total reviews across those shops
 *   - Places supported→ nearby shops that already have activity (reviews)
 * Community Members stays a community-wide total (it isn't location-bound).
 */
export function HeroStats() {
  const { data: pulse, isLoading: pulseLoading } = useCommunityPulse()
  const { location } = useLocation()
  const effectiveLocation = location ?? DEFAULT_LOCATION
  const { data: nearby, isLoading: nearbyLoading } = useNearbyBusinesses(
    effectiveLocation,
    RADIUS_METERS
  )
  const mounted = useMounted()

  const local = useMemo(() => {
    const independent = (nearby ?? []).filter(isIndependent)
    return {
      businesses: independent.length,
      reviews: independent.reduce((sum, b) => sum + (b.review_count ?? 0), 0),
      supported: independent.filter((b) => (b.review_count ?? 0) > 0).length,
    }
  }, [nearby])

  if (!mounted || pulseLoading || nearbyLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-4xl mx-auto">
        <HeroStatsSkeleton />
      </div>
    )
  }

  const businesses = positiveOr(local.businesses, FALLBACK_STATS.businesses)
  const reviews = positiveOr(local.reviews, FALLBACK_STATS.reviews)
  const supported = positiveOr(local.supported, FALLBACK_STATS.supported)
  const activeUsers = positiveOr(pulse?.active_users, FALLBACK_STATS.activeUsers)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-4xl mx-auto">
      <div className="text-center">
        <div className="text-3xl sm:text-4xl font-mono font-semibold tracking-tight text-foreground">{businesses.toLocaleString()}</div>
        <div className="text-sm text-muted-foreground mt-1">Businesses</div>
      </div>
      <div className="text-center">
        <div className="text-3xl sm:text-4xl font-mono font-semibold tracking-tight text-foreground">{formatCompact(reviews)}</div>
        <div className="text-sm text-muted-foreground mt-1">Reviews</div>
      </div>
      <div className="text-center">
        <div className="text-3xl sm:text-4xl font-mono font-semibold tracking-tight text-foreground">{supported.toLocaleString()}</div>
        <div className="text-sm text-muted-foreground mt-1">Places Supported</div>
      </div>
      <div className="text-center">
        <div className="text-3xl sm:text-4xl font-mono font-semibold tracking-tight text-foreground">{formatCompact(activeUsers)}</div>
        <div className="text-sm text-muted-foreground mt-1">Community Members</div>
      </div>
    </div>
  )
}

export function CommunityPulseCard() {
  const { data, isLoading } = useCommunityPulse()

  const mounted = useMounted()
  const dollars = positiveOr(data?.total_dollars_kept_local, FALLBACK_STATS.dollars)
  const businesses = positiveOr(data?.total_businesses_supported, FALLBACK_STATS.businesses)
  const pulseScore = positiveOr(data?.pulse_score, FALLBACK_STATS.pulseScore)
  const jobs = Math.max(0, Math.floor(dollars / 15_000))

  if (!mounted || isLoading) {
    return <PulseCardSkeleton />
  }

  return (
    <Card className="relative bg-card">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <div className="text-5xl font-mono font-semibold text-primary mb-2">
            {pulseScore.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">Community Pulse Score</div>
        </div>
        <div className="space-y-4">
          <MetricRow
            label="Dollars Kept Local"
            value={formatDollars(dollars)}
            pct={barPct(dollars, MAX_DOLLARS)}
          />
          <MetricRow
            label="Businesses Supported"
            value={businesses.toLocaleString()}
            pct={barPct(businesses, MAX_BUSINESSES)}
          />
          <MetricRow
            label="Jobs Impacted"
            value={jobs.toString()}
            pct={barPct(jobs, MAX_JOBS)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
