'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCommunityPulse } from '@/hooks/useImpact'
import { getCachedLocation } from '@/lib/location'
import { useNearbyBusinesses } from '@/hooks/useBusinesses'
import { isChainBusiness } from '@/lib/business/classify'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { BusinessWithCategory, LatLng } from '@/types/business'

// San Antonio, TX — default location when the visitor hasn't shared theirs.
const DEFAULT_LOCATION: LatLng = { lat: 29.4252, lng: -98.4946 }
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

// Compact mono readout — an instrument line, not a marketing counter.
const STAT_READOUT =
  'flex flex-wrap items-baseline gap-x-8 gap-y-2 font-mono text-meta uppercase tracking-wide text-text-tertiary'

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
        <div key={i} className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-20" />
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

/** Coerce a Supabase numeric (may arrive as undefined, NaN or a string zero) to a count. */
function count(value: number | undefined | null): number {
  return typeof value === 'number' && value > 0 ? value : 0
}

/**
 * Headline stats. Three of the four are location-aware — they recompute from the
 * businesses near the visitor (falling back to San Antonio), so
 * they change as the visitor's location changes:
 *   - Businesses      → independent shops nearby
 *   - Reviews         → total reviews across those shops
 *   - Places supported→ nearby shops that already have activity (reviews)
 * Community Members stays a community-wide total (it isn't location-bound).
 */
export function HeroStats() {
  const { data: pulse, isLoading: pulseLoading } = useCommunityPulse()
  const location = getCachedLocation()
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
      <div className={STAT_READOUT}>
        <HeroStatsSkeleton />
      </div>
    )
  }

  const businesses = count(local.businesses)
  const reviews = count(local.reviews)
  const supported = count(local.supported)
  const activeUsers = count(pulse?.active_users)

  // Nothing measured yet (empty install): show nothing rather than stand-in numbers.
  if (!businesses && !reviews && !supported && !activeUsers) return null

  const readout = [
    { label: 'Businesses', value: businesses.toLocaleString() },
    { label: 'Reviews', value: formatCompact(reviews) },
    { label: 'Places Supported', value: supported.toLocaleString() },
    { label: 'Community Members', value: formatCompact(activeUsers) },
  ]

  return (
    <div className={STAT_READOUT}>
      {readout.map((stat) => (
        <div key={stat.label} className="flex items-baseline gap-1.5">
          <span className="tabular-nums text-foreground">{stat.value}</span>
          <span>{stat.label}</span>
        </div>
      ))}
    </div>
  )
}

export function CommunityPulseCard() {
  const { data, isLoading } = useCommunityPulse()

  const mounted = useMounted()
  const dollars = count(data?.total_dollars_kept_local)
  const businesses = count(data?.total_businesses_supported)
  const pulseScore = count(data?.pulse_score)
  const jobs = Math.max(0, Math.floor(dollars / 15_000))

  if (!mounted || isLoading) {
    return <PulseCardSkeleton />
  }

  // Nothing measured yet (empty install): show nothing rather than stand-in numbers.
  if (!dollars && !businesses && !pulseScore) return null

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
