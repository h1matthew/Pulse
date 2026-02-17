import { createClient } from '@/lib/supabase/server'
import { isRealBusinessPlaceTypes, isRealBusinessRecord } from '@/lib/business/display'
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

  const name = place.displayName?.text || ''

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

  for (const type of place.types || []) {
    if (typeTemplates[type]) {
      return typeTemplates[type](name)
    }
  }

  if (name) {
    return `${name} is a local business proudly serving the community`
  }

  return 'A local business proudly serving the community'
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
      if (!isRealBusinessPlaceTypes(place.types || [])) {
        continue
      }

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
        tags: place.types
          ?.filter((type) => type !== 'establishment' && type !== 'point_of_interest')
          .slice(0, 10) || [],
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
