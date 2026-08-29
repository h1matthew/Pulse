'use client'

/**
 * FeatureTabs — the homepage listing feed.
 *
 * Places shows real nearby businesses, grouped by open status and rating, with
 * working per-row bookmark buttons — guests save on-device via
 * useToggleBookmark's local scope. Deals and Impact are static sample rows and
 * say so in their header line. Live rows are gated behind a mount flag so the
 * server render and the client's first paint match (React Query can hydrate
 * persisted data, which would otherwise mismatch).
 */

import { useEffect, useMemo, useState } from 'react'
import { Bookmark } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { NavLink } from '@/components/ui/nav-link'
import { calculateDistance, formatDistance } from '@/hooks/useLocation'
import { getCachedLocation } from '@/lib/location'
import { useCityName } from '@/hooks/useCityName'
import { useNearbyBusinesses } from '@/hooks/useBusinesses'
import { useIsBookmarked, useToggleBookmark } from '@/hooks/useBookmarks'
import { isOpenNow } from '@/lib/business/hours'
import type { BusinessWithCategory, LatLng } from '@/types/business'

// San Antonio, TX — default location when the visitor hasn't shared theirs.
const DEFAULT_LOCATION: LatLng = { lat: 29.4252, lng: -98.4946 }
const RADIUS_METERS = 10000

const TABS = [
  { id: 'find', label: 'Places' },
  { id: 'deals', label: 'Offers' },
  { id: 'impact', label: 'Ledger' },
] as const

type TabId = (typeof TABS)[number]['id']

interface StaticRow {
  name: string
  meta: string
  value: string
}

interface TabContent {
  note: string
  href: string
  cta: string
  rows: StaticRow[]
}

// Deals and Impact rows are samples; the note line says so on the tab itself.
const TAB_CONTENT: Record<TabId, TabContent> = {
  find: {
    note: 'Open now · Highest rated',
    href: '/discover',
    cta: 'All places',
    rows: [],
  },
  deals: {
    note: 'Sample rows · live offers on /deals',
    href: '/deals',
    cta: 'All deals',
    rows: [
      { name: 'Weeknight bento', meta: 'Kimura Ramen · Tue–Thu after 6pm', value: '$9.99' },
      { name: 'Second latte free', meta: 'Bakery Lorraine · Before 10am', value: 'BOGO' },
      { name: 'New hardcovers', meta: 'The Twig Book Shop · All month', value: '20%' },
    ],
  },
  impact: {
    note: 'Sample figures · sign in for yours',
    href: '/dashboard',
    cta: 'Your dashboard',
    rows: [
      { name: 'Kept local', meta: 'Visits and claimed deals', value: '$184' },
      { name: 'Places supported', meta: 'This month', value: '7' },
      { name: 'Deals claimed', meta: 'This month', value: '3' },
    ],
  },
}

function coords(b: BusinessWithCategory): LatLng | null {
  const lat = b.latitude == null ? NaN : Number(b.latitude)
  const lng = b.longitude == null ? NaN : Number(b.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

function priceBand(level: number | null | undefined): string | null {
  const n = Number(level)
  return Number.isFinite(n) && n >= 1 ? '$'.repeat(Math.min(4, Math.round(n))) : null
}

function hoursLabel(hours: unknown): string | null {
  const open = isOpenNow(hours)
  if (open === true) return 'Open now'
  if (open === false) return 'Closed'
  return null
}

interface NearbyRow {
  id: string
  name: string
  meta: string
  note: string | null
  distance: string | null
  rating: string | null
}

/** Open-now places first, then best rated — both tiers sorted by rating then review count. */
function selectNearby(businesses: BusinessWithCategory[], origin: LatLng): NearbyRow[] {
  const byRating = (a: BusinessWithCategory, b: BusinessWithCategory) => {
    const ratingDelta = (Number(b.average_rating) || 0) - (Number(a.average_rating) || 0)
    if (ratingDelta !== 0) return ratingDelta
    return (b.review_count ?? 0) - (a.review_count ?? 0)
  }

  const sorted = [...businesses].sort(byRating)
  const open = sorted.filter((b) => isOpenNow(b.hours) === true)
  const rest = sorted.filter((b) => isOpenNow(b.hours) !== true)

  return [...open, ...rest].slice(0, 3).map((b) => {
    const c = coords(b)
    // Fixed order: category, neighborhood, price, hours.
    const meta = [b.category?.name ?? 'Local business', b.city, priceBand(b.price_range), hoursLabel(b.hours)]
      .filter(Boolean)
      .join(' · ')
    return {
      id: b.id,
      name: b.name,
      meta,
      note: b.editorial_summary || b.short_description || null,
      distance: c ? formatDistance(calculateDistance(origin, c)) : null,
      rating: b.average_rating ? Number(b.average_rating).toFixed(1) : null,
    }
  })
}

const ROW_GRID = 'grid grid-cols-[2.75rem_1fr] gap-x-4 py-4'
const RATING = 'font-mono text-h3 tabular-nums text-foreground'
const META = 'text-small text-text-tertiary'
const ACTION = 'text-small text-muted-foreground transition-colors hover:text-primary'

function RowSkeleton() {
  return (
    <div className="divide-y divide-border" data-testid="find-rows-skeleton">
      {[0, 1, 2].map((i) => (
        <div key={i} className={ROW_GRID}>
          <div className="h-5 w-9 animate-pulse rounded bg-muted" />
          <div className="min-w-0 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-56 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

function NearbyBusinessRow({ row }: { row: NearbyRow }) {
  const { data: isBookmarked } = useIsBookmarked(row.id)
  const toggleBookmark = useToggleBookmark()
  const bookmarked = isBookmarked === true

  const handleToggle = async () => {
    try {
      const result = await toggleBookmark.mutateAsync({
        businessId: row.id,
        isBookmarked: bookmarked,
      })
      if (result.local) {
        toast.success(result.bookmarked ? 'Saved on this device' : 'Removed from this device', {
          description: 'Sign in to sync bookmarks across devices.',
        })
      } else {
        toast.success(result.bookmarked ? 'Business bookmarked' : 'Bookmark removed')
      }
    } catch {
      toast.error('Failed to update bookmark')
    }
  }

  return (
    <article className={ROW_GRID}>
      <div className={RATING}>{row.rating ?? '—'}</div>
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-4">
          <NavLink
            href={`/business/${row.id}`}
            className="truncate text-body font-medium text-foreground transition-colors hover:text-primary"
          >
            {row.name}
          </NavLink>
          {row.distance && (
            <span className="shrink-0 font-mono text-meta text-text-tertiary">{row.distance}</span>
          )}
        </div>
        <p className={cn('mt-1', META)}>{row.meta}</p>
        {row.note && <p className="mt-1.5 line-clamp-1 text-small text-muted-foreground">{row.note}</p>}
        <div className="mt-2 flex items-center gap-5">
          <NavLink href={`/business/${row.id}`} className={ACTION}>
            Details
          </NavLink>
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggleBookmark.isPending}
            aria-label={bookmarked ? `Remove bookmark for ${row.name}` : `Bookmark ${row.name}`}
            className={cn('inline-flex items-center gap-1.5', ACTION)}
          >
            <Bookmark
              className={cn('h-3 w-3', bookmarked ? 'fill-foreground text-foreground' : 'text-muted-foreground')}
              aria-hidden="true"
            />
            {bookmarked ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </article>
  )
}

function NearbyRows() {
  // Stable skeleton until mounted + loaded so SSR and first client paint match.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const location = getCachedLocation()
  const effectiveLocation = location ?? DEFAULT_LOCATION
  const { data, isLoading } = useNearbyBusinesses(effectiveLocation, RADIUS_METERS)

  const rows = useMemo(() => selectNearby(data ?? [], effectiveLocation), [data, effectiveLocation])

  if (!mounted || isLoading || rows.length === 0) {
    return <RowSkeleton />
  }

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <NearbyBusinessRow key={row.id} row={row} />
      ))}
    </div>
  )
}

function StaticRows({ rows }: { rows: StaticRow[] }) {
  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <article key={row.name} className={ROW_GRID}>
          <div className={RATING}>{row.value}</div>
          <div className="min-w-0">
            <div className="truncate text-body font-medium text-foreground">{row.name}</div>
            <p className={cn('mt-1', META)}>{row.meta}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

export function FeatureTabs() {
  const [active, setActive] = useState<TabId>('find')
  const content = TAB_CONTENT[active]

  const location = getCachedLocation()
  const cityName = useCityName(location)

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border pb-3">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-small font-medium transition-colors',
                active === tab.id
                  ? 'bg-surface-3 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-5">
          <p className={META}>
            {cityName ?? 'San Antonio'} · {content.note}
          </p>
          <NavLink href="/bookmarks" aria-label="View saved places" className={ACTION}>
            Saved
          </NavLink>
        </div>
      </div>

      {active === 'find' ? <NearbyRows /> : <StaticRows rows={content.rows} />}

      <div className="border-t border-border pt-3">
        <NavLink href={content.href} className={ACTION}>
          {content.cta}
        </NavLink>
      </div>
    </div>
  )
}
