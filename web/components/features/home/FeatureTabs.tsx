'use client'

/**
 * FeatureTabs — the "Local snapshot" card on the homepage.
 *
 * The Find tab shows REAL nearby businesses (open-now first, then best rated)
 * with working per-row bookmark buttons — guests save on-device via
 * useToggleBookmark's local scope. Deals and Impact stay static: they are
 * product explainers, not live data. The header bookmark icon links to
 * /bookmarks. Live rows are gated behind a mount flag so the server render
 * and the client's first paint match (React Query can hydrate persisted
 * data, which would otherwise mismatch).
 */

import { useEffect, useMemo, useState } from 'react'
import { Bookmark, MapPin, Star, Tag, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { NavLink } from '@/components/ui/nav-link'
import { Button } from '@/components/ui/button'
import { useLocation, calculateDistance, formatDistance } from '@/hooks/useLocation'
import { useNearbyBusinesses } from '@/hooks/useBusinesses'
import { useIsBookmarked, useToggleBookmark } from '@/hooks/useBookmarks'
import { isOpenNow } from '@/lib/business/hours'
import type { BusinessWithCategory, LatLng } from '@/types/business'

// Diamond Bar, CA — where the seeded data lives. Used when the visitor hasn't
// shared their location, so the card always shows real nearby businesses.
const DEFAULT_LOCATION: LatLng = { lat: 34.0286, lng: -117.8103 }
const RADIUS_METERS = 10000

const TABS = [
  { id: 'find', label: 'Find' },
  { id: 'deals', label: 'Deals' },
  { id: 'impact', label: 'Impact' },
] as const

type TabId = (typeof TABS)[number]['id']

interface SnapshotRow {
  name: string
  meta: string
  value: string
}

interface SnapshotContent {
  eyebrow: string
  title: string
  description: string
  href: string
  cta: string
  rows: SnapshotRow[]
}

// Deals and Impact are static product explainers; Find rows are live (below).
const SNAPSHOTS: Record<TabId, SnapshotContent> = {
  find: {
    eyebrow: 'Nearby places',
    title: 'Open now, well reviewed, close by.',
    description: 'A short list you can act on.',
    href: '/discover',
    cta: 'Browse places',
    rows: [],
  },
  deals: {
    eyebrow: 'Useful offers',
    title: 'Deals without the hunt.',
    description: 'Claim what fits today.',
    href: '/deals',
    cta: 'See deals',
    rows: [
      { name: 'Weeknight bento', meta: 'H Mart Diamond Bar', value: '15%' },
      { name: 'Seafood combo', meta: 'The Boiling Crab', value: '$8' },
      { name: 'Family arcade pass', meta: 'Round1 Arcade', value: '20%' },
    ],
  },
  impact: {
    eyebrow: 'Your month',
    title: 'A simple local record.',
    description: 'See what stayed nearby.',
    href: '/dashboard',
    cta: 'View impact',
    rows: [
      { name: 'Kept local', meta: 'From visits and claims', value: '$184' },
      { name: 'Places supported', meta: 'This month', value: '7' },
      { name: 'Saved places', meta: 'Ready for later', value: '12' },
    ],
  },
}

const ICONS: Record<TabId, typeof MapPin> = {
  find: MapPin,
  deals: Tag,
  impact: TrendingUp,
}

function coords(b: BusinessWithCategory): LatLng | null {
  const lat = b.latitude == null ? NaN : Number(b.latitude)
  const lng = b.longitude == null ? NaN : Number(b.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

interface NearbyRow {
  id: string
  name: string
  meta: string
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
    const category = b.category?.name ?? 'Local business'
    const distance = c ? formatDistance(calculateDistance(origin, c)) : null
    return {
      id: b.id,
      name: b.name,
      meta: distance ? `${category} · ${distance}` : category,
      rating: b.average_rating ? Number(b.average_rating).toFixed(1) : null,
    }
  })
}

function RowSkeleton() {
  return (
    <div className="divide-y divide-border" data-testid="find-rows-skeleton">
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-4 sm:px-5">
          <div className="min-w-0 space-y-2">
            <div className="h-3.5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-3.5 w-8 animate-pulse rounded bg-muted" />
          <div className="h-7 w-7 animate-pulse rounded bg-muted" />
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
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-4 sm:px-5">
      <NavLink
        href={`/business/${row.id}`}
        className="min-w-0 rounded-sm transition-colors hover:text-primary"
      >
        <div className="truncate text-sm font-medium text-foreground">{row.name}</div>
        <div className="mt-1 text-xs text-muted-foreground">{row.meta}</div>
      </NavLink>
      <div className="flex items-center gap-1 text-sm font-mono font-semibold text-foreground">
        <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
        {row.rating ?? '—'}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleToggle}
        disabled={toggleBookmark.isPending}
        aria-label={bookmarked ? `Remove bookmark for ${row.name}` : `Bookmark ${row.name}`}
      >
        <Bookmark
          className={cn(
            'h-4 w-4',
            bookmarked ? 'fill-primary text-primary' : 'text-muted-foreground'
          )}
          aria-hidden="true"
        />
      </Button>
    </div>
  )
}

function NearbyRows() {
  // Stable skeleton until mounted + loaded so SSR and first client paint match.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { location } = useLocation()
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

export function FeatureTabs() {
  const [active, setActive] = useState<TabId>('find')
  const content = SNAPSHOTS[active]
  const Icon = ICONS[active]

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Local snapshot</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Today nearby
        </h2>
        <p className="mt-4 max-w-sm text-base leading-7 text-muted-foreground">A short list for today.</p>

        <div className="mt-6 inline-flex rounded-md border border-border p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={cn(
                'rounded px-3 py-1.5 text-sm font-medium transition-colors',
                active === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Icon className="h-4 w-4 text-primary" />
              {content.eyebrow}
            </div>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">{content.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{content.description}</p>
          </div>
          <NavLink
            href="/bookmarks"
            aria-label="View saved places"
            className="mt-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Bookmark className="h-4 w-4" aria-hidden="true" />
          </NavLink>
        </div>

        {active === 'find' ? (
          <NearbyRows />
        ) : (
          <div className="divide-y divide-border">
            {content.rows.map((row) => (
              <div key={row.name} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{row.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{row.meta}</div>
                </div>
                <div className="flex items-center gap-1 text-sm font-mono font-semibold text-foreground">
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-border px-4 py-4 sm:px-5">
          <NavLink href={content.href} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4">
            {content.cta}
          </NavLink>
        </div>
      </div>
    </div>
  )
}
