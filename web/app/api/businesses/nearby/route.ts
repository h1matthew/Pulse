import { createClient } from '@/lib/supabase/server'
import { isRealBusinessPlaceTypes, isRealBusinessRecord } from '@/lib/business/display'
import { NextResponse } from 'next/server'
import type { LatLng } from '@/types/business'

const OPENWEBNINJA_API_KEY = process.env.OPENWEBNINJA_API_KEY || ''
const API_BASE_URL = 'https://api.openwebninja.com/local-business-data'

// OpenWeb Ninja response types
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
  verified: boolean
  business_status: string
  type: string
  subtypes: string[]
  subtype_gcids?: string[]
  photos_sample: OWNPhotoSample[]
  photo_count: number
  about: {
    summary: string | null
    details: Record<string, Record<string, boolean>> | null
  } | null
  address: string
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

// Map category slugs to business subtypes for filtering
const CATEGORY_SUBTYPE_MAP: Record<string, string[]> = {
  'food-drink': ['Restaurant', 'Cafe', 'Bakery', 'Bar', 'Coffee shop', 'Fast food restaurant', 'Pizza restaurant', 'Sushi restaurant', 'Ice cream shop'],
  'retail': ['Store', 'Shopping mall', 'Clothing store', 'Book store', 'Electronics store', 'Grocery store', 'Convenience store', 'Department store', 'Shoe store', 'Gift shop'],
  'services': ['Hair salon', 'Beauty salon', 'Spa', 'Gym', 'Doctor', 'Dentist', 'Bank', 'Car repair', 'Car wash', 'Gas station', 'Laundry', 'Dry cleaner', 'Plumber', 'Electrician'],
  'entertainment': ['Movie theater', 'Museum', 'Park', 'Tourist attraction', 'Art gallery', 'Night club', 'Amusement park', 'Bowling alley', 'Zoo', 'Aquarium'],
  'health-wellness': ['Gym', 'Spa', 'Doctor', 'Dentist', 'Hospital', 'Physiotherapist', 'Pharmacy', 'Veterinarian', 'Yoga studio'],
  'arts-culture': ['Art gallery', 'Museum', 'Library', 'Book store', 'Theater'],
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

/** Convert price_level string ("$", "$$", etc.) to numeric 1-4 scale. */
function convertPriceLevel(priceLevel?: string | null): number | null {
  switch (priceLevel) {
    case '$': return 1
    case '$$': return 2
    case '$$$': return 3
    case '$$$$': return 4
    default: return null
  }
}

/** Generate a description from an OpenWeb Ninja business result. */
function generateDescription(place: OWNBusinessResult): string {
  if (place.about?.summary) {
    return place.about.summary.substring(0, 200)
  }

  const name = place.name || ''

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

  for (const type of place.subtypes || []) {
    if (typeTemplates[type]) {
      return typeTemplates[type](name)
    }
  }

  if (name) {
    return `${name} is a local business proudly serving the community`
  }

  return 'A local business proudly serving the community'
}

/** Transform OWN working_hours to weekday description strings. */
function transformHours(workingHours: Record<string, string[]> | null | undefined): string[] {
  if (!workingHours) return []
  return Object.entries(workingHours).map(([day, times]) => `${day}: ${times.join(', ')}`)
}

/**
 * Build URL with query parameters for OpenWeb Ninja API
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
 * Call the OpenWeb Ninja Search Nearby API and return filtered results.
 * Excludes educational institutions via client-side filtering.
 */
async function fetchFromOpenWebNinja(
  location: LatLng,
  _radius: number,
  categorySlug?: string
): Promise<OWNBusinessResult[]> {
  if (!OPENWEBNINJA_API_KEY) {
    console.error('OpenWeb Ninja API key not configured')
    return []
  }

  try {
    const params: Record<string, string | number | boolean> = {
      query: categorySlug
        ? CATEGORY_SUBTYPE_MAP[categorySlug]?.[0] || 'business'
        : 'business',
      lat: location.lat,
      lng: location.lng,
      limit: 20,
      language: 'en',
      region: 'us',
    }

    // Add subtypes filter if category provided
    if (categorySlug && CATEGORY_SUBTYPE_MAP[categorySlug]) {
      params.subtypes = CATEGORY_SUBTYPE_MAP[categorySlug].join(',')
    }

    const url = buildUrl('/search-nearby', params)
    const response = await fetch(url, {
      headers: {
        'x-api-key': OPENWEBNINJA_API_KEY,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenWeb Ninja API error:', error)
      return []
    }

    const data: OWNSearchResponse = await response.json()

    // Client-side filtering to exclude educational institutions and adult businesses
    const filteredPlaces = (data.data || []).filter(place => {
      // Exclude adult businesses by name
      if (ADULT_BUSINESS_PATTERN.test(place.name || '')) {
        return false
      }

      const allTypes = [
        ...(place.subtype_gcids || []),
        ...place.subtypes.map(s => s.toLowerCase()),
      ]
      return !allTypes.some(type =>
        EDUCATIONAL_SUBTYPES.some(edu => type.includes(edu))
      )
    })

    return filteredPlaces
  } catch (error) {
    console.error('Failed to fetch from OpenWeb Ninja:', error)
    return []
  }
}

/**
 * Upsert OpenWeb Ninja results into the Supabase businesses table.
 */
async function syncPlacesToDatabase(
  places: OWNBusinessResult[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  if (places.length === 0) return

  const db = supabase

  for (const place of places) {
    // Skip educational institutions
    const allTypes = [
      ...(place.subtype_gcids || []),
      ...place.subtypes.map(s => s.toLowerCase()),
    ]
    if (allTypes.some(type => EDUCATIONAL_SUBTYPES.some(edu => type.includes(edu)))) {
      continue
    }

    try {
      if (!isRealBusinessPlaceTypes(place.subtypes || [])) {
        continue
      }

      // Get category ID
      const categorySlug = mapSubtypeToCategory(place.subtypes, place.subtype_gcids)
      const { data: category } = await db
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single()

      if (!category) {
        console.warn(`Category not found for slug: ${categorySlug}`)
        continue
      }

      // Check if business already exists (by place_id or business_id)
      const placeIdentifier = place.place_id || place.business_id
      const { data: existing } = await db
        .from('businesses')
        .select('id')
        .eq('place_id', placeIdentifier)
        .single()

      // Photo URLs — OpenWeb Ninja provides direct CDN URLs (no API key needed)
      const photoUrls = (place.photos_sample || [])
        .slice(0, 3)
        .map(p => p.photo_url_large || p.photo_url)

      // Transform hours to our format
      const hours = transformHours(place.working_hours)

      // Clean up tags from subtypes
      const tags = place.subtypes
        ?.filter(t => t !== 'Establishment' && t !== 'Point of interest')
        .slice(0, 5) || []

      const desc = generateDescription(place)
      const businessData = {
        name: place.name || 'Unknown Business',
        slug: `${place.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50)}-${placeIdentifier.substring(0, 8)}`,
        description: desc,
        short_description: desc.substring(0, 100),
        editorial_summary: place.about?.summary || null,
        // Use pre-parsed address fields from OpenWeb Ninja
        address: place.full_address || place.address || '',
        city: place.city || '',
        state: place.state || '',
        zip_code: place.zipcode || '',
        latitude: place.latitude,
        longitude: place.longitude,
        phone: place.phone_number,
        website: place.website,
        price_range: convertPriceLevel(place.price_level),
        average_rating: place.rating || 0,
        review_count: place.review_count || 0,
        category_id: category.id,
        place_id: place.place_id,
        data_source: 'google',
        is_verified: place.verified ?? true,
        photos: (place.photos_sample || []).slice(0, 5).map(p => ({
          photo_reference: p.photo_url,
          height: 0,
          width: 0,
        })),
        hours: hours,
        tags: place.subtypes
          ?.filter((type) => type !== 'establishment' && type !== 'point_of_interest')
          .slice(0, 10) || [],
      }

      if (existing) {
        // Update existing business — don't overwrite editorial_summary with null
        const updateData: Record<string, unknown> = { ...businessData }
        if (!updateData.editorial_summary) {
          delete updateData.editorial_summary
        }
        await db
          .from('businesses')
          .update(updateData)
          .eq('id', existing.id)
      } else {
        // Insert new business
        await db
          .from('businesses')
          .insert(businessData)
      }
    } catch (error) {
      console.error('Failed to sync place:', place.place_id || place.business_id, error)
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

    const { data: existingBusinesses, error: dbError } = await query.limit(50)

    if (dbError) {
      console.error('Database error:', dbError)
    }

    const filteredExistingBusinesses = (existingBusinesses || []).filter((business) =>
      isRealBusinessRecord({
        data_source: business.data_source,
        tags: business.tags,
        name: business.name,
      })
    )

    // If we have enough businesses from the database, return them
    if (filteredExistingBusinesses.length >= 10) {
      // Sort by distance
      const sorted = filteredExistingBusinesses.sort((a, b) => {
        const distA = Math.sqrt(
          Math.pow((a?.latitude || 0) - lat, 2) +
          Math.pow((a?.longitude || 0) - lng, 2)
        )
        const distB = Math.sqrt(
          Math.pow((b?.latitude || 0) - lat, 2) +
          Math.pow((b?.longitude || 0) - lng, 2)
        )
        return distA - distB
      })
      return NextResponse.json(sorted)
    }

    // Otherwise, fetch from OpenWeb Ninja and sync to database
    const places = await fetchFromOpenWebNinja(location, radius, category)

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

    const { data: syncedBusinesses, error: syncError } = await syncedQuery.limit(50)

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
