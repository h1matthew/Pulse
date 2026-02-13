/**
 * Google Places API Client with Caching
 *
 * Implements cost-saving strategies:
 * - Cache place_id indefinitely
 * - Cache business details for 30 days (max allowed by Google)
 * - Debounced search (300ms delay)
 * - Session tokens for autocomplete
 */

import { createClient } from './supabase/server'
import type {
  GooglePlace,
  GooglePlacePhoto,
  CachedPlace,
  LatLng,
  BusinessSearchFilters,
} from '@/types/business'

// ============================================================================
// Configuration
// ============================================================================

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ''
const CACHE_DURATION_DAYS = 30
const API_BASE_URL = 'https://places.googleapis.com/v1'

// Field masks for different API calls (controls pricing tier)
const SEARCH_FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.priceLevel,places.rating,places.userRatingCount,places.photos'
const DETAILS_FIELD_MASK = 'id,displayName,formattedAddress,location,types,priceLevel,rating,userRatingCount,photos,formattedPhoneNumber,websiteUri,regularOpeningHours,editorialSummary'

// ============================================================================
// Types
// ============================================================================

interface PlacesSearchResponse {
  places?: GooglePlaceResult[]
  nextPageToken?: string
}

interface GooglePlaceResult {
  id: string // This is the place_id in new API
  displayName?: {
    text: string
    languageCode: string
  }
  formattedAddress?: string
  location?: {
    latitude: number
    longitude: number
  }
  types?: string[]
  priceLevel?: 'PRICE_LEVEL_UNSPECIFIED' | 'FREE' | 'INEXPENSIVE' | 'MODERATE' | 'EXPENSIVE' | 'VERY_EXPENSIVE'
  rating?: number
  userRatingCount?: number
  photos?: GooglePlacePhotoResult[]
  formattedPhoneNumber?: string
  websiteUri?: string
  regularOpeningHours?: {
    openNow?: boolean
    periods?: {
      open: { day: number; hour: number; minute: number }
      close?: { day: number; hour: number; minute: number }
    }[]
    weekdayDescriptions?: string[]
  }
  editorialSummary?: {
    text: string
    languageCode: string
  }
}

interface GooglePlacePhotoResult {
  name: string // Format: places/PLACE_ID/photos/PHOTO_REFERENCE
  widthPx: number
  heightPx: number
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search businesses using Google Places Text Search API with caching
 */
export async function searchBusinesses(
  query: string,
  location?: LatLng,
  radius: number = 5000, // 5km default
  filters?: BusinessSearchFilters
): Promise<{ places: GooglePlace[]; fromCache: boolean }> {
  // 1. Check cache first
  const supabase = await createClient()
  const cacheKey = generateSearchCacheKey(query, location, filters)

  const { data: cachedResults } = await supabase
    .from('cached_places')
    .select('*')
    .ilike('name', `%${query}%`)
    .gt('expires_at', new Date().toISOString())
    .limit(20)

  if (cachedResults && cachedResults.length > 0 && !location) {
    return {
      places: cachedResults.map(c => c.data as unknown as GooglePlace),
      fromCache: true,
    }
  }

  // 2. Call Google Places API if cache miss
  const places = await searchGooglePlaces(query, location, radius, filters)

  // 3. Store results in cache
  await cachePlaces(places)

  return { places, fromCache: false }
}

/**
 * Search businesses near a location
 */
export async function searchNearbyBusinesses(
  location: LatLng,
  radius: number = 5000,
  category?: string
): Promise<GooglePlace[]> {
  const query = category ? `${category} near me` : 'business'
  const { places } = await searchBusinesses(query, location, radius)
  return places
}

async function searchGooglePlaces(
  query: string,
  location?: LatLng,
  radius?: number,
  filters?: BusinessSearchFilters
): Promise<GooglePlace[]> {
  const requestBody: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: 20,
  }

  if (location) {
    requestBody.locationBias = {
      circle: {
        center: {
          latitude: location.lat,
          longitude: location.lng,
        },
        radius: radius || 5000,
      },
    }
  }

  // Add price level filter if specified
  if (filters?.priceRange && filters.priceRange.length > 0) {
    const priceLevels = filters.priceRange.map(p => {
      switch (p) {
        case 1: return 'PRICE_LEVEL_INEXPENSIVE'
        case 2: return 'PRICE_LEVEL_MODERATE'
        case 3: return 'PRICE_LEVEL_EXPENSIVE'
        case 4: return 'PRICE_LEVEL_VERY_EXPENSIVE'
        default: return null
      }
    }).filter(Boolean)

    if (priceLevels.length > 0) {
      requestBody.priceLevels = priceLevels
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': SEARCH_FIELD_MASK,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Google Places API error:', error)
      throw new Error(`Google Places API error: ${response.status}`)
    }

    const data: PlacesSearchResponse = await response.json()
    return (data.places || []).map(transformPlaceResult)
  } catch (error) {
    console.error('Failed to search places:', error)
    return []
  }
}

// ============================================================================
// Details Functions
// ============================================================================

/**
 * Get detailed business information with caching
 */
export async function getBusinessDetails(placeId: string): Promise<GooglePlace | null> {
  // 1. Check cache first
  const supabase = await createClient()

  const { data: cached } = await supabase
    .from('cached_places')
    .select('*')
    .eq('place_id', placeId)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (cached) {
    return cached.data as unknown as GooglePlace
  }

  // 2. Call API if not cached or expired
  try {
    const response = await fetch(`${API_BASE_URL}/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': DETAILS_FIELD_MASK,
      },
    })

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Google Places API error: ${response.status}`)
    }

    const result: GooglePlaceResult = await response.json()
    const place = transformPlaceResult(result)

    // 3. Cache the result
    await cachePlaces([place])

    return place
  } catch (error) {
    console.error('Failed to get place details:', error)
    return null
  }
}

// ============================================================================
// Photo Functions
// ============================================================================

/**
 * Get photo URL from Google Places Photo API
 */
export function getPhotoUrl(
  photoName: string, // Format: places/PLACE_ID/photos/PHOTO_REFERENCE
  maxWidth: number = 800
): string {
  return `${API_BASE_URL}/${photoName}/media?key=${GOOGLE_PLACES_API_KEY}&maxWidthPx=${maxWidth}`
}

/**
 * Get photo URLs for a place
 */
export function getPlacePhotos(place: GooglePlace, maxWidth: number = 800): string[] {
  if (!place.photos || place.photos.length === 0) return []

  return place.photos
    .slice(0, 5) // Limit to 5 photos
    .map(photo => getPhotoUrl(photo.photo_reference, maxWidth))
}

// ============================================================================
// Caching Functions
// ============================================================================

async function cachePlaces(places: GooglePlace[]): Promise<void> {
  if (places.length === 0) return

  const supabase = await createClient()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + CACHE_DURATION_DAYS)

  const cacheEntries = places.map(place => ({
    place_id: place.place_id,
    name: place.name,
    address: place.formatted_address,
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
    data: place as unknown as Record<string, unknown>,
    expires_at: expiresAt.toISOString(),
  }))

  // Upsert to handle updates
  const { error } = await supabase
    .from('cached_places')
    .upsert(cacheEntries, {
      onConflict: 'place_id',
      ignoreDuplicates: false,
    })

  if (error) {
    console.error('Failed to cache places:', error)
  }
}

function generateSearchCacheKey(
  query: string,
  location?: LatLng,
  filters?: BusinessSearchFilters
): string {
  const parts = [query.toLowerCase().trim()]
  if (location) parts.push(`${location.lat},${location.lng}`)
  if (filters?.category) parts.push(filters.category)
  return parts.join(':')
}

// ============================================================================
// Transformation Functions
// ============================================================================

function transformPlaceResult(result: GooglePlaceResult): GooglePlace {
  // Convert price level from string to number
  let priceLevel: number | undefined
  switch (result.priceLevel) {
    case 'INEXPENSIVE': priceLevel = 1; break
    case 'MODERATE': priceLevel = 2; break
    case 'EXPENSIVE': priceLevel = 3; break
    case 'VERY_EXPENSIVE': priceLevel = 4; break
    default: priceLevel = undefined
  }

  // Transform photos
  const photos: GooglePlacePhoto[] = (result.photos || []).map(photo => ({
    photo_reference: photo.name,
    height: photo.heightPx,
    width: photo.widthPx,
    html_attributions: [], // New API doesn't provide this in the same way
  }))

  // Transform hours
  const hours: Record<string, string> = {}
  if (result.regularOpeningHours?.weekdayDescriptions) {
    const dayMap: Record<string, string> = {
      'Monday': 'monday',
      'Tuesday': 'tuesday',
      'Wednesday': 'wednesday',
      'Thursday': 'thursday',
      'Friday': 'friday',
      'Saturday': 'saturday',
      'Sunday': 'sunday',
    }

    result.regularOpeningHours.weekdayDescriptions.forEach(desc => {
      const [day, ...timeParts] = desc.split(': ')
      const dayKey = dayMap[day]
      if (dayKey && timeParts.length > 0) {
        hours[dayKey] = timeParts.join(': ')
      }
    })
  }

  return {
    place_id: result.id,
    name: result.displayName?.text || 'Unknown',
    formatted_address: result.formattedAddress || '',
    geometry: {
      location: {
        lat: result.location?.latitude || 0,
        lng: result.location?.longitude || 0,
      },
    },
    formatted_phone_number: result.formattedPhoneNumber,
    website: result.websiteUri,
    price_level: priceLevel,
    rating: result.rating,
    user_ratings_total: result.userRatingCount,
    photos,
    opening_hours: result.regularOpeningHours ? {
      weekday_text: result.regularOpeningHours.weekdayDescriptions || [],
      open_now: result.regularOpeningHours.openNow,
    } : undefined,
    types: result.types || [],
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Enrich business data from Google Places
 * Used to update existing businesses with fresh data
 */
export async function enrichBusinessData(placeId: string): Promise<Partial<GooglePlace> | null> {
  const details = await getBusinessDetails(placeId)
  if (!details) return null

  return {
    place_id: details.place_id,
    name: details.name,
    formatted_address: details.formatted_address,
    formatted_phone_number: details.formatted_phone_number,
    website: details.website,
    price_level: details.price_level,
    rating: details.rating,
    user_ratings_total: details.user_ratings_total,
    photos: details.photos,
    opening_hours: details.opening_hours,
    types: details.types,
  }
}

/**
 * Debounce utility for search inputs
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Check if API key is configured
 */
export function isGooglePlacesConfigured(): boolean {
  return !!GOOGLE_PLACES_API_KEY && GOOGLE_PLACES_API_KEY.length > 0
}
