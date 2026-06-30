'use client'

import {
  use,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import dynamic from 'next/dynamic'
import { AlertCircle, ArrowUpDown, ChevronDown, Clock, Heart, MapPin, Navigation, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Star, Store } from "lucide-react";

const DiscoverMap = dynamic(
  () => import('@/components/features/discover/DiscoverMap').then(m => m.DiscoverMap),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">Loading map…</div> }
)
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORY_FILTERS } from '@/lib/constants/navigation'
// BusinessCard and BusinessCardSkeleton are defined locally below
import { LocationPrompt } from '@/components/features/discover/LocationPrompt'
import { useNearbyBusinesses } from '@/hooks/useBusinesses'
import { useMissionProgressDetails } from '@/hooks/useMissions'
import { useAuth } from '@/components/providers/AuthProvider'
import { Progress } from '@/components/ui/progress'
import { useLocation, formatDistance, calculateDistance } from "@/hooks/useLocation";
import {
  useIsBookmarked,
  useToggleBookmark,
  useBookmarkedIds,
} from "@/hooks/useBookmarks";
import { toast } from "sonner";
import {
  buildBusinessFallbackImageUrl,
  buildBusinessPhotoUrl,
  getBusinessReviewLabel,
} from "@/lib/business/display";
import { NavLink } from "@/components/ui/nav-link";
import { getCachedLocation, cacheLocation, cacheLocationSource, getCachedLocationSource } from "@/lib/location";
import { isOpenNow } from "@/lib/business/hours";
import { isChainBusiness } from "@/lib/business/classify";
import { ChangeLocationDialog } from "@/components/features/discover/ChangeLocationDialog";
import { cn } from "@/lib/utils";
import type { BusinessWithCategory } from "@/types/business";
import type { LatLng } from "@/types/business";

// Search radius is expressed to the user in miles; the nearby API takes meters,
// so the page converts on the way out (see MILES_TO_METERS).
const RADIUS_OPTIONS = [
  { value: 5, label: '5 mi' },
  { value: 10, label: '10 mi' },
  { value: 15, label: '15 mi' },
  { value: 25, label: '25 mi' },
  { value: 50, label: '50 mi' },
]
const MAX_RADIUS_MILES = 50
const DEFAULT_RADIUS_MILES = 10
const MILES_TO_METERS = 1609.34

// Default location: San Antonio, TX (Pulse seeds this metro most densely)
const SAN_ANTONIO_DEFAULT: LatLng = { lat: 29.4252, lng: -98.4946 };

const PRICE_LEVELS = [1, 2, 3, 4] as const;

// Star-band rating filters, shown highest-first. Each value N filters to a
// one-star band [N, N+1): "1" shows 1–2 stars, "2" shows 2–3, … and "5" shows
// 5-star businesses (the band's upper bound is open, so 5 has no real ceiling).
const RATING_LEVELS = [5, 4, 3, 2, 1] as const;
const RESULTS_PANE_MIN_WIDTH = 360;
const RESULTS_PANE_DEFAULT_WIDTH = 520;
const RESULTS_PANE_MAX_WIDTH = 720;
const MAP_PANE_MIN_WIDTH = 420;
const RESULTS_PANE_KEYBOARD_STEP = 24;

/**
 * Independent vs. chain. A stored `is_chain=true` is authoritative (always a
 * chain), but a stored `is_chain=false` is NOT trusted to force-include: the
 * sync/seed pipeline writes false on every row, so we always re-check the name
 * against the curated chain list. This keeps brands added to the list after a
 * row was synced (e.g. Dave's Hot Chicken) from slipping through as independent.
 */
function isIndependentBusiness(business: BusinessWithCategory): boolean {
  if (business.is_chain === true) return false;
  return !isChainBusiness({ name: business.name, tags: business.tags ?? undefined });
}

interface FilterTriggerProps extends Omit<React.ComponentProps<typeof Button>, 'aria-label' | 'children'> {
  active: boolean;
  ariaLabel?: string;
  children: ReactNode;
}

function FilterMenuTrigger({ active, ariaLabel, children, className, ...props }: FilterTriggerProps) {
  return (
    <Button
      {...props}
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background"
          : "border-border bg-card text-foreground hover:border-foreground/35 hover:bg-card",
        className
      )}
    >
      {children}
      <ChevronDown className="h-3.5 w-3.5 text-current opacity-60" aria-hidden="true" />
    </Button>
  );
}

function FilterMenuLabel({ children }: { children: ReactNode }) {
  return (
    <DropdownMenuLabel className="px-2 pb-1 pt-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </DropdownMenuLabel>
  );
}

/**
 * ============================================================================
 * UX DESIGN: Discover Page — Business Discovery Feed
 * ============================================================================
 *
 * USER JOURNEY:
 *   1. User lands on Discover -> sees location context + compact filters
 *   2. Location resolves (GPS or zip) → businesses load in a responsive card grid
 *   3. User filters by category buttons or searches by keyword
 *   4. User sorts results by distance, rating, review count, or name
 *   5. User clicks a card → navigates to /business/[id] detail page
 *   6. User bookmarks directly from the card via heart icon — signed-in users
 *      sync to their account; guests save on this device (localStorage) with
 *      a toast nudging them to sign in to sync across devices
 *
 * DESIGN RATIONALE:
 *   - Category filter pills use toggle (aria-pressed) for clear active state.
 *   - Sort dropdown defaults to "Highest Rated" to showcase the best businesses first.
 *   - Directory-style cards prioritize factual scan data over generated copy.
 *   - Skeleton loading grid (6 cards) matches final layout to prevent CLS.
 *
 * ACCESSIBILITY FEATURES:
 *   - role="search" on the search bar with aria-label
 *   - role="group" on category filters with aria-label + aria-pressed per button
 *   - aria-live="polite" on the results grid so screen readers announce updates
 *   - aria-busy="true" on loading skeleton for assistive tech
 *   - role="alert" on error states
 *   - All icon-only buttons have aria-label; decorative icons use aria-hidden
 * ============================================================================
 */

const BusinessCard = memo(function BusinessCard({
  business,
  userLocation,
  isHovered,
  onHoverChange,
}: {
  business: BusinessWithCategory;
  userLocation?: LatLng | null;
  isHovered?: boolean;
  onHoverChange?: (id: string | null) => void;
}) {
  const { data: isBookmarked } = useIsBookmarked(business.id);
  const toggleBookmark = useToggleBookmark();
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);

  const getPriceRange = (level: number | null) => {
    if (!level) return "";
    return "$".repeat(level);
  };

  const getDistance = () => {
    if (!userLocation || !business.latitude || !business.longitude) return null;
    const distance = calculateDistance(
      { lat: userLocation.lat, lng: userLocation.lng },
      { lat: business.latitude, lng: business.longitude }
    );
    return formatDistance(distance);
  };

  const distance = getDistance();
  const photoUrl = buildBusinessPhotoUrl(business.photos?.[0], {
    maxWidth: 400,
    maxHeight: 300,
  });
  const fallbackImageUrl = buildBusinessFallbackImageUrl({
    name: business.name,
    categoryName: business.category?.name,
  });
  const showPhoto = !!photoUrl && !photoLoadFailed;
  const reviewLabel = getBusinessReviewLabel({
    data_source: business.data_source,
    review_count: business.review_count,
  });
  const locationLine = [business.city, business.state].filter(Boolean).join(", ");
  const independent = isIndependentBusiness(business);
  const openNow = isOpenNow(business.hours) === true;

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const result = await toggleBookmark.mutateAsync({
        businessId: business.id,
        isBookmarked: isBookmarked || false,
      });
      if (result.local) {
        // Guest: saved in this browser only — be honest about the scope.
        toast.success(
          result.bookmarked ? "Saved on this device" : "Removed from this device",
          {
            description: "Sign in to sync bookmarks across devices.",
          }
        );
      } else {
        toast.success(isBookmarked ? "Bookmark removed" : "Business bookmarked", {
          description: isBookmarked
            ? "Removed from your saved businesses"
            : "Added to your saved businesses",
        });
      }
    } catch {
      toast.error("Error", {
        description: "Failed to update bookmark",
      });
    }
  };

  return (
    <article
      data-tour="business-card"
      onMouseEnter={() => onHoverChange?.(business.id)}
      onMouseLeave={() => onHoverChange?.(null)}
      className={cn(
        "group relative h-56 overflow-hidden rounded-2xl border bg-muted transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10",
        isHovered ? "border-primary/60 shadow-lg shadow-primary/15 -translate-y-0.5" : "border-border"
      )}
    >
      {/* Full-bleed image */}
      {showPhoto ? (
        <Image
          src={photoUrl}
          alt={business.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized
          onError={() => setPhotoLoadFailed(true)}
        />
      ) : (
        <Image
          src={fallbackImageUrl}
          alt={`${business.name} default cover`}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized
        />
      )}

      {/* Scrim: keeps overlaid text readable over any photo */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/0"
        aria-hidden="true"
      />

      {/* Top-left badges (visual only — clicks fall through to the card link) */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-wrap gap-1.5">
        {independent ? (
          <span className="rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-md">
            Independent
          </span>
        ) : (
          <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white/75 backdrop-blur-md">
            Chain
          </span>
        )}
        {business.sba_certified && (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-md">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            SBA
          </span>
        )}
      </div>

      {/* Bookmark (interactive — sits above the card link) */}
      <Button
        variant="secondary"
        size="icon-sm"
        className="absolute right-3 top-3 z-30 bg-black/35 text-white shadow-sm backdrop-blur-sm hover:bg-black/55"
        onClick={handleBookmark}
        disabled={toggleBookmark.isPending}
        aria-label={isBookmarked ? "Remove bookmark" : "Bookmark business"}
      >
        <Heart
          className={cn("h-4 w-4", isBookmarked ? "fill-white text-white" : "text-white")}
          aria-hidden="true"
        />
      </Button>

      {/* Clickable overlay with the business details anchored to the bottom */}
      <NavLink
        href={`/business/${business.id}`}
        className="absolute inset-0 z-10 flex flex-col justify-end p-4"
        aria-label={`View ${business.name}`}
      >
        <h3 className="truncate text-lg font-semibold tracking-tight text-white">
          {business.name}
        </h3>
        <p className="mt-0.5 truncate text-[13px] text-white/65">
          {business.category?.name ?? "Local business"}
          {locationLine ? ` · ${locationLine}` : ""}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/15 pt-2.5 text-sm text-white/90">
          <span className="inline-flex items-center gap-1 font-medium">
            <Star className="h-3.5 w-3.5 fill-white text-white" aria-hidden="true" />
            {business.average_rating || "New"}
          </span>
          <span className="text-white/60">{reviewLabel}</span>
          {business.price_range && (
            <span className="font-mono text-xs font-medium text-white/80">{getPriceRange(business.price_range)}</span>
          )}
          {openNow && (
            <span className="inline-flex items-center gap-1.5 font-medium text-white">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              Open now
            </span>
          )}
          {distance && (
            <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-white">
              <Navigation className="h-3 w-3" aria-hidden="true" />
              {distance}
            </span>
          )}
        </div>
      </NavLink>
    </article>
  );
});

function BusinessCardSkeleton() {
  return (
    <div className="relative h-64 overflow-hidden rounded-2xl border border-border bg-card">
      <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

interface DiscoverPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

/** Resolve a `?category=` value to a known filter id, or 'all'. */
function resolveCategoryParam(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return 'all'
  if (value === 'bookmarks') return value
  return CATEGORY_FILTERS.some((category) => category.id === value) ? value : 'all'
}

export default function DiscoverPage({ searchParams }: DiscoverPageProps) {
  // use() is safe to call conditionally; tests render without the prop.
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined
  const [selectedCategory, setSelectedCategory] = useState(() =>
    resolveCategoryParam(resolvedSearchParams?.category)
  )
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'review_count' | 'name'>('distance')
  const [searchQuery, setSearchQuery] = useState('')
  const [independentOnly, setIndependentOnly] = useState(false)
  const [openNowOnly, setOpenNowOnly] = useState(false)
  const [selectedPrices, setSelectedPrices] = useState<number[]>([])
  // 0 = no rating filter; otherwise the lower bound of a one-star band [N, N+1).
  const [ratingBand, setRatingBand] = useState(0)
  const [sbaOnly, setSbaOnly] = useState(false)
  const [radiusMiles, setRadiusMiles] = useState(DEFAULT_RADIUS_MILES)
  const [location, setLocation] = useState<LatLng | null>(null)
  const [locationSource, setLocationSource] = useState<'gps' | 'zip' | null>(null)
  const [locationLabel, setLocationLabel] = useState('')
  const [changeLocationOpen, setChangeLocationOpen] = useState(false)
  const [hoveredBusinessId, setHoveredBusinessId] = useState<string | null>(null)
  const [resultsPaneWidth, setResultsPaneWidth] = useState(RESULTS_PANE_DEFAULT_WIDTH)
  const [isResizingResults, setIsResizingResults] = useState(false)
  const splitPaneRef = useRef<HTMLDivElement>(null)
  const resizeDragCleanupRef = useRef<(() => void) | null>(null)

  // Get geolocation hook for permission handling
  const {
    location: gpsLocation,
    loading: locationLoading,
    error: locationError,
    requestLocation,
    permission,
  } = useLocation()

  // The API works in meters; the UI works in miles.
  const radiusMeters = Math.round(radiusMiles * MILES_TO_METERS)

  // Fetch businesses based on location
  const {
    data: businesses,
    isLoading: businessesLoading,
    isFetching: businessesFetching,
    error: businessesError,
    refetch,
    refreshNearbyBusinesses,
  } = useNearbyBusinesses(location, radiusMeters)
  const { data: bookmarkedIds } = useBookmarkedIds()

  // Try to get cached location on mount, fall back to Diamond Bar for demo
  useEffect(() => {
    const cached = getCachedLocation()
    const sourceInfo = getCachedLocationSource()
    if (cached) {
      setLocation(cached)
      if (sourceInfo) {
        setLocationSource(sourceInfo.source)
        setLocationLabel(sourceInfo.label)
      } else {
        setLocationSource('gps')
      }
    } else {
      setLocation(SAN_ANTONIO_DEFAULT)
      setLocationSource('zip')
      setLocationLabel('')
    }
  }, [])

  // Handle GPS location updates
  useEffect(() => {
    if (gpsLocation) {
      setLocation(gpsLocation)
      setLocationSource('gps')
      setLocationLabel('')
      cacheLocation(gpsLocation)
      cacheLocationSource('gps', '')
      setChangeLocationOpen(false)
    }
  }, [gpsLocation])

  // Handle location errors
  useEffect(() => {
    if (locationError) {
      toast.error('Location Error', {
        description: locationError,
      })
    }
  }, [locationError])

  // Handle a resolved city/zip selection from the autocomplete search box.
  const handleLocationSelect = useCallback(
    ({ location: coords, label }: { location: LatLng; label: string }) => {
      setLocation(coords)
      setLocationSource('zip')
      setLocationLabel(label)
      cacheLocation(coords)
      cacheLocationSource('zip', label)
      setChangeLocationOpen(false)
      toast.success('Location updated', {
        description: `Showing businesses near ${label}`,
      })
    },
    []
  )

  // Request GPS location
  const handleAllowLocation = useCallback(() => {
    requestLocation(true)
  }, [requestLocation])

  // Filter and sort businesses
  const processedBusinesses = useMemo(() => {
    if (!businesses) return []

    let filtered = [...businesses]

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.trim().replace(/[<>]/g, '').slice(0, 100).toLowerCase()
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          (b.description?.toLowerCase().includes(query) ?? false) ||
          (b.short_description?.toLowerCase().includes(query) ?? false) ||
          (b.tags as string[])?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Filter by category or bookmarks
    if (selectedCategory === "bookmarks") {
      const ids = bookmarkedIds || []
      filtered = filtered.filter(b => ids.includes(b.id))
    } else if (selectedCategory !== "all") {
      filtered = filtered.filter(b => b.category?.slug === selectedCategory);
    }

    // Independent only: definite is_chain wins, name-based classification as fallback
    if (independentOnly) {
      filtered = filtered.filter(isIndependentBusiness)
    }

    // Open now: only businesses we can positively determine are open right now.
    // Rows with unparseable/missing hours (null) are excluded while active.
    if (openNowOnly) {
      filtered = filtered.filter(b => isOpenNow(b.hours) === true)
    }

    // Price: multi-select — any selected level matches
    if (selectedPrices.length > 0) {
      filtered = filtered.filter(
        b => b.price_range !== null && selectedPrices.includes(b.price_range)
      )
    }

    // Rating: keep businesses in the selected one-star band [N, N+1).
    // e.g. 3 → 3.0–3.99; the top band (5) has no upper bound (5.0 and up).
    if (ratingBand > 0) {
      filtered = filtered.filter(b => {
        const rating = b.average_rating ?? 0
        return rating >= ratingBand && (ratingBand >= 5 || rating < ratingBand + 1)
      })
    }

    // SBA certified
    if (sbaOnly) {
      filtered = filtered.filter(b => b.sba_certified === true)
    }

    return filtered;
  }, [businesses, searchQuery, selectedCategory, bookmarkedIds, independentOnly, openNowOnly, selectedPrices, ratingBand, sbaOnly]);

  // Number of independents in the current result set (shown inline on the chip)
  const independentCount = useMemo(
    () => processedBusinesses.filter(isIndependentBusiness).length,
    [processedBusinesses]
  )

  // Only offer the SBA filter when it can actually do something
  const hasSbaBusinesses = useMemo(
    () => (businesses ?? []).some(b => b.sba_certified === true),
    [businesses]
  )

  const hasExtraFilters =
    independentOnly || openNowOnly || selectedPrices.length > 0 || ratingBand > 0 || sbaOnly

  const resetExtraFilters = useCallback(() => {
    setIndependentOnly(false)
    setOpenNowOnly(false)
    setSelectedPrices([])
    setRatingBand(0)
    setSbaOnly(false)
  }, [])

  // Started, incomplete missions whose category matches the current filter —
  // shown as a context banner so "Continue mission" lands somewhere useful.
  const { userId } = useAuth()
  const { activeMissions: startedMissions } = useMissionProgressDetails(userId ?? '')
  const missionsInView = useMemo(() => {
    if (selectedCategory === 'all' || selectedCategory === 'bookmarks') return []
    return (startedMissions ?? []).filter(
      (detail) => detail.progress.mission.category?.slug === selectedCategory
    )
  }, [startedMissions, selectedCategory])

  // Select a category and keep ?category= in the URL so the view is
  // shareable and deep-linkable (categories page and missions link here).
  const selectCategory = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (categoryId === 'all') url.searchParams.delete('category')
      else url.searchParams.set('category', categoryId)
      window.history.replaceState(window.history.state, '', url)
    }
  }, [])

  const clearAllFilters = useCallback(() => {
    resetExtraFilters()
    setSearchQuery('')
    selectCategory('all')
  }, [resetExtraFilters, selectCategory])

  const clampResultsPaneWidth = useCallback((nextWidth: number) => {
    const containerWidth = splitPaneRef.current?.getBoundingClientRect().width ?? 0
    const maxFromContainer = containerWidth > 0
      ? Math.max(RESULTS_PANE_MIN_WIDTH, containerWidth - MAP_PANE_MIN_WIDTH)
      : RESULTS_PANE_MAX_WIDTH
    const maxWidth = Math.min(RESULTS_PANE_MAX_WIDTH, maxFromContainer)

    return Math.min(Math.max(nextWidth, RESULTS_PANE_MIN_WIDTH), maxWidth)
  }, [])

  const resizeResultsPane = useCallback((clientX: number) => {
    const splitRect = splitPaneRef.current?.getBoundingClientRect()
    if (!splitRect) return

    setResultsPaneWidth(clampResultsPaneWidth(clientX - splitRect.left))
  }, [clampResultsPaneWidth])

  const stopResultsResizeDrag = useCallback(() => {
    resizeDragCleanupRef.current?.()
    resizeDragCleanupRef.current = null
    setIsResizingResults(false)
  }, [])

  const startResultsResizeDrag = useCallback((clientX: number) => {
    resizeDragCleanupRef.current?.()

    const handlePointerMove = (event: PointerEvent) => {
      resizeResultsPane(event.clientX)
    }
    const handleMouseMove = (event: MouseEvent) => {
      resizeResultsPane(event.clientX)
    }
    const handleEnd = () => {
      stopResultsResizeDrag()
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handleEnd)
    window.addEventListener('pointercancel', handleEnd)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleEnd)

    resizeDragCleanupRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handleEnd)
      window.removeEventListener('pointercancel', handleEnd)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleEnd)
    }

    setIsResizingResults(true)
    resizeResultsPane(clientX)
  }, [resizeResultsPane, stopResultsResizeDrag])

  const handleResultsResizePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    startResultsResizeDrag(event.clientX)
  }, [startResultsResizeDrag])

  const handleResultsResizeMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return

    event.preventDefault()
    startResultsResizeDrag(event.clientX)
  }, [startResultsResizeDrag])

  const handleResultsResizePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isResizingResults) return
    resizeResultsPane(event.clientX)
  }, [isResizingResults, resizeResultsPane])

  const stopResultsResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    stopResultsResizeDrag()
  }, [stopResultsResizeDrag])

  const handleResultsResizeKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? RESULTS_PANE_KEYBOARD_STEP * 2 : RESULTS_PANE_KEYBOARD_STEP

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setResultsPaneWidth((width) => clampResultsPaneWidth(width - step))
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setResultsPaneWidth((width) => clampResultsPaneWidth(width + step))
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      setResultsPaneWidth(clampResultsPaneWidth(RESULTS_PANE_MIN_WIDTH))
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      setResultsPaneWidth(clampResultsPaneWidth(RESULTS_PANE_MAX_WIDTH))
    }
  }, [clampResultsPaneWidth])

  useEffect(() => () => {
    resizeDragCleanupRef.current?.()
    resizeDragCleanupRef.current = null
  }, [])

  const togglePrice = useCallback((level: number) => {
    setSelectedPrices((prev) =>
      prev.includes(level) ? prev.filter((p) => p !== level) : [...prev, level]
    )
  }, [])

  // INPUT VALIDATION: Sanitize search query — strip angle brackets and cap length
  // to prevent XSS in reflected output and limit payload size (syntactical).
  // Semantic: query must be at least 1 visible character after trimming to trigger a search.
  const sanitizedSearch = searchQuery.trim().replace(/[<>]/g, '').slice(0, 100)

  // Sort businesses by the user-selected criterion.
  // DESIGN RATIONALE: Sort is applied client-side after filtering so the user
  // sees instant reordering without an extra network round-trip.
  const sortedBusinesses = useMemo(() => [...processedBusinesses].sort((a, b) => {
    switch (sortBy) {
      case 'rating': {
        // Businesses with real photos and good reviews surface first for best presentation.
        const photoA = Array.isArray(a.photos) ? a.photos[0] : null
        const photoB = Array.isArray(b.photos) ? b.photos[0] : null
        const hasRealPhotoA = typeof photoA === 'string' && photoA.startsWith('http') ? 1 : 0
        const hasRealPhotoB = typeof photoB === 'string' && photoB.startsWith('http') ? 1 : 0
        if (hasRealPhotoA !== hasRealPhotoB) return hasRealPhotoB - hasRealPhotoA
        // Among businesses with equal photo status, rank by rating weighted by review volume
        const scoreA = (a.average_rating || 0) * Math.log10(Math.max(a.review_count || 1, 1))
        const scoreB = (b.average_rating || 0) * Math.log10(Math.max(b.review_count || 1, 1))
        return scoreB - scoreA
      }
      case 'review_count':
        // Most reviewed first; ties broken by rating so quality still surfaces
        return (b.review_count || 0) - (a.review_count || 0)
          || (b.average_rating || 0) - (a.average_rating || 0)
      case 'name':
        return a.name.localeCompare(b.name)
      case 'distance':
      default:
        // Distance sort: nearest first; businesses without coords sink to bottom
        if (location) {
          const distA = a.latitude && a.longitude
            ? calculateDistance(
                { lat: location.lat, lng: location.lng },
                { lat: a.latitude, lng: a.longitude }
              )
            : Infinity
          const distB = b.latitude && b.longitude
            ? calculateDistance(
                { lat: location.lat, lng: location.lng },
                { lat: b.latitude, lng: b.longitude }
              )
            : Infinity
          return distA - distB
        }
        return 0
    }
  }), [processedBusinesses, sortBy, location]);
  const averageVisibleRating =
    sortedBusinesses.length > 0
      ? (
          sortedBusinesses.reduce((total, business) => {
            if (!business.average_rating) return total;
            return total + business.average_rating;
          }, 0) / sortedBusinesses.length
        ).toFixed(1)
      : "0.0";

  const handlePinClick = useCallback((id: string) => {
    setHoveredBusinessId(id)
    const el = document.querySelector(`[data-business-id="${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    setTimeout(() => setHoveredBusinessId(null), 1500)
  }, [])

  // Refresh re-pulls the current area and gives clear feedback (the icon spins
  // while fetching, then a toast confirms the count) so the action never feels
  // like a no-op even when the results are unchanged.
  const handleRefresh = useCallback(async () => {
    try {
      const result = await refreshNearbyBusinesses()
      const count = result.length
      toast.success('Map refreshed', {
        description: `${count} ${count === 1 ? 'place' : 'places'} nearby`,
      })
    } catch {
      toast.error('Could not refresh map', {
        description: 'Try again in a moment.',
      })
    }
  }, [refreshNearbyBusinesses])

  const isLoading = locationLoading || businessesLoading
  const hasLocation = !!location
  const showLocationPrompt = !hasLocation && !locationLoading
  const resultCountLabel = isLoading
    ? 'Finding places'
    : `${sortedBusinesses.length} ${sortedBusinesses.length === 1 ? 'place' : 'places'}`
  const locationControlLabel =
    locationSource === 'gps' ? 'Current location' : locationLabel || 'San Antonio'
  const categoryLabel =
    selectedCategory === 'bookmarks'
      ? 'Bookmarks'
      : CATEGORY_FILTERS.find((category) => category.id === selectedCategory)?.name ?? 'All'
  const selectedPriceLabels = [...selectedPrices]
    .sort((a, b) => a - b)
    .map((level) => '$'.repeat(level))
  const priceFilterLabel =
    selectedPriceLabels.length > 0 ? selectedPriceLabels.join(', ') : 'Price'
  const priceFilterAriaLabel =
    selectedPriceLabels.length > 0
      ? `Price filter: ${selectedPriceLabels.join(', ')}`
      : 'Price filter'
  const starsFilterLabel =
    ratingBand > 0
      ? ratingBand >= 5
        ? '5 stars'
        : `${ratingBand}-${ratingBand + 1} stars`
      : 'Stars'
  const starsFilterAriaLabel =
    ratingBand > 0 ? `Stars filter: ${starsFilterLabel}` : 'Stars filter'
  const activeExtraFilterCount =
    Number(independentOnly) + Number(openNowOnly) + Number(sbaOnly)
  const extraFilterAriaLabel =
    activeExtraFilterCount > 0
      ? `More filters: ${activeExtraFilterCount} active`
      : 'More filters'
  const extraFilterButtonLabel =
    activeExtraFilterCount > 0 ? `Filters (${activeExtraFilterCount})` : 'Filters'

  // Memoized so the reference is stable across re-renders (e.g. on hover). A
  // fresh array each render would make the map re-fit and zoom out every time
  // the user hovers a pin or card.
  const mapCenter = useMemo<[number, number]>(
    () => (location ? [location.lat, location.lng] : [SAN_ANTONIO_DEFAULT.lat, SAN_ANTONIO_DEFAULT.lng]),
    [location],
  )
  const splitPaneStyle = {
    '--discover-results-width': `${resultsPaneWidth}px`,
  } as CSSProperties
  const resultsGridClass =
    "grid grid-cols-[repeat(auto-fit,minmax(min(17rem,100%),1fr))] gap-3"

  // Compact full-width top bar: title + live stats, then search/sort, then the
  // category and refine filters, with location + radius pushed to the right.
  const filterPanel = (
    <div className="space-y-3 px-4 pb-3 pt-1.5" data-testid="discover-toolbar">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2" role="group" aria-label="Discover summary">
        <h1 id="discover-heading" className="shrink-0 text-lg font-semibold tracking-tight">
          Discover places <span className="gradient-text">nearby</span>
        </h1>
        <div className="flex shrink-0 divide-x divide-border overflow-hidden rounded-lg border border-border bg-card text-xs shadow-sm">
          <div className="px-2.5 py-1">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Found</p>
            <p className="font-semibold tabular-nums">{resultCountLabel}</p>
          </div>
          <div className="px-2.5 py-1">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Avg ★</p>
            <p className="font-semibold tabular-nums text-muted-foreground">{averageVisibleRating}</p>
          </div>
          <div className="px-2.5 py-1">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Radius</p>
            <p className="font-semibold tabular-nums text-muted-foreground">{radiusMiles} mi</p>
          </div>
        </div>
      </div>

      {hasLocation && (
        <div className="flex min-w-0 flex-wrap items-center gap-2" role="group" aria-label="Search and sort controls">
          <div role="search" aria-label="Search businesses" className="relative min-w-0 flex-[1_1_18rem]" data-tour="discover-search">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Name, food, or service"
              className="h-9 rounded-full border-border bg-card pl-10 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search businesses"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-9 w-32 shrink-0 rounded-full border-border bg-card shadow-sm" aria-label="Sort by">
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance">Nearest</SelectItem>
              <SelectItem value="rating">Top rated</SelectItem>
              <SelectItem value="review_count">Most reviewed</SelectItem>
              <SelectItem value="name">A-Z</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full border-border bg-card shadow-sm"
            onClick={handleRefresh}
            disabled={businessesFetching}
            aria-label="Refresh results"
          >
            <RefreshCw className={cn("h-4 w-4", businessesFetching && "animate-spin")} aria-hidden="true" />
          </Button>
        </div>
      )}

      {showLocationPrompt && (
        <div className="mt-3">
          <LocationPrompt
            onAllowLocation={handleAllowLocation}
            onSelectLocation={handleLocationSelect}
            permission={permission}
            isLoading={locationLoading}
          />
        </div>
      )}

      {hasLocation && (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category" data-tour="discover-categories">
            {CATEGORY_FILTERS.map((category) => (
              <Button key={category.id} variant="ghost" size="sm"
                onClick={() => selectCategory(category.id)}
                aria-pressed={selectedCategory === category.id}
                className={cn(
                  "h-7 rounded-full border border-transparent px-3 text-xs text-muted-foreground transition-colors",
                  selectedCategory === category.id
                    ? "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background"
                    : "hover:border-border hover:text-foreground"
                )}
              >{category.name}</Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => selectCategory('bookmarks')}
              aria-pressed={selectedCategory === 'bookmarks'}
              className={cn(
                "h-7 rounded-full border border-transparent px-3 text-xs text-muted-foreground transition-colors",
                selectedCategory === 'bookmarks'
                  ? "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background"
                  : "hover:border-border hover:text-foreground"
              )}
            >
              <Heart className="h-3 w-3" aria-hidden="true" /> Bookmarks
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="More filters">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <FilterMenuTrigger active={selectedPrices.length > 0} ariaLabel={priceFilterAriaLabel}>
                    <span>{priceFilterLabel}</span>
                  </FilterMenuTrigger>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 rounded-xl p-2">
                  <FilterMenuLabel>Price</FilterMenuLabel>
                  {PRICE_LEVELS.map((level) => {
                    const label = '$'.repeat(level)
                    return (
                      <DropdownMenuCheckboxItem
                        key={level}
                        checked={selectedPrices.includes(level)}
                        onSelect={(event) => {
                          event.preventDefault()
                          togglePrice(level)
                        }}
                        className="rounded-md"
                      >
                        <span className="font-mono text-sm">{label}</span>
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <FilterMenuTrigger active={ratingBand > 0} ariaLabel={starsFilterAriaLabel}>
                    <Star className={cn("h-3.5 w-3.5", ratingBand > 0 && "fill-current")} aria-hidden="true" />
                    <span>{starsFilterLabel}</span>
                  </FilterMenuTrigger>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 rounded-xl p-2">
                  <FilterMenuLabel>Stars</FilterMenuLabel>
                  {RATING_LEVELS.map((level) => (
                    <DropdownMenuCheckboxItem
                      key={level}
                      checked={ratingBand === level}
                      onSelect={(event) => {
                        event.preventDefault()
                        setRatingBand((value) => (value === level ? 0 : level))
                      }}
                      className="rounded-md"
                    >
                      <Star className={cn("h-3.5 w-3.5", ratingBand === level && "fill-primary text-primary")} aria-hidden="true" />
                      <span>{level >= 5 ? '5 stars' : `${level} to ${level + 1} stars`}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <FilterMenuTrigger active={activeExtraFilterCount > 0} ariaLabel={extraFilterAriaLabel}>
                    <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{extraFilterButtonLabel}</span>
                  </FilterMenuTrigger>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 rounded-xl p-2">
                  <FilterMenuLabel>Filters</FilterMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={independentOnly}
                    onSelect={(event) => {
                      event.preventDefault()
                      setIndependentOnly((value) => !value)
                    }}
                    className="rounded-md"
                  >
                    <Store className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Independent</span>
                    {independentOnly && (
                      <span className="ml-auto font-mono text-xs text-muted-foreground">{independentCount}</span>
                    )}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={openNowOnly}
                    onSelect={(event) => {
                      event.preventDefault()
                      setOpenNowOnly((value) => !value)
                    }}
                    className="rounded-md"
                  >
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Open now</span>
                  </DropdownMenuCheckboxItem>
                  {hasSbaBusinesses && (
                    <DropdownMenuCheckboxItem
                      checked={sbaOnly}
                      onSelect={(event) => {
                        event.preventDefault()
                        setSbaOnly((value) => !value)
                      }}
                      className="rounded-md"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>SBA certified</span>
                    </DropdownMenuCheckboxItem>
                  )}
                  {activeExtraFilterCount > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <p className="px-2 py-1 text-xs text-muted-foreground">
                        {activeExtraFilterCount} {activeExtraFilterCount === 1 ? 'filter' : 'filters'} active
                      </p>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {hasExtraFilters && (
                <Button variant="ghost" size="xs" onClick={resetExtraFilters} className="text-muted-foreground hover:text-foreground">Reset</Button>
              )}
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 text-sm">
              <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Location</span>
              <span className="truncate font-medium">{locationControlLabel}</span>
              <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-foreground" onClick={() => setChangeLocationOpen(true)}>Change</Button>
              <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Within</span>
              <Select value={radiusMiles.toString()} onValueChange={(v) => setRadiusMiles(Number(v))}>
                <SelectTrigger className="h-8 w-[5.5rem] rounded-full" aria-label="Search radius">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Active-mission context banner, shown above the results list.
  const missionsBanner = missionsInView.length > 0 ? (
    <section aria-label="Active missions" className="space-y-2 px-4 pt-4">
      {missionsInView.map((detail) => (
        <div key={detail.progress.id} className="relative flex flex-col gap-2 overflow-hidden rounded-xl border border-primary/25 bg-primary/5 p-4 pl-5 sm:flex-row sm:items-center sm:gap-4">
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-chart-2" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Mission: {detail.progress.mission.title}</p>
            <p className="text-xs text-muted-foreground">Check in with your receipt to log a verified visit.</p>
          </div>
          <div className="w-full sm:w-40">
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Progress</span>
              <span className="font-mono font-medium tabular-nums">{detail.progress.current_count}/{detail.progress.mission.target_count}</span>
            </div>
            <Progress value={detail.percentageComplete} className="h-1.5" />
          </div>
        </div>
      ))}
    </section>
  ) : null

  const resultsList = hasLocation ? (
    <section aria-label="Business results" aria-live="polite" aria-atomic="false" className="px-4 pb-6 pt-4">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.18em]">Results</h2>
        <span className="h-px flex-1 self-center bg-border" aria-hidden="true" />
        <p className="text-xs text-muted-foreground">{sanitizedSearch ? `"${sanitizedSearch}"` : categoryLabel}</p>
      </div>
      {isLoading ? (
        <div className={resultsGridClass} aria-busy="true" data-testid="discover-results-grid">
          {Array.from({ length: 5 }).map((_, i) => <BusinessCardSkeleton key={i} />)}
        </div>
      ) : businessesError ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center" role="alert">
          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-base font-semibold">Could not load places</h3>
          <p className="mt-2 text-sm text-muted-foreground">{businessesError.message}</p>
          <Button className="mt-4" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : sortedBusinesses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
          <Search className="mx-auto mb-3 h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-base font-semibold">No places found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasExtraFilters ? 'No places match the current filters.' : searchQuery ? 'Try another keyword.' : 'Try a larger radius or different category.'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {(hasExtraFilters || !!sanitizedSearch || selectedCategory !== 'all') && <Button variant="outline" onClick={clearAllFilters}>Clear filters</Button>}
            {!searchQuery && radiusMiles < MAX_RADIUS_MILES && <Button onClick={() => setRadiusMiles(MAX_RADIUS_MILES)}>{`Widen to ${MAX_RADIUS_MILES} mi`}</Button>}
          </div>
        </div>
      ) : (
        <div className={resultsGridClass} data-testid="discover-results-grid">
          {sortedBusinesses.map((business) => (
            <div key={business.id} data-business-id={business.id}>
              <BusinessCard
                business={business}
                userLocation={location}
                isHovered={hoveredBusinessId === business.id}
                onHoverChange={setHoveredBusinessId}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  ) : null

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Header />

      {/* Search/filters on top, then list on the left and map on the right.
          pt clears the floating header (~86px) and leaves a comfortable gap. */}
      <div className="flex flex-1 flex-col overflow-hidden pt-28">
        {/* TOP — full-width search + filter bar */}
        <div className="shrink-0 border-b border-border bg-background/95 backdrop-blur">
          {filterPanel}
        </div>

        {/* BELOW — list (left) + resizable divider + map (right) */}
        <div
          ref={splitPaneRef}
          className={cn(
            "flex flex-1 flex-col overflow-hidden md:flex-row",
            isResizingResults && "select-none"
          )}
          style={splitPaneStyle}
        >
          {/* LEFT — results list (scrolls) */}
          <div className="flex h-[45vh] shrink-0 flex-col overflow-y-auto border-b border-border bg-background md:h-auto md:w-[var(--discover-results-width)] md:min-w-[360px] md:border-b-0">
            {missionsBanner}
            {resultsList}
          </div>

          <div
            role="separator"
            aria-label="Resize results and map panes"
            aria-orientation="vertical"
            aria-valuemin={RESULTS_PANE_MIN_WIDTH}
            aria-valuemax={RESULTS_PANE_MAX_WIDTH}
            aria-valuenow={Math.round(resultsPaneWidth)}
            tabIndex={0}
            className={cn(
              "group hidden w-3 shrink-0 cursor-col-resize items-stretch justify-center border-x border-border/70 bg-background outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring md:flex",
              isResizingResults && "bg-muted"
            )}
            onPointerDown={handleResultsResizePointerDown}
            onMouseDown={handleResultsResizeMouseDown}
            onPointerMove={handleResultsResizePointerMove}
            onPointerUp={stopResultsResize}
            onPointerCancel={stopResultsResize}
            onKeyDown={handleResultsResizeKeyDown}
          >
            <span
              className={cn(
                "my-4 w-px rounded-full bg-border transition-colors group-hover:bg-primary/70",
                isResizingResults && "bg-primary"
              )}
            />
          </div>

          {/* RIGHT — map */}
          <div className="relative min-w-0 flex-1">
            <DiscoverMap
              businesses={sortedBusinesses}
              hoveredId={hoveredBusinessId}
              center={mapCenter}
              onPinClick={handlePinClick}
              onPinHover={setHoveredBusinessId}
            />
          </div>
        </div>
      </div>

      <ChangeLocationDialog
        open={changeLocationOpen}
        onOpenChange={setChangeLocationOpen}
        onSelectLocation={handleLocationSelect}
        onUseGps={handleAllowLocation}
        gpsDisabled={permission === 'denied' || locationLoading}
      />
    </div>
  )
}
