/**
 * ============================================================================
 * API: Nearby Businesses (/api/businesses/nearby)
 * ============================================================================
 *
 * USER JOURNEY:
 *   1. Discover page resolves user location (GPS or zip code geocode)
 *   2. Client calls GET /api/businesses/nearby?lat=…&lng=…&radius=…&category=…
 *   3. Server queries local DB within a bounding box for cached businesses
 *   4. If < 10 results, backfills from Google Places API v2 (Nearby Search),
 *      syncs new places into DB, then re-queries and returns the merged set
 *   5. Results are sorted by Euclidean distance (server-side default)
 *
 * DESIGN RATIONALE:
 *   - Bounding-box query is fast and avoids PostGIS dependency for MVP
 *   - Automatic backfill means the DB self-populates as users explore new areas
 *   - Category filter is applied at both API-fetch and DB-query level
 *   - Educational & adult businesses are excluded client-side after API fetch
 *
 * INPUT VALIDATION:
 *   Syntactical:
 *     • lat/lng must be valid numbers (NaN → 400)
 *     • radius defaults to 5000m if missing or non-numeric
 *     • category is an optional slug string
 *   Semantic:
 *     • lat=0 && lng=0 would return ocean — rejected by the isNaN/falsy check
 *     • Category slug must match a row in the categories table (no match → unfiltered)
 *
 * ACCESSIBILITY:
 *   Returns structured JSON consumed by useNearbyBusinesses hook, which
 *   announces "Found N businesses nearby" to screen readers via useAnnouncer.
 * ============================================================================
 */

import { createClient } from '@/lib/supabase/server'
import { isRealBusinessPlaceTypes, isRealBusinessRecord } from '@/lib/business/display'
import { isChainBusiness } from '@/lib/business/classify'
import { NextResponse } from 'next/server'
import type { LatLng } from '@/types/business'

// ============================================================================
// Google Places API v2 (New) types
// ============================================================================

interface GooglePlacePhoto {
  name: string
  widthPx?: number
  heightPx?: number
}

interface GooglePlaceResult {
  id: string
  displayName?: { text: string; languageCode?: string }
  formattedAddress?: string
  shortFormattedAddress?: string
  location?: { latitude: number; longitude: number }
  rating?: number
  userRatingCount?: number
  photos?: GooglePlacePhoto[]
  types?: string[]
  primaryType?: string
  nationalPhoneNumber?: string
  websiteUri?: string
  priceLevel?: string
  businessStatus?: string
  regularOpeningHours?: {
    openNow?: boolean
    weekdayDescriptions?: string[]
  }
  googleMapsUri?: string
}

interface GoogleNearbyResponse {
  places?: GooglePlaceResult[]
}

// Map category slugs to keywords for type matching (lowercase for comparison)
const CATEGORY_SUBTYPE_MAP: Record<string, string[]> = {
  'food-drink': ['restaurant', 'cafe', 'bakery', 'bar', 'coffee_shop', 'coffee shop', 'fast_food', 'pizza', 'sushi', 'ice_cream', 'food', 'meal_delivery', 'meal_takeaway'],
  'retail': ['store', 'shopping', 'clothing', 'book_store', 'book store', 'electronics', 'grocery', 'convenience', 'department', 'shoe', 'gift', 'supermarket', 'market'],
  'services': ['hair_salon', 'hair salon', 'beauty_salon', 'beauty salon', 'spa', 'gym', 'doctor', 'dentist', 'bank', 'car_repair', 'car repair', 'car_wash', 'car wash', 'gas_station', 'laundry', 'plumber', 'electrician'],
  'entertainment': ['movie_theater', 'movie theater', 'museum', 'park', 'tourist_attraction', 'art_gallery', 'night_club', 'amusement', 'bowling', 'zoo', 'aquarium'],
  'health-wellness': ['gym', 'spa', 'doctor', 'dentist', 'hospital', 'physiotherapist', 'pharmacy', 'veterinary', 'yoga'],
  'arts-culture': ['art_gallery', 'art gallery', 'museum', 'library', 'book_store', 'book store', 'performing_arts', 'theater'],
}

// Educational subtypes to exclude
const EDUCATIONAL_SUBTYPES = [
  'school', 'primary_school', 'secondary_school', 'high_school',
  'university', 'preschool', 'kindergarten', 'college',
]

// Adult business name keywords to exclude
const ADULT_BUSINESS_PATTERN =
  /\b(adult\s+store|adult\s+shop|sex\s+shop|adult\s+entertainment|adult\s+novelty|adult\s+video|adult\s+bookstore|adult\s+superstore)\b/i

/**
 * Map an array of business subtypes/subtype_gcids to the best-matching internal category slug.
 * Falls back to "retail" if no match is found.
 */
function mapSubtypeToCategory(subtypes: string[], subtype_gcids?: string[]): string {
  const allTypes = [...(subtype_gcids || []), ...subtypes.map(s => s.toLowerCase())]
  for (const type of allTypes) {
    const typeLower = type.toLowerCase()
    for (const [categorySlug, mappedTypes] of Object.entries(CATEGORY_SUBTYPE_MAP)) {
      if (mappedTypes.some(mt => typeLower.includes(mt.toLowerCase()) || mt.toLowerCase().includes(typeLower))) {
        return categorySlug
      }
    }
  }
  return 'retail'
}

/** Convert Google v2 priceLevel enum to numeric 1-4 scale.
 * The businesses_price_range_check constraint requires 1-4 or NULL,
 * so PRICE_LEVEL_FREE maps to null. */
function convertPriceLevel(priceLevel?: string | null): number | null {
  switch (priceLevel) {
    case 'PRICE_LEVEL_INEXPENSIVE': return 1
    case 'PRICE_LEVEL_MODERATE': return 2
    case 'PRICE_LEVEL_EXPENSIVE': return 3
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return 4
    // Legacy OWN format
    case '$': return 1
    case '$$': return 2
    case '$$$': return 3
    case '$$$$': return 4
    default: return null
  }
}

/** Generate a short description from a Google Place result. */
function generateDescription(place: GooglePlaceResult): string {
  const name = place.displayName?.text || 'This business'
  const primaryType = place.primaryType?.replace(/_/g, ' ') || ''

  // Build description templates that incorporate the business name
  const typeTemplates: Record<string, (n: string) => string> = {
    'restaurant': (n) => `${n} is a local restaurant known for its great food and welcoming atmosphere`,
    'cafe': (n) => `${n} is a neighborhood café serving coffee, pastries, and light bites`,
    'bakery': (n) => `${n} offers freshly baked goods, pastries, and artisan breads`,
    'bar': (n) => `${n} is a popular local spot for drinks, good vibes, and nightlife`,
    'meal_delivery': (n) => `${n} delivers fresh, made-to-order meals right to your door`,
    'meal_takeaway': (n) => `${n} serves up delicious takeout meals ready when you are`,
    'store': (n) => `${n} is a local shop offering a curated selection of goods`,
    'shopping_mall': (n) => `${n} features a variety of shops, dining, and entertainment`,
    'clothing_store': (n) => `${n} carries a curated selection of apparel and accessories`,
    'book_store': (n) => `${n} is an independent bookstore with a thoughtful collection of reads`,
    'electronics_store': (n) => `${n} offers electronics, gadgets, and tech accessories`,
    'grocery_or_supermarket': (n) => `${n} stocks fresh groceries, produce, and everyday essentials`,
    'convenience_store': (n) => `${n} has quick essentials, snacks, and everyday items`,
    'hair_care': (n) => `${n} provides professional hair styling, cuts, and treatments`,
    'beauty_salon': (n) => `${n} offers beauty services, treatments, and personal care`,
    'spa': (n) => `${n} provides relaxing spa treatments and wellness services`,
    'gym': (n) => `${n} is a fitness center with equipment, classes, and training`,
    'health': (n) => `${n} provides health and wellness services for the community`,
    'doctor': (n) => `${n} offers professional medical care and health services`,
    'dentist': (n) => `${n} provides dental care, cleanings, and oral health services`,
    'museum': (n) => `${n} features exhibits, collections, and cultural experiences`,
    'park': (n) => `${n} is a green space for recreation, relaxation, and outdoor activities`,
    'lodging': (n) => `${n} offers comfortable accommodations for travelers and visitors`,
    'car_repair': (n) => `${n} provides auto repair, maintenance, and vehicle services`,
    'car_wash': (n) => `${n} keeps your vehicle looking its best with professional washes`,
    'gas_station': (n) => `${n} offers fuel, convenience items, and roadside essentials`,
    'movie_theater': (n) => `${n} screens the latest films in a great viewing experience`,
    'night_club': (n) => `${n} is a nightlife destination with music, dancing, and drinks`,
    'art_gallery': (n) => `${n} showcases artwork, exhibitions, and creative collections`,
    'tourist_attraction': (n) => `${n} is a must-visit destination and local landmark`,
    'bank': (n) => `${n} provides banking, financial services, and account management`,
  }

  for (const type of (place.types || [])) {
    const key = type.replace(/_/g, ' ')
    for (const [templateKey, fn] of Object.entries(typeTemplates)) {
      if (key.includes(templateKey) || type === templateKey) {
        return fn(name)
      }
    }
  }

  if (primaryType) {
    return `${name} is a local ${primaryType} proudly serving the community`
  }
  return `${name} is a local business proudly serving the community`
}

/** Parse address components from a formatted address string. */
function parseAddress(formatted: string): { city: string; state: string; zip: string } {
  // "123 Main St, Diamond Bar, CA 91765, USA"
  const parts = formatted.split(',').map(s => s.trim())
  const city = parts[1] || ''
  const stateZip = parts[2] || ''
  const stateMatch = stateZip.match(/^([A-Z]{2})\s*(\d{5})?/)
  return {
    city,
    state: stateMatch?.[1] || '',
    zip: stateMatch?.[2] || '',
  }
}

// ============================================================================
// Google Places types to include for each category
// ============================================================================

const CATEGORY_GOOGLE_TYPES: Record<string, string[]> = {
  'food-drink': ['restaurant', 'cafe', 'bakery', 'bar', 'coffee_shop', 'fast_food_restaurant', 'pizza_restaurant', 'ice_cream_shop'],
  'retail': ['store', 'shopping_mall', 'clothing_store', 'book_store', 'electronics_store', 'grocery_store', 'convenience_store', 'gift_shop', 'shoe_store'],
  'services': ['hair_salon', 'beauty_salon', 'spa', 'gym', 'car_repair', 'car_wash', 'laundry', 'dry_cleaner', 'bank'],
  'entertainment': ['movie_theater', 'museum', 'tourist_attraction', 'art_gallery', 'night_club', 'amusement_park', 'bowling_alley'],
  'health-wellness': ['gym', 'spa', 'doctor', 'dentist', 'hospital', 'pharmacy', 'physiotherapist', 'veterinary_care'],
  'arts-culture': ['art_gallery', 'museum', 'library', 'book_store', 'performing_arts_theater'],
}

/**
 * Call Google Places API v2 Nearby Search and return filtered results.
 */
async function fetchFromGooglePlaces(
  location: LatLng,
  radius: number,
  categorySlug?: string
): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || ''
  if (!apiKey) {
    console.error('Google Places API key not configured')
    return []
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
      maxResultCount: 20,
      rankPreference: 'DISTANCE',
      languageCode: 'en',
      locationRestriction: {
        circle: {
          center: { latitude: location.lat, longitude: location.lng },
          radius: Math.min(radius, 50000),
        },
      },
    }

    // Add type filter if category provided
    if (categorySlug && CATEGORY_GOOGLE_TYPES[categorySlug]) {
      body.includedTypes = CATEGORY_GOOGLE_TYPES[categorySlug]
    }

    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.types,places.primaryType,places.nationalPhoneNumber,places.websiteUri,places.priceLevel,places.businessStatus,places.regularOpeningHours',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Google Places API error:', error)
      return []
    }

    const data: GoogleNearbyResponse = await response.json()
    const places = data.places || []

    // Filter out educational institutions and adult businesses
    return places.filter(place => {
      const name = place.displayName?.text || ''
      if (ADULT_BUSINESS_PATTERN.test(name)) return false

      const types = place.types || []
      if (types.some(t => EDUCATIONAL_SUBTYPES.some(edu => t.includes(edu)))) return false

      return place.businessStatus !== 'CLOSED_PERMANENTLY'
    })
  } catch (error) {
    console.error('Failed to fetch from Google Places:', error)
    return []
  }
}

/**
 * Supplementary fetch from OpenWeb Ninja for broader coverage.
 * Returns results as GooglePlaceResult-compatible objects so they can
 * be merged with Google Places results and synced the same way.
 */
async function fetchFromOpenWebNinja(
  location: LatLng,
  radius: number,
  categorySlug?: string
): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.OPENWEBNINJA_API_KEY || ''
  if (!apiKey) return []

  try {
    const query = categorySlug && CATEGORY_GOOGLE_TYPES[categorySlug]
      ? CATEGORY_GOOGLE_TYPES[categorySlug][0]?.replace(/_/g, ' ') || 'business'
      : 'business'

    const url = new URL('https://api.openwebninja.com/local-business-data/search-nearby')
    url.searchParams.set('query', query)
    url.searchParams.set('lat', String(location.lat))
    url.searchParams.set('lng', String(location.lng))
    url.searchParams.set('limit', '20')
    url.searchParams.set('language', 'en')
    url.searchParams.set('region', 'us')

    const res = await fetch(url.toString(), {
      headers: { 'x-api-key': apiKey },
    })
    if (!res.ok) return []

    const data = await res.json()
    // Convert OWN format to GooglePlaceResult-compatible shape
    return ((data.data || []) as Array<{
      place_id: string; name: string; latitude: number; longitude: number;
      rating: number; review_count: number; phone_number: string | null;
      website: string | null; full_address: string; subtypes: string[];
      photos_sample: Array<{ photo_url: string; photo_url_large: string }>;
      working_hours: Record<string, string[]> | null;
      price_level: string | null; verified: boolean; business_status: string;
    }>)
      .filter(p => p.business_status !== 'CLOSED_PERMANENTLY')
      .map(p => ({
        id: p.place_id,
        displayName: { text: p.name },
        formattedAddress: p.full_address,
        location: { latitude: p.latitude, longitude: p.longitude },
        rating: p.rating,
        userRatingCount: p.review_count,
        nationalPhoneNumber: p.phone_number || undefined,
        websiteUri: p.website || undefined,
        types: p.subtypes?.map(s => s.toLowerCase().replace(/\s+/g, '_')) || [],
        primaryType: p.subtypes?.[0]?.toLowerCase().replace(/\s+/g, '_'),
        priceLevel: p.price_level === '$' ? 'PRICE_LEVEL_INEXPENSIVE'
          : p.price_level === '$$' ? 'PRICE_LEVEL_MODERATE'
          : p.price_level === '$$$' ? 'PRICE_LEVEL_EXPENSIVE'
          : undefined,
        // OWN provides direct CDN photo URLs — no resolution needed
        photos: (p.photos_sample || []).slice(0, 3).map(ph => ({
          name: ph.photo_url_large || ph.photo_url,
          widthPx: 0,
          heightPx: 0,
        })),
        regularOpeningHours: p.working_hours ? {
          weekdayDescriptions: Object.entries(p.working_hours).map(
            ([day, times]) => `${day}: ${times.join(', ')}`
          ),
        } : undefined,
      } as GooglePlaceResult))
  } catch (error) {
    console.error('OpenWeb Ninja fetch failed:', error)
    return []
  }
}

/**
 * Resolve a Google Places v2 photo resource name to a direct CDN URL.
 * This is done at sync time so display-time photo loading is instant (no API call).
 */
async function resolvePhotoUrl(photoName: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&maxHeightPx=600&skipHttpRedirect=true`,
      { headers: { 'X-Goog-Api-Key': apiKey } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.photoUri || null
  } catch {
    return null
  }
}

/**
 * Resolve photo CDN URLs for a batch of photo references in parallel.
 */
async function resolvePhotos(
  googlePhotos: GooglePlacePhoto[],
  apiKey: string
): Promise<{ photo_reference: string; height: number; width: number }[]> {
  const photos = googlePhotos.slice(0, 3)
  const resolved = await Promise.all(
    photos.map(async (p) => {
      // If the photo name is already a direct URL (from OpenWeb Ninja), use it as-is
      if (p.name.startsWith('http')) {
        return { photo_reference: p.name, height: p.heightPx || 0, width: p.widthPx || 0 }
      }
      // Otherwise resolve Google Places resource name to CDN URL
      const cdnUrl = await resolvePhotoUrl(p.name, apiKey)
      return {
        photo_reference: cdnUrl || p.name,
        height: p.heightPx || 0,
        width: p.widthPx || 0,
      }
    })
  )
  return resolved
}

/**
 * Upsert Google Places results into the Supabase businesses table.
 */
async function syncPlacesToDatabase(
  places: GooglePlaceResult[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  if (places.length === 0) return

  const db = supabase

  for (const place of places) {
    try {
      const types = place.types || []
      if (!isRealBusinessPlaceTypes(types)) continue

      // Skip chains/franchises entirely — Pulse only lists independent
      // small businesses.
      const displayName = place.displayName?.text || ''
      if (isChainBusiness({ name: displayName, tags: types })) continue

      // Map types to internal category
      const categorySlug = mapSubtypeToCategory(types)
      const { data: category } = await db
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single()

      if (!category) continue

      const placeId = place.id
      if (!placeId) continue

      const { data: existing } = await db
        .from('businesses')
        .select('id')
        .eq('place_id', placeId)
        .single()

      const name = place.displayName?.text || 'Unknown Business'
      const addr = parseAddress(place.formattedAddress || '')
      const desc = generateDescription(place)

      // Resolve photo CDN URLs at sync time — this makes display-time loading instant.
      // Stores direct URLs like "https://lh3.googleusercontent.com/places/..."
      // which buildBusinessPhotoUrl() returns as-is (no proxy needed).
      const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || ''
      const photos = await resolvePhotos(place.photos || [], apiKey)

      const hours = place.regularOpeningHours?.weekdayDescriptions || []
      const tags = types
        .filter(t => t !== 'establishment' && t !== 'point_of_interest')
        .slice(0, 10)

      const businessData = {
        name,
        slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50)}-${placeId.substring(0, 8)}`,
        description: desc,
        short_description: desc.substring(0, 100),
        address: place.formattedAddress || '',
        city: addr.city,
        state: addr.state,
        zip_code: addr.zip,
        latitude: place.location?.latitude || 0,
        longitude: place.location?.longitude || 0,
        phone: place.nationalPhoneNumber || null,
        website: place.websiteUri || null,
        price_range: convertPriceLevel(place.priceLevel),
        average_rating: place.rating || 0,
        review_count: place.userRatingCount || 0,
        category_id: category.id,
        place_id: placeId,
        data_source: 'google',
        is_verified: true,
        is_chain: false,
        photos,
        hours,
        tags,
      }

      if (existing) {
        await db
          .from('businesses')
          .update(businessData)
          .eq('id', existing.id)
      } else {
        await db
          .from('businesses')
          .insert(businessData)
      }
    } catch (error) {
      console.error('Failed to sync place:', place.id, error)
    }
  }
}

/**
 * GET /api/businesses/nearby
 *
 * Returns businesses near the given coordinates. First queries the local database;
 * if fewer than 10 results are found, fetches from OpenWeb Ninja API and syncs
 * new places to the database before returning results sorted by distance.
 *
 * Query params: lat, lng (required), radius (meters, default 5000), category (optional slug)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')
  const radius = Number(searchParams.get('radius')) || 5000
  const category = searchParams.get('category') || undefined
  const forceRefresh = searchParams.get('refresh') === 'true'

  const lat = Number(latParam)
  const lng = Number(lngParam)

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: 'Valid latitude and longitude are required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const location: LatLng = { lat, lng }

  try {
    // Calculate bounding box for database query
    const latOffset = radius / 111000
    const lngOffset = radius / (111000 * Math.cos(lat * Math.PI / 180))

    // Build base query
    let query = supabase
      .from('businesses')
      .select(`
        *,
        category:categories(*),
        deals(*)
      `)
      .gte('latitude', lat - latOffset)
      .lte('latitude', lat + latOffset)
      .gte('longitude', lng - lngOffset)
      .lte('longitude', lng + lngOffset)

    // Add category filter if provided
    if (category) {
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .single()

      if (categoryData) {
        query = query.eq('category_id', categoryData.id)
      }
    }

    const { data: existingBusinesses, error: dbError } = await query.limit(250)

    if (dbError) {
      console.error('Database error:', dbError)
    }

    const filteredExistingBusinesses = (existingBusinesses || []).filter((business) =>
      isRealBusinessRecord({
        data_source: business.data_source,
        tags: business.tags,
        name: business.name,
        is_chain: business.is_chain,
      })
    )

    // Fetch from Google Places if we don't have many results for this area,
    // or if the user explicitly requests a refresh.
    // Scale threshold by radius — larger area should have more businesses.
    const expectedForRadius = Math.max(20, Math.round(radius / 500))
    const shouldFetch = forceRefresh || filteredExistingBusinesses.length < expectedForRadius
    let places: GooglePlaceResult[] = []
    if (shouldFetch) {
      // Fetch from both Google Places and OpenWeb Ninja in parallel for broader coverage
      const [googleResults, ownResults] = await Promise.all([
        fetchFromGooglePlaces(location, radius, category),
        fetchFromOpenWebNinja(location, radius, category),
      ])
      // Merge and deduplicate by place_id
      const seen = new Set<string>()
      for (const p of [...googleResults, ...ownResults]) {
        if (p.id && !seen.has(p.id)) {
          seen.add(p.id)
          places.push(p)
        }
      }
    }

    if (places.length > 0) {
      await syncPlacesToDatabase(places, supabase)
    }

    // Fetch the newly synced businesses
    let syncedQuery = supabase
      .from('businesses')
      .select(`
        *,
        category:categories(*),
        deals(*)
      `)
      .gte('latitude', lat - latOffset)
      .lte('latitude', lat + latOffset)
      .gte('longitude', lng - lngOffset)
      .lte('longitude', lng + lngOffset)

    if (category) {
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .single()

      if (categoryData) {
        syncedQuery = syncedQuery.eq('category_id', categoryData.id)
      }
    }

    const { data: syncedBusinesses, error: syncError } = await syncedQuery.limit(250)

    if (syncError) {
      console.error('Error fetching synced businesses:', syncError)
      return NextResponse.json(
        { error: 'Failed to fetch businesses' },
        { status: 500 }
      )
    }

    const filteredSyncedBusinesses = (syncedBusinesses || []).filter((business) =>
      isRealBusinessRecord({
        data_source: business.data_source,
        tags: business.tags,
        name: business.name,
        is_chain: business.is_chain,
      })
    )

    // Sort by distance
    const sorted = filteredSyncedBusinesses.sort((a, b) => {
      const distA = Math.sqrt(
        Math.pow((a.latitude || 0) - lat, 2) +
        Math.pow((a.longitude || 0) - lng, 2)
      )
      const distB = Math.sqrt(
        Math.pow((b.latitude || 0) - lat, 2) +
        Math.pow((b.longitude || 0) - lng, 2)
      )
      return distA - distB
    })

    return NextResponse.json(sorted)
  } catch (error) {
    console.error('Error in nearby businesses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
