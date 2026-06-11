'use client'

/**
 * HeroPreview — the "Today near you" card in the homepage hero.
 *
 * Replaces the old hardcoded mock: this pulls REAL top-rated businesses near
 * the user (falling back to Diamond Bar so the card is always populated) and
 * shows live counts (open now, independent, average rating). Gated behind a
 * mount flag so the server render and the client's first paint match (React
 * Query can hydrate persisted data, which would otherwise mismatch).
 */

import { useEffect, useMemo, useState } from 'react'
import { Clock, MapPin, Star } from 'lucide-react'
import { useLocation, calculateDistance, formatDistance } from '@/hooks/useLocation'
import { useCityName } from '@/hooks/useCityName'
import { useNearbyBusinesses } from '@/hooks/useBusinesses'
import { isOpenNow } from '@/lib/business/hours'
import { isChainBusiness } from '@/lib/business/classify'
import { NavLink } from '@/components/ui/nav-link'
import type { BusinessWithCategory, LatLng } from '@/types/business'
import { cn } from '@/lib/utils'

// Diamond Bar, CA — where the seeded data lives. Used when the visitor hasn't
// shared their location, so the hero always shows real nearby businesses.
const DEFAULT_LOCATION: LatLng = { lat: 34.0286, lng: -117.8103 }
const RADIUS_METERS = 10000

function coords(b: BusinessWithCategory): LatLng | null {
  const lat = b.latitude == null ? NaN : Number(b.latitude)
  const lng = b.longitude == null ? NaN : Number(b.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

function isIndependent(b: BusinessWithCategory): boolean {
  if (b.is_chain === true) return false
  if (b.is_chain === false) return true
  return !isChainBusiness({ name: b.name, tags: Array.isArray(b.tags) ? b.tags : [] })
}

function CardShell({
  locationLabel,
  pill,
  children,
}: {
  locationLabel: string
  pill: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Today near you</p>
          <p className="text-xs text-muted-foreground">{locationLabel}</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {pill}
        </div>
      </div>
      {children}
    </div>
  )
}

function PreviewSkeleton() {
  return (
    <CardShell locationLabel="Diamond Bar" pill={<span className="inline-block h-3 w-10 animate-pulse rounded bg-muted" />}>
      <div className="divide-y divide-border">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between px-4 py-4">
            <div className="min-w-0 space-y-2">
              <div className="h-3.5 w-40 animate-pulse rounded bg-muted" />
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-3.5 w-10 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 border-t border-border">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1.5 px-4 py-3">
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
            <div className="h-3 w-14 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </CardShell>
  )
}

export function HeroPreview() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { location } = useLocation()
  const effectiveLocation = location ?? DEFAULT_LOCATION
  const cityName = useCityName(location)
  const { data, isLoading } = useNearbyBusinesses(effectiveLocation, RADIUS_METERS)

  const view = useMemo(() => {
    const businesses = (data ?? []).filter((b) => (b.average_rating ?? 0) > 0)

    const top = [...businesses]
      .sort((a, b) => {
        const ratingDelta = (Number(b.average_rating) || 0) - (Number(a.average_rating) || 0)
        if (ratingDelta !== 0) return ratingDelta
        return (b.review_count ?? 0) - (a.review_count ?? 0)
      })
      .slice(0, 3)
      .map((b) => {
        const c = coords(b)
        return {
          id: b.id,
          name: b.name,
          category: b.category?.name ?? 'Local business',
          distance: c ? formatDistance(calculateDistance(effectiveLocation, c)) : null,
          rating: b.average_rating ? Number(b.average_rating).toFixed(1) : null,
          open: isOpenNow(b.hours),
        }
      })

    const openNow = businesses.filter((b) => isOpenNow(b.hours) === true).length
    const independent = businesses.filter(isIndependent).length
    const avgRating =
      businesses.length > 0
        ? (
            businesses.reduce((sum, b) => sum + (Number(b.average_rating) || 0), 0) /
            businesses.length
          ).toFixed(1)
        : '—'

    return {
      top,
      total: businesses.length,
      stats: [
        { label: 'Open now', value: String(openNow) },
        { label: 'Independent', value: String(independent) },
        { label: 'Avg rating', value: avgRating },
      ],
    }
  }, [data, effectiveLocation])

  // Stable skeleton until mounted + loaded so SSR and first client paint match.
  if (!mounted || isLoading || view.top.length === 0) {
    return <PreviewSkeleton />
  }

  return (
    <CardShell
      locationLabel={cityName ?? (location ? 'Near you' : 'Diamond Bar')}
      pill={<span className="font-mono">{view.total} places</span>}
    >
      <div className="divide-y divide-border">
        {view.top.map((b) => (
          <NavLink
            key={b.id}
            href={`/business/${b.id}`}
            className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-4 transition-colors hover:bg-secondary/60"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{b.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {b.category}
                  {b.distance ? ` · ${b.distance}` : ''}
                </span>
                {b.open === true && (
                  <span className="inline-flex items-center gap-1 text-chart-3">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    Open now
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm font-mono font-medium text-foreground">
              {b.rating && <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />}
              {b.rating ?? '—'}
            </div>
          </NavLink>
        ))}
      </div>

      <div className="grid grid-cols-3 border-t border-border">
        {view.stats.map((s) => (
          <div key={s.label} className={cn('px-4 py-3')}>
            <div className="text-sm font-mono font-semibold text-foreground">{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </CardShell>
  )
}
