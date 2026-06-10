'use client'

import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { AlertCircle, Clock, Heart, MapPin, Minus, Navigation, Plus, RefreshCw, Search, ShieldCheck, Star, Store } from "lucide-react";
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
import { CATEGORY_FILTERS } from '@/lib/constants/navigation'
// BusinessCard and BusinessCardSkeleton are defined locally below
import { LocationPrompt } from '@/components/features/discover/LocationPrompt'
import { useNearbyBusinesses } from '@/hooks/useBusinesses'
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
import { getCachedLocation, geocodeZipCode, cacheLocation, cacheLocationSource, getCachedLocationSource } from "@/lib/location";
import { isOpenNow } from "@/lib/business/hours";
import { isChainBusiness } from "@/lib/business/classify";
import { ChangeLocationDialog } from "@/components/features/discover/ChangeLocationDialog";
import { cn } from "@/lib/utils";
import type { BusinessWithCategory } from "@/types/business";
import type { LatLng } from "@/types/business";

const RADIUS_OPTIONS = [
  { value: 10000, label: '10 km' },
  { value: 15000, label: '15 km' },
  { value: 20000, label: '20 km' },
  { value: 25000, label: '25 km' },
]

// Default location: Diamond Bar, CA
const DIAMOND_BAR_DEFAULT: LatLng = { lat: 34.0286, lng: -117.8208 };

const PRICE_LEVELS = [1, 2, 3, 4] as const;

/**
 * Independent vs. chain: prefer the server-populated `is_chain` flag when it
 * is a definite boolean; fall back to name-based classification when null or
 * undefined (older rows that have not been backfilled yet).
 */
function isIndependentBusiness(business: BusinessWithCategory): boolean {
  if (business.is_chain === true) return false;
  if (business.is_chain === false) return true;
  return !isChainBusiness({ name: business.name, tags: business.tags ?? undefined });
}

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  ariaLabel?: string;
  children: ReactNode;
}

function FilterChip({ active, onClick, ariaLabel, children }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
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

function BusinessCard({
  business,
  userLocation,
}: {
  business: BusinessWithCategory;
  userLocation?: LatLng | null;
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
    <article className="group relative h-64 overflow-hidden rounded-lg border border-border bg-muted transition-all hover:border-primary/40 hover:shadow-md">
      {/* Full-bleed image */}
      {showPhoto ? (
        <Image
          src={photoUrl}
          alt={business.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized
          onError={() => setPhotoLoadFailed(true)}
        />
      ) : (
        <Image
          src={fallbackImageUrl}
          alt={`${business.name} default cover`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
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
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            Independent
          </span>
        ) : (
          <span className="rounded-full bg-black/30 px-2 py-0.5 text-xs font-medium text-white/90 backdrop-blur-sm">
            Chain
          </span>
        )}
        {business.sba_certified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
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
        <p className="mt-0.5 truncate text-sm text-white/70">
          {business.category?.name ?? "Local business"}
          {locationLine ? ` · ${locationLine}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/90">
          <span className="inline-flex items-center gap-1 font-medium">
            <Star className="h-3.5 w-3.5 fill-white text-white" aria-hidden="true" />
            {business.average_rating || "New"}
          </span>
          <span className="text-white/60">{reviewLabel}</span>
          {business.price_range && (
            <span className="font-medium text-white/80">{getPriceRange(business.price_range)}</span>
          )}
          {openNow && (
            <span className="inline-flex items-center gap-1 font-medium text-white">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Open now
            </span>
          )}
          {distance && (
            <span className="inline-flex items-center gap-1 font-medium text-white">
              <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
              {distance}
            </span>
          )}
        </div>
      </NavLink>
    </article>
  );
}

function BusinessCardSkeleton() {
  return (
    <div className="relative h-64 overflow-hidden rounded-lg border border-border bg-card">
      <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'review_count' | 'name'>('rating')
  const [searchQuery, setSearchQuery] = useState('')
  const [independentOnly, setIndependentOnly] = useState(false)
  const [openNowOnly, setOpenNowOnly] = useState(false)
  const [selectedPrices, setSelectedPrices] = useState<number[]>([])
  const [highRatedOnly, setHighRatedOnly] = useState(false)
  const [sbaOnly, setSbaOnly] = useState(false)
  const [radius, setRadius] = useState(10000)
  const [location, setLocation] = useState<LatLng | null>(null)
  const [locationSource, setLocationSource] = useState<'gps' | 'zip' | null>(null)
  const [isLoadingZip, setIsLoadingZip] = useState(false)
  const [locationLabel, setLocationLabel] = useState('')
  const [changeLocationOpen, setChangeLocationOpen] = useState(false)

  // Get geolocation hook for permission handling
  const {
    location: gpsLocation,
    loading: locationLoading,
    error: locationError,
    requestLocation,
    permission,
  } = useLocation()

  // Fetch businesses based on location
  const {
    data: businesses,
    isLoading: businessesLoading,
    error: businessesError,
    refetch,
  } = useNearbyBusinesses(location, radius)
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
      setLocation(DIAMOND_BAR_DEFAULT)
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

  // Demo default: never allow below 10 km.
  useEffect(() => {
    setRadius((currentRadius) => Math.max(10000, currentRadius))
  }, [])

  // Handle location errors
  useEffect(() => {
    if (locationError) {
      toast.error('Location Error', {
        description: locationError,
      })
    }
  }, [locationError])

  // Handle zip code search
  const handleZipSearch = useCallback(async (zipCode: string) => {
    setIsLoadingZip(true)
    try {
      const coords = await geocodeZipCode(zipCode)
      if (coords) {
        setLocation(coords)
        setLocationSource('zip')
        setLocationLabel(zipCode)
        cacheLocation(coords)
        cacheLocationSource('zip', zipCode)
        setChangeLocationOpen(false)
        toast.success('Location updated', {
          description: `Showing businesses near ${zipCode}`,
        })
      } else {
        toast.error('Invalid zip code', {
          description: 'Could not find location for that zip code.',
        })
      }
    } catch {
      toast.error('Error', {
        description: 'Failed to search zip code. Please try again.',
      })
    } finally {
      setIsLoadingZip(false)
    }
  }, [])

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

    // Rating: 4.0 and up
    if (highRatedOnly) {
      filtered = filtered.filter(b => (b.average_rating ?? 0) >= 4)
    }

    // SBA certified
    if (sbaOnly) {
      filtered = filtered.filter(b => b.sba_certified === true)
    }

    return filtered;
  }, [businesses, searchQuery, selectedCategory, bookmarkedIds, independentOnly, openNowOnly, selectedPrices, highRatedOnly, sbaOnly]);

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
    independentOnly || openNowOnly || selectedPrices.length > 0 || highRatedOnly || sbaOnly

  const resetExtraFilters = useCallback(() => {
    setIndependentOnly(false)
    setOpenNowOnly(false)
    setSelectedPrices([])
    setHighRatedOnly(false)
    setSbaOnly(false)
  }, [])

  const clearAllFilters = useCallback(() => {
    resetExtraFilters()
    setSearchQuery('')
    setSelectedCategory('all')
  }, [resetExtraFilters])

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

  const isLoading = locationLoading || businessesLoading || isLoadingZip
  const hasLocation = !!location
  const showLocationPrompt = !hasLocation && !locationLoading
  const resultCountLabel = isLoading
    ? 'Finding places'
    : `${sortedBusinesses.length} ${sortedBusinesses.length === 1 ? 'place' : 'places'}`
  const ratingSummaryLabel = isLoading ? 'Avg -' : `Avg ${averageVisibleRating}`
  const locationSummary =
    locationSource === 'gps'
      ? 'Current location'
      : locationLabel
        ? `Near ${locationLabel}`
        : 'Near Diamond Bar'
  const locationControlLabel =
    locationSource === 'gps' ? 'Current location' : locationLabel || 'Diamond Bar'
  const categoryLabel =
    selectedCategory === 'bookmarks'
      ? 'Bookmarks'
      : CATEGORY_FILTERS.find((category) => category.id === selectedCategory)?.name ?? 'All'

  return (
    <div className="min-h-screen">
      <Header />

      <main className="px-4 pb-12 pt-24 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <section aria-labelledby="discover-heading">
            <AnimatedSection animation="rise-up" className="flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="mb-2 text-sm font-medium text-primary">{locationSummary}</p>
                <h1 id="discover-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Discover places nearby
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                  Search local spots, compare the basics, and save what looks good.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-md border border-border bg-card px-3 py-2 font-medium">
                  {resultCountLabel}
                </span>
                <span className="rounded-md border border-border bg-card px-3 py-2 text-muted-foreground">
                  {ratingSummaryLabel}
                </span>
                <span className="rounded-md border border-border bg-card px-3 py-2 text-muted-foreground">
                  {radius / 1000} km
                </span>
              </div>
            </AnimatedSection>
          </section>

          {/* Location Prompt */}
          {showLocationPrompt && (
            <LocationPrompt
              onAllowLocation={handleAllowLocation}
              onSearchZip={handleZipSearch}
              permission={permission}
              isLoading={locationLoading}
            />
          )}

          {/* Search and Filters */}
          {hasLocation && (
            <AnimatedSection animation="rise-up" delay={0.08}>
            <section
              aria-label="Search and filters"
              className="rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4"
            >
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div role="search" aria-label="Search businesses" className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      placeholder="Search by name, food, or service"
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search businesses"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                      <SelectTrigger className="min-w-36 flex-1 sm:w-[152px]" aria-label="Sort businesses by">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="distance">Nearest</SelectItem>
                        <SelectItem value="rating">Top rated</SelectItem>
                        <SelectItem value="review_count">Most reviewed</SelectItem>
                        <SelectItem value="name">A-Z</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Refresh business results">
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
                  {CATEGORY_FILTERS.map((category) => (
                    <Button
                      key={category.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                      aria-pressed={selectedCategory === category.id}
                      aria-label={`Filter by ${category.name}`}
                      className={cn(
                        "h-8 rounded-md border border-transparent px-3 text-muted-foreground",
                        selectedCategory === category.id && "border-border bg-secondary text-foreground"
                      )}
                    >
                      {category.name}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategory('bookmarks')}
                    aria-pressed={selectedCategory === 'bookmarks'}
                    aria-label="Show bookmarked businesses"
                    className={cn(
                      "h-8 rounded-md border border-transparent px-3 text-muted-foreground",
                      selectedCategory === 'bookmarks' && "border-border bg-secondary text-foreground"
                    )}
                  >
                    <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                    Bookmarks
                  </Button>
                </div>

                <div
                  className="mt-2 flex flex-wrap items-center gap-1.5"
                  role="group"
                  aria-label="More filters"
                >
                  <FilterChip
                    active={independentOnly}
                    onClick={() => setIndependentOnly((v) => !v)}
                  >
                    <Store className="h-3.5 w-3.5" aria-hidden="true" />
                    {independentOnly ? `Independent (${independentCount})` : 'Independent'}
                  </FilterChip>
                  <FilterChip
                    active={openNowOnly}
                    onClick={() => setOpenNowOnly((v) => !v)}
                  >
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    Open now
                  </FilterChip>
                  {PRICE_LEVELS.map((level) => (
                    <FilterChip
                      key={level}
                      active={selectedPrices.includes(level)}
                      onClick={() => togglePrice(level)}
                      ariaLabel={`Price ${'$'.repeat(level)}`}
                    >
                      <span className="font-mono">{'$'.repeat(level)}</span>
                    </FilterChip>
                  ))}
                  <FilterChip
                    active={highRatedOnly}
                    onClick={() => setHighRatedOnly((v) => !v)}
                  >
                    <Star className="h-3.5 w-3.5" aria-hidden="true" />
                    4.0+
                  </FilterChip>
                  {hasSbaBusinesses && (
                    <FilterChip
                      active={sbaOnly}
                      onClick={() => setSbaOnly((v) => !v)}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      SBA certified
                    </FilterChip>
                  )}
                  {hasExtraFilters && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={resetExtraFilters}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Reset
                    </Button>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span>Location</span>
                    <span className="font-medium text-foreground">{locationControlLabel}</span>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setChangeLocationOpen(true)}
                      aria-label="Change location"
                    >
                      Change
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Radius</span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setRadius((r) => Math.max(10000, r - 5000))}
                      disabled={radius <= 10000}
                      aria-label="Decrease search radius"
                    >
                      <Minus className="h-3 w-3" aria-hidden="true" />
                    </Button>
                    <Select value={radius.toString()} onValueChange={(v) => setRadius(Number(v))}>
                      <SelectTrigger className="h-8 w-[96px]" aria-label="Search radius">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RADIUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value.toString()}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setRadius((r) => Math.min(25000, r + 5000))}
                      disabled={radius >= 25000}
                      aria-label="Increase search radius"
                    >
                      <Plus className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
            </section>
            </AnimatedSection>
          )}

          {/* Business Grid */}
          {hasLocation && (
            <section aria-label="Business results" aria-live="polite" aria-atomic="false">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-sm font-medium">Results</h2>
                  <p className="text-sm text-muted-foreground">
                    {sanitizedSearch ? `Matching "${sanitizedSearch}"` : categoryLabel}
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading businesses">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <BusinessCardSkeleton key={i} />
                  ))}
                </div>
              ) : businessesError ? (
                <div className="rounded-lg border border-border bg-card p-8 text-center" role="alert">
                  <AlertCircle className="mx-auto mb-3 h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  <h3 className="text-base font-semibold">Could not load places</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{businessesError.message}</p>
                  <Button className="mt-4" onClick={() => refetch()}>Try again</Button>
                </div>
              ) : sortedBusinesses.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-8 text-center">
                  <Search className="mx-auto mb-3 h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  <h3 className="text-base font-semibold">No places found</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    {hasExtraFilters
                      ? 'No places match the current filters.'
                      : searchQuery
                        ? 'Try another keyword.'
                        : `Try a larger radius or a different category.`}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    {(hasExtraFilters || !!sanitizedSearch || selectedCategory !== 'all') && (
                      <Button variant="outline" onClick={clearAllFilters}>
                        Clear filters
                      </Button>
                    )}
                    {!searchQuery && radius < 25000 && (
                      <Button onClick={() => setRadius(25000)}>Use 25 km</Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sortedBusinesses.map((business) => (
                    <AnimatedSection key={business.id} animation="rise-up">
                      <BusinessCard
                        business={business}
                        userLocation={location}
                      />
                    </AnimatedSection>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <ChangeLocationDialog
        open={changeLocationOpen}
        onOpenChange={setChangeLocationOpen}
        onSearchZip={handleZipSearch}
        onUseGps={handleAllowLocation}
        initialZip={locationSource === 'zip' ? locationLabel : undefined}
        gpsDisabled={permission === 'denied' || locationLoading}
      />
    </div>
  )
}
