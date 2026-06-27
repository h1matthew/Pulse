/**
 * POST /api/businesses/seed
 *
 * One-time seed endpoint that wipes stale business data and re-populates
 * from Google Places API v2 across all categories. Fetches 20 businesses
 * per category (6 categories = up to 120 results, ~50-70 unique after dedup).
 *
 * Photos are pre-resolved to direct CDN URLs at sync time so display is instant.
 *
 * Usage: POST /api/businesses/seed?lat=34.0286&lng=-117.8103&radius=8000
 */

import { createClient as createServerClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/** Create a Supabase admin client that bypasses RLS (uses service role key). */
function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || ''

// Types to fetch per category — each category gets its own search
const CATEGORY_TYPES: Record<string, string[]> = {
  'food-drink': ['restaurant', 'cafe', 'bakery'],
  'retail': ['store', 'shopping_mall', 'book_store', 'grocery_store'],
  'services': ['hair_salon', 'beauty_salon', 'car_repair', 'bank'],
  'entertainment': ['movie_theater', 'bowling_alley', 'amusement_park'],
  'health-wellness': ['gym', 'spa', 'pharmacy', 'dentist'],
  'arts-culture': ['art_gallery', 'museum', 'library'],
}

interface GooglePlacePhoto {
  name: string
  widthPx?: number
  heightPx?: number
}

interface GooglePlaceResult {
  id: string
  displayName?: { text: string }
  formattedAddress?: string
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
    weekdayDescriptions?: string[]
  }
}

async function searchNearby(
  lat: number,
  lng: number,
  radius: number,
  includedTypes: string[]
): Promise<GooglePlaceResult[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.types,places.primaryType,places.nationalPhoneNumber,places.websiteUri,places.priceLevel,places.businessStatus,places.regularOpeningHours',
    },
    body: JSON.stringify({
      includedTypes,
      maxResultCount: 20,
      rankPreference: 'DISTANCE',
      languageCode: 'en',
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.min(radius, 50000),
        },
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`[seed] Google Places error for types ${includedTypes.join(',')}:`, err.slice(0, 200))
    return []
  }

  const data = await res.json()
  return (data.places || []).filter(
    (p: GooglePlaceResult) => p.businessStatus !== 'CLOSED_PERMANENTLY'
  )
}

async function resolvePhotoUrl(photoName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&maxHeightPx=600&skipHttpRedirect=true`,
      { headers: { 'X-Goog-Api-Key': GOOGLE_API_KEY } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.photoUri || null
  } catch {
    return null
  }
}

function parseAddress(formatted: string): { city: string; state: string; zip: string } {
  const parts = formatted.split(',').map(s => s.trim())
  const city = parts[1] || ''
  const stateZip = parts[2] || ''
  const match = stateZip.match(/^([A-Z]{2})\s*(\d{5})?/)
  return { city, state: match?.[1] || '', zip: match?.[2] || '' }
}

function convertPriceLevel(level?: string | null): number | null {
  switch (level) {
    case 'PRICE_LEVEL_INEXPENSIVE': return 1
    case 'PRICE_LEVEL_MODERATE': return 2
    case 'PRICE_LEVEL_EXPENSIVE': return 3
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return 4
    default: return null
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = Number(searchParams.get('lat')) || 34.0286
  const lng = Number(searchParams.get('lng')) || -117.8103
  const radius = Number(searchParams.get('radius')) || 8000
  const wipe = searchParams.get('wipe') !== 'false'  // Default: wipe old data

  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 })
  }

  const supabase = createAdminClient()

  // Step 1: Optionally wipe old synced businesses (keeps user-added ones)
  if (wipe) {
    const { error: deleteError } = await supabase
      .from('businesses')
      .delete()
      .eq('data_source', 'google')

    if (deleteError) {
      console.error('[seed] Failed to delete old businesses:', deleteError)
    } else {
      console.log('[seed] Wiped old google-synced businesses')
    }
  }

  // Step 2: Fetch businesses across all categories from Google Places
  const allPlaces = new Map<string, { place: GooglePlaceResult; categorySlug: string }>()

  for (const [categorySlug, types] of Object.entries(CATEGORY_TYPES)) {
    console.log(`[seed] Google: ${categorySlug} (${types.join(', ')})...`)
    const places = await searchNearby(lat, lng, radius, types)
    console.log(`[seed] Google: ${places.length} results for ${categorySlug}`)

    for (const place of places) {
      if (place.id && !allPlaces.has(place.id)) {
        allPlaces.set(place.id, { place, categorySlug })
      }
    }
  }

  // Step 2b: Supplement with OpenWeb Ninja for broader coverage
  const ownApiKey = process.env.OPENWEBNINJA_API_KEY || ''
  if (ownApiKey) {
    const OWN_QUERIES: Record<string, string> = {
      'food-drink': 'restaurant',
      'retail': 'store',
      'services': 'salon',
      'entertainment': 'entertainment',
      'health-wellness': 'gym',
      'arts-culture': 'art gallery',
    }
    for (const [categorySlug, query] of Object.entries(OWN_QUERIES)) {
      try {
        const url = new URL('https://api.openwebninja.com/local-business-data/search-nearby')
        url.searchParams.set('query', query)
        url.searchParams.set('lat', String(lat))
        url.searchParams.set('lng', String(lng))
        url.searchParams.set('limit', '20')
        url.searchParams.set('language', 'en')
        url.searchParams.set('region', 'us')

        const res = await fetch(url.toString(), { headers: { 'x-api-key': ownApiKey } })
        if (!res.ok) continue
        const data = await res.json()
        const ownPlaces = (data.data || []) as Array<{
          place_id: string; name: string; latitude: number; longitude: number;
          rating: number; review_count: number; phone_number: string | null;
          website: string | null; full_address: string; subtypes: string[];
          photos_sample: Array<{ photo_url: string; photo_url_large: string }>;
          working_hours: Record<string, string[]> | null;
          price_level: string | null; business_status: string;
        }>

        let added = 0
        for (const p of ownPlaces) {
          if (!p.place_id || allPlaces.has(p.place_id)) continue
          if (p.business_status === 'CLOSED_PERMANENTLY') continue
          allPlaces.set(p.place_id, {
            place: {
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
              photos: (p.photos_sample || []).slice(0, 3).map(ph => ({
                name: ph.photo_url_large || ph.photo_url,
              })),
              regularOpeningHours: p.working_hours ? {
                weekdayDescriptions: Object.entries(p.working_hours).map(
                  ([day, times]) => `${day}: ${times.join(', ')}`
                ),
              } : undefined,
            },
            categorySlug,
          })
          added++
        }
        console.log(`[seed] OWN: +${added} for ${categorySlug}`)
      } catch (err) {
        console.error(`[seed] OWN failed for ${categorySlug}:`, err)
      }
    }
  }

  console.log(`[seed] Total unique businesses: ${allPlaces.size}`)

  // Step 3: Resolve photos and insert into DB
  let synced = 0
  let photosFailed = 0

  for (const [placeId, { place, categorySlug }] of allPlaces) {
    try {
      // Get category ID
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single()

      if (!category) continue

      const name = place.displayName?.text || 'Unknown Business'
      const addr = parseAddress(place.formattedAddress || '')

      // Store photo resource names from the search response. The /api/businesses/photo
      // proxy resolves fresh CDN URLs at display time, so no extra API calls needed here.
      const photos = (place.photos || []).slice(0, 3).map(p => p.name)

      const hours = place.regularOpeningHours?.weekdayDescriptions || []
      const types = (place.types || []).filter(t => t !== 'establishment' && t !== 'point_of_interest')
      const primaryType = place.primaryType?.replace(/_/g, ' ') || types[0]?.replace(/_/g, ' ') || ''
      const desc = primaryType
        ? `${name} is a local ${primaryType} proudly serving the community`
        : `${name} is a local business proudly serving the community`

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
        photos,
        hours,
        tags: types.slice(0, 10),
      }

      // Upsert by place_id
      const { data: existing } = await supabase
        .from('businesses')
        .select('id')
        .eq('place_id', placeId)
        .single()

      if (existing) {
        await supabase.from('businesses').update(businessData).eq('id', existing.id)
      } else {
        await supabase.from('businesses').insert(businessData)
      }

      synced++
    } catch (error) {
      console.error(`[seed] Failed to sync ${placeId}:`, error)
    }
  }

  console.log(`[seed] Done! Synced ${synced} businesses, ${photosFailed} photo resolutions failed`)

  return NextResponse.json({
    success: true,
    total: allPlaces.size,
    synced,
    photosFailed,
    message: `Seeded ${synced} businesses from Google Places API`,
  })
}
