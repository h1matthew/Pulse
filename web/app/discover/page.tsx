'use client'

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, SlidersHorizontal, MapPin, Star, Heart, Loader2, LocateFixed, Navigation, MapPinned, Clock, TrendingUp, Store, RefreshCw, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATEGORY_FILTERS } from '@/lib/constants/navigation'
import { AnimatedSection } from '@/components/features/home/AnimatedSection'
// BusinessCard and BusinessCardSkeleton are defined locally below
import { LocationPrompt } from '@/components/features/discover/LocationPrompt'
import { useNearbyBusinesses } from '@/hooks/useBusinesses'
import { useLocation, formatDistance, calculateDistance } from "@/hooks/useLocation";
import {
  useIsBookmarked,
  useToggleBookmark,
  useBookmarkedIds,
} from "@/hooks/useBookmarks";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import {
  buildBusinessFallbackImageUrl,
  buildBusinessPhotoUrl,
  buildBusinessSummary,
  getBusinessReviewLabel,
} from "@/lib/business/display";
import { NavLink } from "@/components/ui/nav-link";
import { getCachedLocation, geocodeZipCode, cacheLocation } from "@/lib/location";
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

/**
 * ============================================================================
 * UX DESIGN: Discover Page — Business Discovery Feed
 * ============================================================================
 *
 * USER JOURNEY:
 *   1. User lands on Discover → sees hero stats + location prompt (if no cached location)
 *   2. Location resolves (GPS or zip) → businesses load in a responsive card grid
 *   3. User filters by category buttons or searches by keyword
 *   4. User sorts results by distance, rating, review count, or name
 *   5. User clicks a card → navigates to /business/[id] detail page
 *   6. User bookmarks directly from the card via heart icon (auth required)
 *
 * DESIGN RATIONALE:
 *   - Category filter pills use toggle (aria-pressed) for clear active state
 *   - Sort dropdown defaults to "Highest Rated" to showcase the best businesses first
 *   - Skeleton loading grid (6 cards) matches final layout to prevent CLS
 *   - Frosted-glass hero card anchors the page and provides at-a-glance stats
 *   - Staggered fade-up animations add perceived polish without blocking interaction
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
  index,
  userLocation,
}: {
  business: BusinessWithCategory;
  index: number;
  userLocation?: LatLng | null;
}) {
  const { user } = useAuth();
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
  const summary = buildBusinessSummary({
    name: business.name,
    short_description: business.short_description,
    description: business.description,
    categoryName: business.category?.name,
    city: business.city,
    state: business.state,
    tags: business.tags,
  });

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Sign in required", {
        description: "Please sign in to bookmark businesses",
      });
      return;
    }

    try {
      await toggleBookmark.mutateAsync({
        businessId: business.id,
        isBookmarked: isBookmarked || false,
      });
      toast.success(isBookmarked ? "Bookmark removed" : "Business bookmarked", {
        description: isBookmarked
          ? "Removed from your saved businesses"
          : "Added to your saved businesses",
      });
    } catch {
      toast.error("Error", {
        description: "Failed to update bookmark",
      });
    }
  };

  return (
    <AnimatedSection animation="fade-up" delay={0.05 * (index % 6)}>
      <NavLink href={`/business/${business.id}`}>
        <Card className="h-full cursor-pointer group overflow-hidden border border-border/60 bg-card/90 backdrop-blur-sm shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-0">
            {/* Image / Hero */}
            <div className="relative h-48 overflow-hidden">
              {showPhoto ? (
                <>
                  <Image
                    src={photoUrl}
                    alt={business.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    unoptimized
                    onError={() => setPhotoLoadFailed(true)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                </>
              ) : (
                <>
                  <Image
                    src={fallbackImageUrl}
                    alt={`${business.name} default cover`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
                </>
              )}

              {/* Overlaid badges */}
              <div className="absolute top-3 left-3 flex gap-2">
                {business.is_featured && (
                  <Badge className="bg-chart-2 text-white border-0 shadow-lg text-xs font-semibold">
                    Featured
                  </Badge>
                )}
                {business.is_verified && (
                  <Badge className="bg-primary text-primary-foreground border-0 shadow-lg text-xs font-semibold">
                    Verified
                  </Badge>
                )}
              </div>

              {/* Bookmark button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white border-0 h-8 w-8"
                onClick={handleBookmark}
                disabled={toggleBookmark.isPending}
              >
                <Heart
                  className={`h-4 w-4 ${
                    isBookmarked ? "fill-red-400 text-red-400" : "text-white"
                  }`}
                />
              </Button>

              {/* Bottom overlay info (on photo cards) */}
              {showPhoto && (
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-bold text-lg text-white drop-shadow-md leading-tight">
                    {business.name}
                  </h3>
                  <p className="text-white/80 text-sm drop-shadow-md">
                    {business.category?.name}
                  </p>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Name + category (only when no photo) */}
              {!showPhoto && (
                <div className="mb-2">
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors leading-tight">
                    {business.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {business.category?.name}
                  </p>
                </div>
              )}

              {/* Rating row */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1 bg-chart-5/10 px-2 py-0.5 rounded-full">
                  <Star className="h-3.5 w-3.5 fill-chart-5 text-chart-5" />
                  <span className="font-semibold text-sm">{business.average_rating || "New"}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {reviewLabel}
                </span>
                {business.data_source === "google" && business.review_count > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">
                    Google
                  </Badge>
                )}
                {business.price_range && (
                  <>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {getPriceRange(business.price_range)}
                    </span>
                  </>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-foreground/80 line-clamp-2 mb-3 leading-relaxed">
                {summary}
              </p>

              {/* Location + distance */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{business.address}</span>
                </span>
                {distance && (
                  <span className="flex items-center gap-1 text-primary font-medium whitespace-nowrap">
                    <Navigation className="h-3 w-3" />
                    {distance}
                  </span>
                )}
              </div>

              {/* Tags */}
              {business.tags && business.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2 border-t border-border/50">
                  {business.tags.slice(0, 3).map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                  {business.tags.length > 3 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      +{business.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </NavLink>
    </AnimatedSection>
  );
}

function BusinessCardSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="p-0">
        <Skeleton className="h-40 w-full" />
        <div className="p-5 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DiscoverPage() {
  const [nearbyMode, setNearbyMode] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'review_count' | 'name'>('rating')
  const [searchQuery, setSearchQuery] = useState('')
  const [radius, setRadius] = useState(10000)
  const [location, setLocation] = useState<LatLng | null>(null)
  const [locationSource, setLocationSource] = useState<'gps' | 'zip' | null>(null)
  const [isLoadingZip, setIsLoadingZip] = useState(false)

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
    if (cached) {
      setLocation(cached)
      setLocationSource('gps')
    } else {
      setLocation(DIAMOND_BAR_DEFAULT)
      setLocationSource('zip')
    }
  }, [])

  // Handle GPS location updates
  useEffect(() => {
    if (gpsLocation) {
      setLocation(gpsLocation)
      setLocationSource('gps')
      cacheLocation(gpsLocation)
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
        toast.success('Location found', {
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

    return filtered;
  }, [businesses, searchQuery, selectedCategory, bookmarkedIds]);

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
  const featuredCount = sortedBusinesses.filter((business) => business.is_featured).length;
  const googleCount = sortedBusinesses.filter((business) => business.data_source === "google").length;

  const handleNearbyClick = async () => {
    if (!nearbyMode) {
      // Turning on nearby mode
      if (!location && permission !== 'denied') {
        toast.info("Requesting location...", {
          description: "Please allow location access to find businesses near you.",
        });
        requestLocation();
      }
      setNearbyMode(true);
    } else {
      // Turning off nearby mode
      setNearbyMode(false);
    }
  };

  const isLoading = locationLoading || businessesLoading || isLoadingZip
  const hasLocation = !!location
  const showLocationPrompt = !hasLocation && !locationLoading

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-primary/10 via-chart-2/5 to-transparent" />
      <div className="pointer-events-none absolute -top-20 right-4 h-72 w-72 rounded-full bg-chart-2/10 blur-3xl" />
      <div className="pointer-events-none absolute top-10 -left-16 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
      <Header />

      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-8">
        <div className="mx-auto max-w-6xl">
          <AnimatedSection animation="fade-up">
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/85 backdrop-blur-sm p-6 md:p-8 shadow-xl shadow-primary/5">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-chart-2/8" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {nearbyMode ? "Businesses Near You" : "Discover Local Businesses"}
                  </h1>
                  {nearbyMode && (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mb-6 text-lg">
                  {nearbyMode
                    ? "Live places pulled from Google around your current location."
                    : "Find standout neighborhood spots with real rating signals and community feedback."}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/50 bg-background/70 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      Businesses
                    </div>
                    <p className="text-2xl font-semibold mt-1">{sortedBusinesses.length}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/70 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      <Star className="h-3.5 w-3.5" />
                      Avg Rating
                    </div>
                    <p className="text-2xl font-semibold mt-1">{averageVisibleRating}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/70 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      {nearbyMode ? <Clock className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                      {nearbyMode ? "Google Sources" : "Featured Picks"}
                    </div>
                    <p className="text-2xl font-semibold mt-1">{nearbyMode ? googleCount : featuredCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Location Prompt */}
          {showLocationPrompt && (
            <AnimatedSection animation="fade-up" delay={0.1}>
              <div className="mb-8">
                <LocationPrompt
                  onAllowLocation={handleAllowLocation}
                  onSearchZip={handleZipSearch}
                  permission={permission}
                  isLoading={locationLoading}
                />
              </div>
            </AnimatedSection>
          )}

          {/* Search and Filters */}
          {hasLocation && (
            <AnimatedSection animation="fade-up" delay={0.1}>
              <div className="space-y-4 mb-6">
                {/* Main search row */}
                <div className="flex flex-col sm:flex-row gap-3" role="search" aria-label="Search businesses">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      placeholder="Search businesses by name, description, or tags..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search businesses"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                      <SelectTrigger className="w-[150px]" aria-label="Sort businesses by">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="distance">Nearest</SelectItem>
                        <SelectItem value="rating">Highest Rated</SelectItem>
                        <SelectItem value="review_count">Most Reviewed</SelectItem>
                        <SelectItem value="name">Name (A-Z)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Refresh business results">
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                {/* Category filters */}
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
                  {CATEGORY_FILTERS.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                      aria-pressed={selectedCategory === category.id}
                      aria-label={`Filter by ${category.name}`}
                      className={cn(
                        'gap-1.5',
                        selectedCategory === category.id && 'shadow-md'
                      )}
                    >
                      <span aria-hidden="true">{category.icon}</span>
                      {category.name}
                    </Button>
                  ))}
                  <Button
                    variant={selectedCategory === 'bookmarks' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('bookmarks')}
                    aria-pressed={selectedCategory === 'bookmarks'}
                    aria-label="Show bookmarked businesses"
                    className={cn(
                      'gap-1.5',
                      selectedCategory === 'bookmarks' && 'shadow-md'
                    )}
                  >
                    <span aria-hidden="true"><Heart className="h-3.5 w-3.5" /></span>
                    Bookmarks
                  </Button>
                </div>

                {/* Location info and radius */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>
                      {locationSource === 'gps'
                        ? 'Using your current location'
                        : 'Using zip code location'}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {processedBusinesses.length} businesses
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Radius:</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setRadius((r) => Math.max(10000, r - 5000))}
                        disabled={radius <= 10000}
                        aria-label="Decrease search radius"
                      >
                        <Minus className="h-3 w-3" aria-hidden="true" />
                      </Button>
                      <Select value={radius.toString()} onValueChange={(v) => setRadius(Number(v))}>
                        <SelectTrigger className="w-[100px] h-8" aria-label="Search radius">
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
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setRadius((r) => Math.min(25000, r + 5000))}
                        disabled={radius >= 25000}
                        aria-label="Increase search radius"
                      >
                        <Plus className="h-3 w-3" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          )}
        </div>
      </section>

      {/* Business Grid */}
      {hasLocation && (
        <section aria-label="Business results" className="relative px-6 pb-12">
          <div className="mx-auto max-w-6xl" aria-live="polite" aria-atomic="false">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading businesses">
                {Array.from({ length: 6 }).map((_, i) => (
                  <BusinessCardSkeleton key={i} />
                ))}
              </div>
            ) : businessesError ? (
              <div className="text-center py-16" role="alert">
                <div className="text-4xl mb-4" aria-hidden="true">⚠️</div>
                <h3 className="text-lg font-semibold mb-2">Error loading businesses</h3>
                <p className="text-muted-foreground mb-4">{businessesError.message}</p>
                <Button onClick={() => refetch()}>Try Again</Button>
              </div>
            ) : sortedBusinesses.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4" aria-hidden="true">🔍</div>
                <h3 className="text-lg font-semibold mb-2">No businesses found</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchQuery
                    ? 'No businesses match your search. Try different keywords.'
                    : `No businesses found within ${radius / 1000}km. Try expanding your search radius or selecting a different category.`}
                </p>
                {!searchQuery && radius < 25000 && (
                  <Button onClick={() => setRadius(25000)}>Expand to 25 km</Button>
                )}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedBusinesses.map((business, index) => (
                  <BusinessCard
                    key={business.id}
                    business={business}
                    index={index}
                    userLocation={location}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* How It Works Section — first-time visitor guide */}
      <section aria-label="How it works" className="relative px-6 py-16 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <AnimatedSection animation="fade-up">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold tracking-tight mb-2">How Pulse Works</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Discover, engage, and track your impact on the local economy in three easy steps.
              </p>
            </div>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-6">
            <AnimatedSection animation="fade-up" delay={0.1}>
              <Card className="h-full text-center card-lift">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-xs font-medium text-primary mb-1">Step 1</div>
                  <h3 className="text-lg font-semibold mb-2">Discover</h3>
                  <p className="text-sm text-muted-foreground">
                    Search for local businesses near you by category, rating, or name.
                    All data comes from real Google Places listings.
                  </p>
                </CardContent>
              </Card>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={0.15}>
              <Card className="h-full text-center card-lift">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-chart-2/10 flex items-center justify-center mx-auto mb-4">
                    <Heart className="h-6 w-6 text-chart-2" />
                  </div>
                  <div className="text-xs font-medium text-chart-2 mb-1">Step 2</div>
                  <h3 className="text-lg font-semibold mb-2">Engage</h3>
                  <p className="text-sm text-muted-foreground">
                    Leave reviews, bookmark favorites, claim deals, and check in
                    to show your support for local businesses.
                  </p>
                </CardContent>
              </Card>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={0.2}>
              <Card className="h-full text-center card-lift">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-chart-3/10 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-6 w-6 text-chart-3" />
                  </div>
                  <div className="text-xs font-medium text-chart-3 mb-1">Step 3</div>
                  <h3 className="text-lg font-semibold mb-2">Track Impact</h3>
                  <p className="text-sm text-muted-foreground">
                    See your personal economic impact dashboard — dollars kept local,
                    jobs supported, and your community rank.
                  </p>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </div>
  )
}
