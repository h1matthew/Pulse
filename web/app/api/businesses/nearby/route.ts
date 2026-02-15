import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { LatLng } from '@/types/business'

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || ''
const API_BASE_URL = 'https://places.googleapis.com/v1'

// Field mask for nearby search
const NEARBY_FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.priceLevel,places.rating,places.userRatingCount,places.photos,places.formattedPhoneNumber,places.websiteUri,places.regularOpeningHours,places.editorialSummary'

interface GooglePlaceResult {
  id: string
  displayName?: { text: string; languageCode: string }
  formattedAddress?: string
  location?: { latitude: number; longitude: number }
  types?: string[]
  priceLevel?: string
  rating?: number
  userRatingCount?: number
  photos?: { name: string; widthPx: number; heightPx: number }[]
  formattedPhoneNumber?: string
  websiteUri?: string
  regularOpeningHours?: {
    openNow?: boolean
    weekdayDescriptions?: string[]
  }
  editorialSummary?: { text: string; languageCode: string }
}

interface PlacesSearchResponse {
  places?: GooglePlaceResult[]
}

// Map Google place types to our categories
function mapGoogleTypeToCategory(types: string[]): string {
  const typeMap: Record<string, string> = {
    'restaurant': 'food-drink',
    'cafe': 'food-drink',
    'bakery': 'food-drink',
    'bar': 'food-drink',
    'meal_delivery': 'food-drink',
    'meal_takeaway': 'food-drink',
    'store': 'retail',
    'shopping_mall': 'retail',
    'clothing_store': 'retail',
    'book_store': 'retail',
    'electronics_store': 'retail',
    'grocery_or_supermarket': 'retail',
    'convenience_store': 'retail',
    'hair_care': 'services',
    'beauty_salon': 'services',
    'spa': 'services',
    'gym': 'services',
    'health': 'services',
    'doctor': 'services',
    'dentist': 'services',
    'hospital': 'services',
    'bank': 'services',
    'atm': 'services',
    'car_repair': 'services',
    'car_wash': 'services',
    'gas_station': 'services',
    'lodging': 'services',
    'museum': 'entertainment',
    'movie_theater': 'entertainment',
    'park': 'entertainment',
    'tourist_attraction': 'entertainment',
    'art_gallery': 'entertainment',
    'night_club': 'entertainment',
  }

  for (const type of types) {
    const mapped = typeMap[type]
    if (mapped) return mapped
  }
  return 'retail' // Default category
}

// Convert price level
function convertPriceLevel(priceLevel?: string): number | null {
  switch (priceLevel) {
    case 'PRICE_LEVEL_INEXPENSIVE': return 1
    case 'PRICE_LEVEL_MODERATE': return 2
    case 'PRICE_LEVEL_EXPENSIVE': return 3
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return 4
    default: return null
  }
}

// Generate a short description from Google types and summary
function generateDescription(place: GooglePlaceResult): string {
  if (place.editorialSummary?.text) {
    return place.editorialSummary.text.substring(0, 200)
  }

  const typeLabels: Record<string, string> = {
    'restaurant': 'Restaurant serving delicious food',
    'cafe': 'Cozy café with great coffee',
    'bakery': 'Fresh baked goods daily',
    'bar': 'Local bar and nightlife spot',
    'store': 'Local retail shop',
    'hair_care': 'Hair salon and styling services',
    'beauty_salon': 'Beauty and wellness services',
    'gym': 'Fitness center and gym',
    'spa': 'Relaxing spa services',
    'museum': 'Cultural museum and exhibits',
    'park': 'Outdoor park and recreation',
    'lodging': 'Hotel and accommodation',
  }

  for (const type of place.types || []) {
    if (typeLabels[type]) {
      return typeLabels[type]
    }
  }

  return 'Local business in your community'
}

// Fetch from Google Places API
async function fetchFromGooglePlaces(location: LatLng, radius: number): Promise<GooglePlaceResult[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.error('Google Places API key not configured')
    return []
  }

  try {
    const requestBody = {
      locationRestriction: {
        circle: {
          center: {
            latitude: location.lat,
            longitude: location.lng,
          },
          radius: radius,
        },
      },
      maxResultCount: 20,
      // Rank by prominence to get the best businesses
      rankPreference: 'POPULARITY',
    }

    const response = await fetch(`${API_BASE_URL}/places:searchNearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': NEARBY_FIELD_MASK,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Google Places API error:', error)
      return []
    }

    const data: PlacesSearchResponse = await response.json()
    return data.places || []
  } catch (error) {
    console.error('Failed to fetch from Google Places:', error)
    return []
  }
}

// Sync Google Places to our database
async function syncPlacesToDatabase(
  places: GooglePlaceResult[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  if (places.length === 0) return

  const db = supabase

  for (const place of places) {
    try {
      // Get category ID
      const categorySlug = mapGoogleTypeToCategory(place.types || [])
      const { data: category } = await db
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single()

      if (!category) {
        console.warn(`Category not found for slug: ${categorySlug}`)
        continue
      }

      // Check if business already exists
      const { data: existing } = await db
        .from('businesses')
        .select('id')
        .eq('place_id', place.id)
        .single()

      const businessData = {
        name: place.displayName?.text || 'Unknown Business',
        slug: `${place.displayName?.text?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50)}-${place.id.substring(0, 8)}`,
        description: generateDescription(place),
        short_description: generateDescription(place).substring(0, 100),
        address: place.formattedAddress || '',
        city: '',
        state: '',
        zip_code: '',
        latitude: place.location?.latitude,
        longitude: place.location?.longitude,
        phone: place.formattedPhoneNumber,
        website: place.websiteUri,
        price_range: convertPriceLevel(place.priceLevel),
        average_rating: place.rating || 0,
        review_count: place.userRatingCount || 0,
        category_id: category.id,
        place_id: place.id,
        data_source: 'google',
        is_verified: true,
        photos: place.photos?.map(p => ({
          photo_reference: p.name,
          height: p.heightPx,
          width: p.widthPx,
        })) || [],
        hours: place.regularOpeningHours?.weekdayDescriptions || [],
        tags: place.types?.filter(t => !t.includes('_') && t !== 'establishment' && t !== 'point_of_interest').slice(0, 5) || [],
      }

      if (existing) {
        // Update existing business
        await db
          .from('businesses')
          .update(businessData)
          .eq('id', existing.id)
      } else {
        // Insert new business
        await db
          .from('businesses')
          .insert(businessData)
      }
    } catch (error) {
      console.error('Failed to sync place:', place.id, error)
    }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const lat = Number(searchParams.get('lat'))
  const lng = Number(searchParams.get('lng'))
  const radius = Number(searchParams.get('radius')) || 5000

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Latitude and longitude are required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const location: LatLng = { lat, lng }

  try {
    // First, try to get businesses from our database within the radius
    // Using a simple box query for performance (more accurate distance calc on client)
    const latOffset = radius / 111000 // roughly convert meters to degrees
    const lngOffset = radius / (111000 * Math.cos(lat * Math.PI / 180))

    const { data: existingBusinesses, error: dbError } = await supabase
      .from('businesses')
      .select('*, category:categories(*)')
      .gte('latitude', lat - latOffset)
      .lte('latitude', lat + latOffset)
      .gte('longitude', lng - lngOffset)
      .lte('longitude', lng + lngOffset)
      .limit(50)

    if (dbError) {
      console.error('Database error:', dbError)
    }

    // If we have enough businesses from the database, return them
    if (existingBusinesses && existingBusinesses.length >= 10) {
      // Sort by distance
      const sorted = existingBusinesses.sort((a, b) => {
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
    }

    // Otherwise, fetch from Google Places and sync to database
    console.log('Fetching from Google Places API...')
    const places = await fetchFromGooglePlaces(location, radius)

    if (places.length > 0) {
      await syncPlacesToDatabase(places, supabase)
    }

    // Fetch the newly synced businesses
    const { data: syncedBusinesses, error: syncError } = await supabase
      .from('businesses')
      .select('*, category:categories(*)')
      .gte('latitude', lat - latOffset)
      .lte('latitude', lat + latOffset)
      .gte('longitude', lng - lngOffset)
      .lte('longitude', lng + lngOffset)
      .limit(50)

    if (syncError) {
      console.error('Error fetching synced businesses:', syncError)
      return NextResponse.json(
        { error: 'Failed to fetch businesses' },
        { status: 500 }
      )
    }

    // Sort by distance
    const sorted = (syncedBusinesses || []).sort((a, b) => {
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
