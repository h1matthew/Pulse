#!/usr/bin/env tsx
/**
 * Bulk US Business Seed Script
 *
 * Scrapes local businesses from the Google Places API v2 across major US
 * metros and upserts them into the Supabase `businesses` table. Reuses the
 * same filtering rules as the live /api/businesses/nearby sync pipeline:
 * chains/franchises, educational institutions, adult businesses, and
 * permanently closed places are excluded.
 *
 * Usage:
 *   npm run db:seed-businesses                            # all metros
 *   npm run db:seed-businesses -- --cities san-antonio    # one metro
 *   npm run db:seed-businesses -- --cities san-antonio,austin --radius 15000
 *   npm run db:seed-businesses -- --photos 1              # fewer photo API calls
 *
 * Requires in web/.env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY,
 * GOOGLE_PLACES_API_KEY
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { isLikelySmallBusiness } from '../../lib/business/classify'
import { isRealBusinessPlaceTypes } from '../../lib/business/display'
import { gridPoints } from '../../lib/business/geo-grid'

// ============================================================================
// Config
// ============================================================================

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || ''

interface CityTarget {
  slug: string
  name: string
  state: string
  lat: number
  lng: number
}

/** Major US metros, ordered roughly by population. */
const US_CITIES: CityTarget[] = [
  { slug: 'new-york', name: 'New York', state: 'NY', lat: 40.7128, lng: -74.006 },
  { slug: 'los-angeles', name: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { slug: 'chicago', name: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { slug: 'houston', name: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
  { slug: 'phoenix', name: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.074 },
  { slug: 'philadelphia', name: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
  { slug: 'san-antonio', name: 'San Antonio', state: 'TX', lat: 29.4252, lng: -98.4946 },
  { slug: 'san-diego', name: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611 },
  { slug: 'dallas', name: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.797 },
  { slug: 'austin', name: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431 },
  { slug: 'jacksonville', name: 'Jacksonville', state: 'FL', lat: 30.3322, lng: -81.6557 },
  { slug: 'fort-worth', name: 'Fort Worth', state: 'TX', lat: 32.7555, lng: -97.3308 },
  { slug: 'san-jose', name: 'San Jose', state: 'CA', lat: 37.3382, lng: -121.8863 },
  { slug: 'columbus', name: 'Columbus', state: 'OH', lat: 39.9612, lng: -82.9988 },
  { slug: 'charlotte', name: 'Charlotte', state: 'NC', lat: 35.2271, lng: -80.8431 },
  { slug: 'indianapolis', name: 'Indianapolis', state: 'IN', lat: 39.7684, lng: -86.1581 },
  { slug: 'san-francisco', name: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194 },
  { slug: 'seattle', name: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
  { slug: 'denver', name: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
  { slug: 'washington', name: 'Washington', state: 'DC', lat: 38.9072, lng: -77.0369 },
  { slug: 'nashville', name: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816 },
  { slug: 'oklahoma-city', name: 'Oklahoma City', state: 'OK', lat: 35.4676, lng: -97.5164 },
  { slug: 'el-paso', name: 'El Paso', state: 'TX', lat: 31.7619, lng: -106.485 },
  { slug: 'boston', name: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589 },
  { slug: 'portland', name: 'Portland', state: 'OR', lat: 45.5152, lng: -122.6784 },
  { slug: 'las-vegas', name: 'Las Vegas', state: 'NV', lat: 36.1699, lng: -115.1398 },
  { slug: 'detroit', name: 'Detroit', state: 'MI', lat: 42.3314, lng: -83.0458 },
  { slug: 'memphis', name: 'Memphis', state: 'TN', lat: 35.1495, lng: -90.049 },
  { slug: 'louisville', name: 'Louisville', state: 'KY', lat: 38.2527, lng: -85.7585 },
  { slug: 'baltimore', name: 'Baltimore', state: 'MD', lat: 39.2904, lng: -76.6122 },
  { slug: 'milwaukee', name: 'Milwaukee', state: 'WI', lat: 43.0389, lng: -87.9065 },
  { slug: 'albuquerque', name: 'Albuquerque', state: 'NM', lat: 35.0844, lng: -106.6504 },
  { slug: 'tucson', name: 'Tucson', state: 'AZ', lat: 32.2226, lng: -110.9747 },
  { slug: 'sacramento', name: 'Sacramento', state: 'CA', lat: 38.5816, lng: -121.4944 },
  { slug: 'kansas-city', name: 'Kansas City', state: 'MO', lat: 39.0997, lng: -94.5786 },
  { slug: 'atlanta', name: 'Atlanta', state: 'GA', lat: 33.749, lng: -84.388 },
  { slug: 'miami', name: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
  { slug: 'raleigh', name: 'Raleigh', state: 'NC', lat: 35.7796, lng: -78.6382 },
  { slug: 'minneapolis', name: 'Minneapolis', state: 'MN', lat: 44.9778, lng: -93.265 },
  { slug: 'new-orleans', name: 'New Orleans', state: 'LA', lat: 29.9511, lng: -90.0715 },
  { slug: 'tampa', name: 'Tampa', state: 'FL', lat: 27.9506, lng: -82.4572 },
  { slug: 'cleveland', name: 'Cleveland', state: 'OH', lat: 41.4993, lng: -81.6944 },
  { slug: 'pittsburgh', name: 'Pittsburgh', state: 'PA', lat: 40.4406, lng: -79.9959 },
  { slug: 'st-louis', name: 'St. Louis', state: 'MO', lat: 38.627, lng: -90.1994 },
  { slug: 'cincinnati', name: 'Cincinnati', state: 'OH', lat: 39.1031, lng: -84.512 },
  { slug: 'salt-lake-city', name: 'Salt Lake City', state: 'UT', lat: 40.7608, lng: -111.891 },
]

/**
 * Cities given extra-dense coverage. Priority cities are seeded first and use a
 * grid of search centers plus per-type searches (each Google type gets its own
 * 20-result call) instead of one grouped 20-result call per category — which
 * yields many more businesses for that metro. Override with `--priority <slugs>`.
 */
const DEFAULT_PRIORITY_SLUGS = ['san-antonio']

// Grid spacing for priority cities: rings=1 → 3×3 centers, ~8km apart, each
// searched at a 6km radius. Covers roughly a 22km × 22km area with overlap.
const PRIORITY_GRID_RINGS = 1
const PRIORITY_GRID_STEP_METERS = 8000
const PRIORITY_SEARCH_RADIUS = 6000

// Same category → Google place types mapping as the live sync pipeline
const CATEGORY_GOOGLE_TYPES: Record<string, string[]> = {
  'food-drink': ['restaurant', 'cafe', 'bakery', 'bar', 'coffee_shop', 'pizza_restaurant', 'ice_cream_shop'],
  'retail': ['store', 'clothing_store', 'book_store', 'grocery_store', 'gift_shop', 'shoe_store'],
  'services': ['hair_salon', 'beauty_salon', 'spa', 'car_repair', 'car_wash', 'laundry'],
  'entertainment': ['movie_theater', 'museum', 'tourist_attraction', 'art_gallery', 'bowling_alley'],
  'health-wellness': ['gym', 'spa', 'pharmacy', 'dentist', 'physiotherapist', 'veterinary_care'],
  'arts-culture': ['art_gallery', 'museum', 'library', 'book_store', 'performing_arts_theater'],
}

const EDUCATIONAL_SUBTYPES = [
  'school', 'primary_school', 'secondary_school', 'high_school',
  'university', 'preschool', 'kindergarten', 'college',
]

const ADULT_BUSINESS_PATTERN =
  /\b(adult\s+store|adult\s+shop|sex\s+shop|adult\s+entertainment|adult\s+novelty|adult\s+video|adult\s+bookstore|adult\s+superstore)\b/i

// ============================================================================
// Google Places API v2
// ============================================================================

interface GooglePlacePhoto {
  name: string
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
  regularOpeningHours?: { weekdayDescriptions?: string[] }
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
      rankPreference: 'POPULARITY',
      languageCode: 'en',
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: Math.min(radius, 50000) },
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`   ⚠️  Google Places error (${includedTypes[0]}…):`, err.slice(0, 150))
    return []
  }

  const data = await res.json()
  return (data.places || []) as GooglePlaceResult[]
}

// ============================================================================
// Transform helpers (mirrors /api/businesses/nearby sync logic)
// ============================================================================

function passesContentFilters(place: GooglePlaceResult): boolean {
  if (place.businessStatus === 'CLOSED_PERMANENTLY') return false

  const name = place.displayName?.text || ''
  if (!name || ADULT_BUSINESS_PATTERN.test(name)) return false

  const types = place.types || []
  if (types.some((t) => EDUCATIONAL_SUBTYPES.some((edu) => t.includes(edu)))) return false
  if (!isRealBusinessPlaceTypes(types)) return false
  // Stronger than a chain-name check: also drops big-box/large-format places and
  // very high-volume operations so seeded rows are genuinely small businesses.
  if (!isLikelySmallBusiness({ name, types, userRatingCount: place.userRatingCount })) {
    return false
  }

  return true
}

function parseAddress(formatted: string): { city: string; state: string; zip: string } {
  // "123 Main St, San Antonio, TX 78205, USA"
  const parts = formatted.split(',').map((s) => s.trim())
  const city = parts[1] || ''
  const stateZip = parts[2] || ''
  const match = stateZip.match(/^([A-Z]{2})\s*(\d{5})?/)
  return { city, state: match?.[1] || '', zip: match?.[2] || '' }
}

function convertPriceLevel(level?: string | null): number | null {
  // DB check constraint requires 1-4 or NULL, so FREE maps to null
  switch (level) {
    case 'PRICE_LEVEL_INEXPENSIVE': return 1
    case 'PRICE_LEVEL_MODERATE': return 2
    case 'PRICE_LEVEL_EXPENSIVE': return 3
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return 4
    default: return null
  }
}

function generateDescription(place: GooglePlaceResult): string {
  const name = place.displayName?.text || 'This business'
  const primaryType =
    place.primaryType?.replace(/_/g, ' ') ||
    place.types?.[0]?.replace(/_/g, ' ') ||
    ''
  return primaryType
    ? `${name} is a local ${primaryType} proudly serving the community`
    : `${name} is a local business proudly serving the community`
}

/** Run async tasks with bounded concurrency. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
}

// ============================================================================
// Main
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2)
  const getFlag = (name: string): string | undefined => {
    const i = args.indexOf(`--${name}`)
    return i >= 0 ? args[i + 1] : undefined
  }
  const priorityFlag = getFlag('priority')
  return {
    cities: getFlag('cities')?.split(',').map((s) => s.trim().toLowerCase()),
    radius: Number(getFlag('radius')) || 12000,
    photosPerBusiness: Math.max(0, Math.min(3, Number(getFlag('photos') ?? 3))),
    prioritySlugs:
      priorityFlag !== undefined
        ? priorityFlag.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
        : DEFAULT_PRIORITY_SLUGS,
  }
}

async function main() {
  const { cities: citiesFilter, radius, photosPerBusiness, prioritySlugs } = parseArgs()
  const prioritySet = new Set(prioritySlugs)

  if (!GOOGLE_API_KEY) {
    console.error('❌ Missing GOOGLE_PLACES_API_KEY in web/.env')
    process.exit(1)
  }
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in web/.env')
    process.exit(1)
  }

  const selected = citiesFilter
    ? US_CITIES.filter((c) => citiesFilter.includes(c.slug))
    : US_CITIES

  // Seed priority cities first (so they finish even if a long run is interrupted).
  const targets = [...selected].sort(
    (a, b) => (prioritySet.has(a.slug) ? 0 : 1) - (prioritySet.has(b.slug) ? 0 : 1)
  )

  if (targets.length === 0) {
    console.error(`❌ No matching cities. Valid slugs:\n   ${US_CITIES.map((c) => c.slug).join(', ')}`)
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)

  // Load category slug → id map once
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, slug')
  if (catError || !categories?.length) {
    console.error('❌ Failed to load categories:', catError?.message)
    process.exit(1)
  }
  const categoryIds = new Map(categories.map((c) => [c.slug, c.id]))

  // Load existing place_ids so we can report new vs updated
  const { data: existingRows } = await supabase
    .from('businesses')
    .select('place_id')
    .not('place_id', 'is', null)
  const existingPlaceIds = new Set((existingRows || []).map((r) => r.place_id))

  const priorityInRun = targets.filter((c) => prioritySet.has(c.slug)).map((c) => c.slug)
  console.log(`🌎 Seeding ${targets.length} cities (radius ${radius}m, ${photosPerBusiness} photos/business)`)
  if (priorityInRun.length > 0) {
    console.log(`   ★ Priority (dense grid + per-type): ${priorityInRun.join(', ')}`)
  }
  console.log(`   Existing businesses with place_id: ${existingPlaceIds.size}\n`)

  let totalNew = 0
  let totalUpdated = 0
  let totalSkipped = 0

  for (const [cityIndex, city] of targets.entries()) {
    const isPriority = prioritySet.has(city.slug)
    const centers = isPriority
      ? gridPoints(city.lat, city.lng, PRIORITY_GRID_RINGS, PRIORITY_GRID_STEP_METERS)
      : [{ lat: city.lat, lng: city.lng }]
    const searchRadius = isPriority ? PRIORITY_SEARCH_RADIUS : radius

    console.log(
      `📍 [${cityIndex + 1}/${targets.length}] ${city.name}, ${city.state}` +
        (isPriority ? ` ★ priority — ${centers.length} centers, per-type search` : '')
    )

    // Fetch all categories for this city, dedup by place_id
    const cityPlaces = new Map<string, { place: GooglePlaceResult; categorySlug: string }>()
    for (const center of centers) {
      for (const [categorySlug, types] of Object.entries(CATEGORY_GOOGLE_TYPES)) {
        // Priority cities search each type individually (each yields up to 20
        // results); other cities use one grouped call per category.
        const typeBatches = isPriority ? types.map((t) => [t]) : [types]
        for (const batch of typeBatches) {
          const places = await searchNearby(center.lat, center.lng, searchRadius, batch)
          for (const place of places) {
            if (place.id && !cityPlaces.has(place.id)) {
              cityPlaces.set(place.id, { place, categorySlug })
            }
          }
        }
      }
    }

    const candidates = [...cityPlaces.values()].filter(({ place }) => {
      if (passesContentFilters(place)) return true
      totalSkipped++
      return false
    })

    // Resolve photo CDN URLs with bounded concurrency
    const rows = await mapWithConcurrency(candidates, 8, async ({ place, categorySlug }) => {
      const categoryId = categoryIds.get(categorySlug)
      if (!categoryId) return null

      const name = place.displayName?.text || 'Unknown Business'
      const addr = parseAddress(place.formattedAddress || '')
      const desc = generateDescription(place)

      // Store the raw Google photo *resource name* (e.g. "places/XYZ/photos/abc")
      // straight from the search response — these come free with the search we
      // already paid for. The /api/businesses/photo proxy resolves them to images
      // on demand (and caches), so we make zero extra Place Photo calls here.
      const photos = (place.photos || [])
        .slice(0, photosPerBusiness)
        .map((p) => ({ photo_reference: p.name, height: 0, width: 0 }))

      const types = (place.types || []).filter(
        (t) => t !== 'establishment' && t !== 'point_of_interest'
      )

      return {
        name,
        slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50)}-${place.id.substring(0, 8)}`,
        description: desc,
        short_description: desc.substring(0, 100),
        address: place.formattedAddress || '',
        city: addr.city || city.name,
        state: addr.state || city.state,
        zip_code: addr.zip,
        latitude: place.location?.latitude || 0,
        longitude: place.location?.longitude || 0,
        phone: place.nationalPhoneNumber || null,
        website: place.websiteUri || null,
        price_range: convertPriceLevel(place.priceLevel),
        average_rating: place.rating || 0,
        review_count: place.userRatingCount || 0,
        category_id: categoryId,
        place_id: place.id,
        data_source: 'google',
        is_verified: true,
        is_chain: false,
        photos,
        hours: place.regularOpeningHours?.weekdayDescriptions || [],
        tags: types.slice(0, 10),
      }
    })

    const validRows = rows.filter((r): r is NonNullable<typeof r> => r !== null)
    const newCount = validRows.filter((r) => !existingPlaceIds.has(r.place_id)).length

    const { error: upsertError } = await supabase
      .from('businesses')
      .upsert(validRows, { onConflict: 'place_id' })

    if (upsertError) {
      console.error(`   ❌ Upsert failed for ${city.name}:`, upsertError.message)
      continue
    }

    for (const r of validRows) existingPlaceIds.add(r.place_id)
    totalNew += newCount
    totalUpdated += validRows.length - newCount
    console.log(`   ✅ ${validRows.length} businesses (${newCount} new, ${validRows.length - newCount} updated)`)
  }

  console.log(`\n🎉 Done! ${totalNew} new businesses, ${totalUpdated} updated, ${totalSkipped} filtered out (chains/schools/closed)`)
}

main().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
