/**
 * OpenWeb Ninja Local Business Data API Client with Caching
 *
 * Provides business search, details, and photo retrieval using the
 * OpenWeb Ninja API (https://api.openwebninja.com/local-business-data).
 *
 * Implements cost-saving strategies:
 * - Cache place_id indefinitely
 * - Cache business details for 30 days
 * - Debounced search (300ms delay)
 */

import { createClient } from './supabase/server'
import type {
  GooglePlace,
  GooglePlacePhoto,
  LatLng,
  BusinessSearchFilters,
} from '@/types/business'

// ============================================================================
// Configuration
// ============================================================================

const OPENWEBNINJA_API_KEY = process.env.OPENWEBNINJA_API_KEY || ''
const CACHE_DURATION_DAYS = 30
const API_BASE_URL = 'https://api.openwebninja.com/local-business-data'

// ============================================================================
// OpenWeb Ninja Response Types
// ============================================================================

interface OWNPhotoSample {
  photo_id: string
  photo_url: string
  photo_url_large: string
  video_thumbnail_url: string | null
  latitude: number
  longitude: number
  type: string
  photo_datetime_utc: string
  photo_timestamp: number
}

interface OWNBusinessResult {
  business_id: string
  google_id: string
  place_id: string
  google_mid?: string
  phone_number: string | null
  name: string
  latitude: number
  longitude: number
  full_address: string
  review_count: number
  rating: number
  timezone: string
  opening_status: string | null
  working_hours: Record<string, string[]>
  website: string | null
  tld?: string
  verified: boolean
  place_link: string
  cid: string
  reviews_link: string
  owner_id: string | null
  owner_link: string | null
  owner_name: string | null
  booking_link: string | null
  reservations_link: string | null
  business_status: string
  type: string
  subtypes: string[]
  subtype_gcids?: string[]
  photos_sample: OWNPhotoSample[]
  reviews_per_rating: Record<string, number> | null
  photo_count: number
  about: {
    summary: string | null
    details: Record<string, Record<string, boolean>> | null
  } | null
  address: string
  order_link: string | null
  price_level: string | null
  district: string | null
  street_address: string
  city: string
  zipcode: string
  state: string
  country: string
}

interface OWNSearchResponse {
  status?: string
  request_id: string
  parameters: Record<string, unknown>
  data: OWNBusinessResult[]
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search businesses using OpenWeb Ninja Text Search API with caching
 */
export async function searchBusinesses(
  query: string,
  location?: LatLng,
  radius: number = 5000,
  filters?: BusinessSearchFilters
): Promise<{ places: GooglePlace[]; fromCache: boolean }> {
  // 1. Check cache first
  const supabase = await createClient()

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

  // 2. Call OpenWeb Ninja API if cache miss
  const places = await searchOWNPlaces(query, location, radius, filters)

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

async function searchOWNPlaces(
  query: string,
  location?: LatLng,
  _radius?: number,
  filters?: BusinessSearchFilters
): Promise<GooglePlace[]> {
  const params: Record<string, string | number | boolean> = {
    query,
    limit: 20,
    language: 'en',
    region: 'us',
    business_status: 'OPEN',
  }

  if (location) {
    params.lat = location.lat
    params.lng = location.lng
    params.zoom = 13
  }

  // Add subtype filter from category
  if (filters?.category) {
    params.subtypes = filters.category
  }

  try {
    const url = buildUrl('/search', params)
    const response = await fetch(url, {
      headers: {
        'x-api-key': OPENWEBNINJA_API_KEY,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenWeb Ninja API error:', error)
      throw new Error(`OpenWeb Ninja API error: ${response.status}`)
    }

    const data: OWNSearchResponse = await response.json()
    return (data.data || []).map(transformOWNResult)
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
    const params: Record<string, string | number | boolean> = {
      business_id: placeId,
      extract_emails_and_contacts: false,
      language: 'en',
      region: 'us',
    }

    const url = buildUrl('/business-details', params)
    const response = await fetch(url, {
      headers: {
        'x-api-key': OPENWEBNINJA_API_KEY,
      },
    })

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`OpenWeb Ninja API error: ${response.status}`)
    }

    const data = await response.json() as { data: OWNBusinessResult[] }
    if (!data.data || data.data.length === 0) return null

    const place = transformOWNResult(data.data[0])

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
 * Get photo URL — OpenWeb Ninja provides direct CDN URLs, no API key needed
 */
export function getPhotoUrl(
  photoUrl: string,
  _maxWidth: number = 800
): string {
  // OpenWeb Ninja already provides direct URLs to Google CDN
  return photoUrl
}

/**
 * Get photo URLs for a place
 */
export function getPlacePhotos(place: GooglePlace, _maxWidth: number = 800): string[] {
  if (!place.photos || place.photos.length === 0) return []

  return place.photos
    .slice(0, 5)
    .map(photo => photo.photo_reference)
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

// ============================================================================
// Transformation Functions
// ============================================================================

/**
 * Transform OpenWeb Ninja business result to our GooglePlace format
 * for backward compatibility with the rest of the app
 */
function transformOWNResult(result: OWNBusinessResult): GooglePlace {
  // Convert price level from string to number
  let priceLevel: number | undefined
  switch (result.price_level) {
    case '$': priceLevel = 1; break
    case '$$': priceLevel = 2; break
    case '$$$': priceLevel = 3; break
    case '$$$$': priceLevel = 4; break
    default: priceLevel = undefined
  }

  // Transform photos — OpenWeb Ninja provides direct URLs
  const photos: GooglePlacePhoto[] = (result.photos_sample || []).map(photo => ({
    photo_reference: photo.photo_url_large || photo.photo_url,
    height: 0,
    width: 0,
    html_attributions: [],
  }))

  // Transform hours from { "Monday": ["9 AM–5 PM"] } to weekday_text format
  const weekdayText: string[] = []
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  for (const day of dayOrder) {
    const hours = result.working_hours?.[day]
    if (hours && hours.length > 0) {
      weekdayText.push(`${day}: ${hours.join(', ')}`)
    }
  }

  return {
    place_id: result.place_id || result.business_id,
    name: result.name || 'Unknown',
    formatted_address: result.full_address || result.address || '',
    geometry: {
      location: {
        lat: result.latitude || 0,
        lng: result.longitude || 0,
      },
    },
    formatted_phone_number: result.phone_number || undefined,
    website: result.website || undefined,
    price_level: priceLevel,
    rating: result.rating,
    user_ratings_total: result.review_count,
    photos,
    opening_hours: weekdayText.length > 0 ? {
      weekday_text: weekdayText,
      open_now: result.opening_status === 'Open' || undefined,
    } : undefined,
    types: result.subtype_gcids || result.subtypes || [],
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Build URL with query parameters
 */
function buildUrl(endpoint: string, params: Record<string, string | number | boolean>): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

/**
 * Enrich business data from OpenWeb Ninja
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
  return !!OPENWEBNINJA_API_KEY && OPENWEBNINJA_API_KEY.length > 0
}
