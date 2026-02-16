'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, SlidersHorizontal, MapPin, Loader2, Plus, Minus, RefreshCw, Store, Star, Heart, Tag, TrendingUp, Zap } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATEGORY_FILTERS } from '@/lib/constants/navigation'
import { AnimatedSection } from '@/components/features/home/AnimatedSection'
import { BusinessCard, BusinessCardSkeleton } from '@/components/features/discover/BusinessCard'
import { LocationPrompt } from '@/components/features/discover/LocationPrompt'
import { useNearbyBusinesses } from '@/hooks/useBusinesses'
import { useLocation } from '@/hooks/useLocation'
import {
  geocodeZipCode,
  getCachedLocation,
  cacheLocation,
} from '@/lib/location'
import type { LatLng } from '@/types/business'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const RADIUS_OPTIONS = [
  { value: 5000, label: '5 km' },
  { value: 10000, label: '10 km' },
  { value: 25000, label: '25 km' },
]

/** Default to Diamond Bar, CA for demo when GPS is unavailable */
const DIAMOND_BAR_DEFAULT: LatLng = { lat: 34.0286, lng: -117.8208 }

export default function DiscoverPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'review_count' | 'name'>('distance')
  const [searchQuery, setSearchQuery] = useState('')
  const [radius, setRadius] = useState(5000)
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
  } = useNearbyBusinesses(location, radius, selectedCategory)

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
  const processedBusinesses = (() => {
    if (!businesses) return []

    let filtered = [...businesses]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          (b.description?.toLowerCase().includes(query) ?? false) ||
          (b.short_description?.toLowerCase().includes(query) ?? false) ||
          (b.tags as string[])?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          if (!location) return 0
          const distA =
            Math.pow((a.latitude || 0) - location.lat, 2) +
            Math.pow((a.longitude || 0) - location.lng, 2)
          const distB =
            Math.pow((b.latitude || 0) - location.lat, 2) +
            Math.pow((b.longitude || 0) - location.lng, 2)
          return distA - distB
        case 'rating':
          return (b.average_rating || 0) - (a.average_rating || 0)
        case 'review_count':
          return (b.review_count || 0) - (a.review_count || 0)
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    return filtered
  })()

  const isLoading = locationLoading || businessesLoading || isLoadingZip
  const hasLocation = !!location
  const showLocationPrompt = !hasLocation && !locationLoading

  return (
    <div className="relative min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-8">
        <div className="mx-auto max-w-6xl">
          <AnimatedSection animation="fade-up">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Discover Local Businesses</h1>
            <p className="text-muted-foreground mb-6">
              {hasLocation
                ? `Showing real businesses from Google Places in your area${
                    locationSource === 'zip' ? ' (Diamond Bar, CA)' : ''
                  }`
                : 'Find and support amazing local businesses in your community'}
            </p>
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
                        onClick={() => setRadius((r) => Math.max(5000, r - 5000))}
                        disabled={radius <= 5000}
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
                  <BusinessCardSkeleton key={i} index={i} />
                ))}
              </div>
            ) : businessesError ? (
              <div className="text-center py-16" role="alert">
                <div className="text-4xl mb-4" aria-hidden="true">⚠️</div>
                <h3 className="text-lg font-semibold mb-2">Error loading businesses</h3>
                <p className="text-muted-foreground mb-4">{businessesError.message}</p>
                <Button onClick={() => refetch()}>Try Again</Button>
              </div>
            ) : processedBusinesses.length === 0 ? (
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
                {processedBusinesses.map((business, index) => (
                  <BusinessCard
                    key={business.id}
                    business={business}
                    index={index}
                    userLocation={location}
                    priority={index < 3}
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
