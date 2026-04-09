/**
 * BusinessCard Component
 *
 * Displays a business in a card format with image, rating, bookmark action,
 * distance calculation, and open/closed status. Used in the discover feed
 * and search results.
 *
 * Features:
 * - Photo display with category icon fallback
 * - Live distance calculation from user location
 * - Bookmark toggle with auth check
 * - Real-time open/closed status based on business hours
 * - Rating display with review count
 * - Price range indicator
 * - Tags display
 *
 * @example
 * ```tsx
 * <BusinessCard
 *   business={business}
 *   index={0}
 *   userLocation={{ lat: 40.7, lng: -74.0 }}
 *   priority={true}
 * />
 * ```
 */
'use client'

import Image from 'next/image'
import { Star, Heart, MapPin, Navigation, Clock, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NavLink } from '@/components/ui/nav-link'
import { AnimatedSection } from '@/components/features/home/AnimatedSection'
import { calculateDistance, formatDistance } from '@/lib/location'
import { formatTagLabel } from '@/lib/business/display'
import { toast } from 'sonner'

import { useAuth } from '@/components/providers/AuthProvider'
import { useIsBookmarked, useToggleBookmark } from '@/hooks/useBookmarks'
import type { BusinessWithCategory } from '@/types/business'
import type { LatLng } from '@/types/business'
import { cn } from '@/lib/utils'

/** Props for the BusinessCard component */
interface BusinessCardProps {
  /** Business data to display */
  business: BusinessWithCategory
  /** Index for staggered animation delay */
  index?: number
  /** User's current location for distance calculation */
  userLocation?: LatLng | null
  /** Whether to prioritize loading this image (above the fold) */
  priority?: boolean
}

/**
 * Convert numeric price level to dollar sign string
 * @param level - Price level 1-4
 * @returns String of dollar signs (e.g., "$$$" for level 3)
 */
function getPriceRange(level: number | null): string {
  if (!level) return ''
  return '$'.repeat(level)
}

/**
 * Determine if a business is currently open based on its hours
 * Parses business hours and compares against current time
 *
 * @param hours - Business hours object keyed by day name
 * @returns True if currently open, false otherwise
 *
 * @example
 * ```ts
 * isCurrentlyOpen({ monday: '9:00 AM - 5:00 PM' }) // true if it's Monday 2 PM
 * ```
 */
function isCurrentlyOpen(hours: Record<string, string> | unknown): boolean {
  if (!hours || typeof hours !== 'object') return false

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const now = new Date()
  const dayName = days[now.getDay()]
  const hoursForToday = (hours as Record<string, string>)[dayName]

  if (!hoursForToday || hoursForToday.toLowerCase().includes('closed')) {
    return false
  }

  // Parse hours like "9:00 AM – 9:00 PM" or "9:00 AM - 5:00 PM"
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute

  // Simple parsing - handles common formats
  const timeMatch = hoursForToday.match(/(\d+):?(\d*)?\s*(AM|PM)\s*[-–]\s*(\d+):?(\d*)?\s*(AM|PM)/i)
  if (!timeMatch) return true // Assume open if we can't parse

  const parseTime = (hour: string, minute: string, period: string): number => {
    let h = parseInt(hour, 10)
    const m = minute ? parseInt(minute, 10) : 0
    if (period.toUpperCase() === 'PM' && h !== 12) h += 12
    if (period.toUpperCase() === 'AM' && h === 12) h = 0
    return h * 60 + m
  }

  const openTime = parseTime(timeMatch[1], timeMatch[2], timeMatch[3])
  const closeTime = parseTime(timeMatch[4], timeMatch[5], timeMatch[6])

  // Handle cases where close time is after midnight
  if (closeTime < openTime) {
    return currentTime >= openTime || currentTime <= closeTime
  }

  return currentTime >= openTime && currentTime <= closeTime
}

/**
 * Business image component with fallback to category icon
 * Displays the first business photo or a gradient with category icon
 */
function BusinessImage({
  business,
  priority = false,
}: {
  business: BusinessWithCategory
  priority?: boolean
}) {
  // Get the first photo URL from the business
  const photos = business.photos as string[] | unknown
  const photoUrl = Array.isArray(photos) && photos.length > 0 ? photos[0] : null

  const categoryIcon = business.category?.icon || '🏪'

  if (photoUrl) {
    return (
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        <Image
          src={photoUrl}
          alt={business.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={priority}
          unoptimized // Google Places photos are external
        />
        {business.is_featured && (
          <Badge className="absolute top-3 left-3 bg-chart-2 text-white border-0">
            Featured
          </Badge>
        )}
      </div>
    )
  }

  // Fallback to gradient with icon
  return (
    <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-primary/10 via-chart-2/10 to-primary/5 flex items-center justify-center">
      <span className="text-6xl opacity-50">{categoryIcon}</span>
      {business.is_featured && (
        <Badge className="absolute top-3 left-3 bg-chart-2 text-white border-0">
          Featured
        </Badge>
      )}
    </div>
  )
}

export function BusinessCard({
  business,
  index = 0,
  userLocation,
  priority = false,
}: BusinessCardProps) {
  const { user } = useAuth()
  const { data: isBookmarked } = useIsBookmarked(business.id)
  const toggleBookmark = useToggleBookmark()

  // Calculate distance if user location is available
  const distance = (() => {
    if (!userLocation || !business.latitude || !business.longitude) return null
    const dist = calculateDistance(
      { lat: userLocation.lat, lng: userLocation.lng },
      { lat: business.latitude, lng: business.longitude }
    )
    return formatDistance(dist)
  })()

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      toast.error('Sign in required', {
        description: 'Please sign in to bookmark businesses',
      })
      return
    }

    try {
      await toggleBookmark.mutateAsync({
        businessId: business.id,
        isBookmarked: isBookmarked || false,
      })
      toast.success(isBookmarked ? 'Bookmark removed' : 'Business bookmarked', {
        description: isBookmarked
          ? 'Removed from your saved businesses'
          : 'Added to your saved businesses',
      })
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to update bookmark',
      })
    }
  }

  const isOpen = isCurrentlyOpen(business.hours)
  const priceRange = getPriceRange(business.price_range)

  return (
    <AnimatedSection animation="fade-up" delay={0.05 * (index + 1)}>
      <NavLink href={`/business/${business.id}`}>
        <Card className="h-full overflow-hidden card-lift cursor-pointer group border-border/50 hover:border-primary/30">
          <CardContent className="p-0">
            <BusinessImage business={business} priority={priority} />

            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                    {business.name}
                  </h3>
                  {business.category && (
                    <p className="text-xs text-muted-foreground">
                      {business.category.name}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8 -mr-2 -mt-1"
                  onClick={handleBookmark}
                  disabled={toggleBookmark.isPending}
                >
                  <Heart
                    className={cn(
                      'h-4 w-4 transition-colors',
                      isBookmarked ? 'fill-chart-5 text-chart-5' : 'text-muted-foreground'
                    )}
                  />
                </Button>
              </div>

              {/* Rating & Price */}
              <div className="flex items-center gap-2 mb-2">
                {business.average_rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-chart-5 text-chart-5" />
                    <span className="text-sm font-medium">{business.average_rating.toFixed(1)}</span>
                    {business.review_count > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({business.review_count})
                      </span>
                    )}
                  </div>
                )}
                {priceRange && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{priceRange}</span>
                  </>
                )}
                {business.is_verified && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                      ✓ Verified
                    </Badge>
                  </>
                )}
              </div>

              {/* Description — prefer AI > editorial > short > generic */}
              {(() => {
                const desc = business.ai_description
                  || business.editorial_summary
                  || business.short_description
                  || business.description
                return desc ? (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {desc}
                  </p>
                ) : null
              })()}

              {/* Location & Hours */}
              <div className="space-y-1.5">
                {distance && (
                  <div className="flex items-center gap-1.5 text-sm text-primary">
                    <Navigation className="h-3.5 w-3.5" />
                    <span>{distance} away</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {[business.city, business.state].filter(Boolean).join(', ') || business.address}
                  </span>
                </div>

                {business.hours && Object.keys(business.hours).length > 0 && (
                  <div className={cn(
                    'flex items-center gap-1.5 text-sm',
                    isOpen ? 'text-success' : 'text-muted-foreground'
                  )}>
                    <Clock className="h-3.5 w-3.5" />
                    <span>{isOpen ? 'Open now' : 'Closed'}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {business.tags && Array.isArray(business.tags) && business.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {(business.tags as string[]).slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                      {formatTagLabel(tag)}
                    </Badge>
                  ))}
                  {business.tags.length > 3 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                      +{business.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </NavLink>
    </AnimatedSection>
  )
}

/**
 * Loading skeleton for BusinessCard
 * Provides visual placeholder while business data loads
 */
export function BusinessCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <AnimatedSection animation="fade-up" delay={0.05 * (index + 1)}>
      <Card className="h-full overflow-hidden">
        <CardContent className="p-0">
          <div className="h-48 bg-muted animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
            </div>
            <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    </AnimatedSection>
  )
}
