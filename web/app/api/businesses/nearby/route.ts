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
import { isLikelySmallBusiness } from '@/lib/business/classify'
import { isDemoContentEnabled, getDemoBusiness } from '@/lib/demo/demo-account-stats'
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
  'food-drink': ['restaurant', 'cafe', 'bakery', 'bar', 'coffee_shop', 'coffee shop', 'fast_food', 'pizza', 'sushi', 'ice_cream', 'food', 'meal_delivery', 'meal_takeaway', 'deli', 'donut', 'bagel', 'juice_bar', 'wine_bar', 'brewery', 'liquor_store', 'frozen_yogurt', 'catering', 'brunch', 'breakfast', 'steak', 'barbecue', 'seafood', 'sandwich', 'butcher', 'butcher_shop', 'meat_market', 'meat market', 'food_store', 'farmers_market', 'health_food_store', 'mexican_restaurant', 'chinese_restaurant', 'indian_restaurant', 'italian_restaurant', 'thai_restaurant', 'japanese_restaurant', 'korean_restaurant', 'vietnamese_restaurant', 'mediterranean_restaurant', 'vegetarian', 'vegan', 'hookah_bar', 'food_court'],
  'retail': ['store', 'shopping', 'clothing', 'book_store', 'book store', 'electronics', 'grocery', 'convenience', 'department', 'shoe', 'gift', 'supermarket', 'market', 'jewelry', 'pet_store', 'florist', 'furniture', 'home_goods', 'sporting_goods', 'bicycle', 'toy', 'music_store', 'thrift', 'pawn', 'cell_phone', 'auto_parts', 'stationery', 'art_supply', 'craft', 'smoke_shop'],
  'services': ['hair_salon', 'hair salon', 'beauty_salon', 'beauty salon', 'nail_salon', 'nail salon', 'spa', 'car_repair', 'car repair', 'car_wash', 'car wash', 'gas_station', 'laundry', 'dry_cleaner', 'plumber', 'electrician', 'bank', 'insurance', 'real_estate', 'locksmith', 'tailor', 'tattoo', 'moving', 'photographer', 'photography', 'print', 'pet_grooming', 'travel_agency', 'painter', 'roofing', 'towing', 'shoe_repair', 'accounting'],
  'entertainment': ['movie_theater', 'movie theater', 'museum', 'park', 'tourist_attraction', 'art_gallery', 'night_club', 'amusement', 'bowling', 'zoo', 'aquarium', 'karaoke', 'escape_room', 'arcade', 'skating', 'golf', 'trampoline', 'laser_tag', 'climbing', 'concert', 'event_venue', 'convention'],
  'health-wellness': ['gym', 'fitness', 'spa', 'doctor', 'dentist', 'hospital', 'physiotherapist', 'pharmacy', 'veterinary', 'yoga', 'pilates', 'martial_arts', 'chiropractor', 'optometrist', 'optician', 'urgent_care', 'medical_lab', 'swimming_pool', 'dance_studio'],
  'arts-culture': ['art_gallery', 'art gallery', 'museum', 'library', 'book_store', 'book store', 'performing_arts', 'theater', 'concert_hall', 'dance_studio'],
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
    'butcher_shop': (n) => `${n} is a local meat market offering fresh cuts, prepared meats, and butcher-shop staples`,
    'food_store': (n) => `${n} is a local food market with fresh staples and specialty goods`,
    'farmers_market': (n) => `${n} is a local market connecting shoppers with fresh food and regional producers`,
    'convenience_store': (n) => `${n} has quick essentials, snacks, and everyday items`,
    'hair_care': (n) => `${n} provides professional hair styling, cuts, and treatments`,
    'hair_salon': (n) => `${n} provides professional hair styling, cuts, and treatments`,
    'nail_salon': (n) => `${n} offers nail care, manicures, pedicures, and beauty treatments`,
    'beauty_salon': (n) => `${n} offers beauty services, treatments, and personal care`,
    'spa': (n) => `${n} provides relaxing spa treatments and wellness services`,
    'gym': (n) => `${n} is a fitness center with equipment, classes, and training`,
    'fitness_center': (n) => `${n} is a fitness center with equipment, classes, and training`,
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
    'pharmacy': (n) => `${n} is a local pharmacy offering prescriptions and health products`,
    'pet_store': (n) => `${n} carries pet supplies, food, and accessories for your furry friends`,
    'veterinary_care': (n) => `${n} provides veterinary care and animal health services`,
    'florist': (n) => `${n} creates beautiful floral arrangements for every occasion`,
    'jewelry_store': (n) => `${n} offers fine jewelry, watches, and accessories`,
    'laundry': (n) => `${n} provides professional laundry and cleaning services`,
    'dry_cleaner': (n) => `${n} offers dry cleaning and garment care services`,
    'tattoo_parlor': (n) => `${n} is a tattoo studio offering custom artwork and piercings`,
    'yoga_studio': (n) => `${n} offers yoga classes and mindful movement sessions`,
    'brewery': (n) => `${n} crafts local beers and offers tastings in a relaxed setting`,
    'wine_bar': (n) => `${n} serves curated wines in a cozy, inviting atmosphere`,
    'coffee_shop': (n) => `${n} is a local coffee spot serving specialty drinks and treats`,
    'ice_cream_shop': (n) => `${n} serves delicious ice cream, gelato, and frozen treats`,
    'pizza_restaurant': (n) => `${n} serves fresh, handcrafted pizzas and Italian favorites`,
    'sushi_restaurant': (n) => `${n} offers fresh sushi, sashimi, and Japanese cuisine`,
    'mexican_restaurant': (n) => `${n} serves authentic Mexican cuisine and flavors`,
    'chinese_restaurant': (n) => `${n} offers traditional Chinese dishes and flavors`,
    'italian_restaurant': (n) => `${n} serves classic Italian cuisine in a warm setting`,
    'thai_restaurant': (n) => `${n} brings authentic Thai flavors and spices to the table`,
    'japanese_restaurant': (n) => `${n} offers Japanese cuisine, from ramen to teriyaki`,
    'korean_restaurant': (n) => `${n} serves Korean cuisine, from BBQ to bibimbap`,
    'indian_restaurant': (n) => `${n} offers flavorful Indian dishes and aromatic spices`,
    'seafood_restaurant': (n) => `${n} serves fresh seafood and ocean-inspired dishes`,
    'steak_house': (n) => `${n} offers premium steaks and hearty American fare`,
    'barbecue_restaurant': (n) => `${n} serves slow-smoked BBQ and classic sides`,
    'bowling_alley': (n) => `${n} is a fun spot for bowling, games, and socializing`,
    'arcade': (n) => `${n} is packed with arcade games and entertainment for all ages`,
    'karaoke': (n) => `${n} offers private karaoke rooms and a fun night out`,
    'escape_room': (n) => `${n} challenges you with immersive escape room puzzles`,
    'martial_arts_school': (n) => `${n} teaches martial arts, self-defense, and discipline`,
    'chiropractor': (n) => `${n} provides chiropractic care and spinal adjustments`,
    'optometrist': (n) => `${n} offers eye exams, vision care, and eyewear`,
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
  'food-drink': ['restaurant', 'cafe', 'bakery', 'bar', 'coffee_shop', 'fast_food_restaurant', 'pizza_restaurant', 'ice_cream_shop', 'mexican_restaurant', 'chinese_restaurant', 'indian_restaurant', 'italian_restaurant', 'thai_restaurant', 'japanese_restaurant', 'seafood_restaurant', 'steak_house', 'barbecue_restaurant', 'breakfast_restaurant', 'sandwich_shop', 'sushi_restaurant', 'vietnamese_restaurant', 'korean_restaurant', 'mediterranean_restaurant', 'vegetarian_restaurant', 'brunch_restaurant', 'deli', 'juice_bar', 'donut_shop', 'wine_bar', 'brewery', 'liquor_store', 'butcher_shop', 'food_store', 'farmers_market', 'market'],
  'retail': ['store', 'shopping_mall', 'clothing_store', 'book_store', 'electronics_store', 'grocery_store', 'convenience_store', 'gift_shop', 'shoe_store', 'jewelry_store', 'pet_store', 'florist', 'furniture_store', 'home_goods_store', 'sporting_goods_store', 'bicycle_store', 'toy_store', 'music_store', 'thrift_store', 'cell_phone_store', 'auto_parts_store'],
  'services': ['hair_salon', 'beauty_salon', 'nail_salon', 'spa', 'car_repair', 'car_wash', 'laundry', 'dry_cleaner', 'bank', 'insurance_agency', 'real_estate_agency', 'locksmith', 'tailor', 'tattoo_parlor', 'plumber', 'electrician', 'moving_company', 'photographer', 'print_shop', 'pet_grooming', 'travel_agency'],
  'entertainment': ['movie_theater', 'museum', 'tourist_attraction', 'art_gallery', 'night_club', 'amusement_park', 'bowling_alley', 'karaoke', 'escape_room', 'arcade', 'skating_rink', 'golf_course', 'trampoline_park', 'zoo', 'aquarium', 'concert_hall', 'event_venue'],
  'health-wellness': ['gym', 'spa', 'doctor', 'dentist', 'hospital', 'pharmacy', 'physiotherapist', 'veterinary_care', 'yoga_studio', 'pilates_studio', 'martial_arts_school', 'chiropractor', 'optometrist', 'urgent_care', 'fitness_center'],
  'arts-culture': ['art_gallery', 'museum', 'library', 'book_store', 'performing_arts_theater', 'concert_hall', 'dance_studio', 'art_supply_store', 'craft_store'],
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

// ============================================================================
// OSM amenity/shop values → internal category slug
// ============================================================================
const OSM_AMENITY_CATEGORY: Record<string, string> = {
  restaurant: 'food-drink', cafe: 'food-drink', bar: 'food-drink',
  pub: 'food-drink', fast_food: 'food-drink', food_court: 'food-drink',
  ice_cream: 'food-drink', bakery: 'food-drink', biergarten: 'food-drink',
  pharmacy: 'health-wellness', doctors: 'health-wellness', dentist: 'health-wellness',
  veterinary: 'health-wellness', clinic: 'health-wellness', hospital: 'health-wellness',
  cinema: 'entertainment', theatre: 'entertainment', nightclub: 'entertainment',
  arts_centre: 'arts-culture', community_centre: 'arts-culture',
  car_repair: 'services', car_wash: 'services', bank: 'services',
  beauty: 'services', hairdresser: 'services',
}

const OSM_SHOP_CATEGORY: Record<string, string> = {
  supermarket: 'retail', convenience: 'retail', clothes: 'retail',
  shoes: 'retail', jewelry: 'retail', florist: 'retail',
  gift: 'retail', books: 'retail', electronics: 'retail',
  furniture: 'retail', hardware: 'retail', pet: 'retail',
  sports: 'retail', toys: 'retail', bicycle: 'retail',
  bakery: 'food-drink', butcher: 'food-drink', deli: 'food-drink',
  pastry: 'food-drink', seafood: 'food-drink', wine: 'food-drink',
  alcohol: 'food-drink', coffee: 'food-drink', tea: 'food-drink',
  beauty: 'services', hairdresser: 'services', tattoo: 'services',
  laundry: 'services', dry_cleaning: 'services', tailor: 'services',
  car_repair: 'services', car_parts: 'services', tyres: 'services',
  optician: 'health-wellness', medical_supply: 'health-wellness',
  herbalist: 'health-wellness', nutrition_supplements: 'health-wellness',
  art: 'arts-culture', music: 'arts-culture', musical_instrument: 'arts-culture',
  photo: 'services', copyshop: 'services', mobile_phone: 'retail',
  garden_centre: 'retail', variety_store: 'retail', second_hand: 'retail',
  antiques: 'retail', craft: 'arts-culture',
}

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

// Overpass caps at 80km radius to avoid server-side timeouts on mega-queries.
const OVERPASS_SEED_RADIUS = 80000

/**
 * Fetch businesses from OpenStreetMap via the free Overpass API.
 * Uses a large fixed radius (80km / ~50mi) so the DB gets seeded broadly
 * on the first visit — subsequent requests hit the cached DB instead.
 */
async function fetchFromOverpass(
  location: LatLng,
): Promise<GooglePlaceResult[]> {
  try {
    const r = OVERPASS_SEED_RADIUS
    const query = `
[out:json][timeout:60];
(
  node["amenity"~"restaurant|cafe|bar|pub|fast_food|bakery|ice_cream|pharmacy|doctors|dentist|veterinary|clinic|cinema|theatre|nightclub|arts_centre|car_repair|car_wash|bank|beauty|hairdresser|food_court"](around:${r},${location.lat},${location.lng});
  node["shop"](around:${r},${location.lat},${location.lng});
  node["tourism"~"hotel|motel|guest_house|hostel|museum|gallery|attraction"](around:${r},${location.lat},${location.lng});
  node["leisure"~"fitness_centre|sports_centre|bowling_alley|amusement_arcade|escape_game|dance"](around:${r},${location.lat},${location.lng});
  node["craft"](around:${r},${location.lat},${location.lng});
  way["amenity"~"restaurant|cafe|bar|pub|fast_food|bakery|ice_cream|pharmacy|doctors|dentist|veterinary|clinic|cinema|theatre|nightclub|arts_centre|car_repair|car_wash|bank|beauty|hairdresser|food_court"](around:${r},${location.lat},${location.lng});
  way["shop"](around:${r},${location.lat},${location.lng});
  way["tourism"~"hotel|motel|guest_house|museum|gallery|attraction"](around:${r},${location.lat},${location.lng});
  way["leisure"~"fitness_centre|sports_centre|bowling_alley|amusement_arcade|escape_game|dance"](around:${r},${location.lat},${location.lng});
);
out center body;
`
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })

    if (!res.ok) {
      console.error('Overpass API error:', res.status)
      return []
    }

    const data = await res.json() as { elements: OverpassElement[] }
    const elements = data.elements || []

    return elements
      .filter(el => {
        const t = el.tags
        if (!t || !t.name) return false
        if (ADULT_BUSINESS_PATTERN.test(t.name)) return false
        return true
      })
      .map(el => {
        const t = el.tags!
        const lat = el.lat ?? el.center?.lat ?? 0
        const lon = el.lon ?? el.center?.lon ?? 0
        if (!lat || !lon) return null

        const amenity = t.amenity || ''
        const shop = t.shop || ''
        const tourism = t.tourism || ''
        const leisure = t.leisure || ''
        const craft = t.craft || ''

        const types: string[] = []
        if (amenity) types.push(amenity)
        if (shop) types.push(shop, 'store')
        if (tourism) types.push(tourism)
        if (leisure) types.push(leisure)
        if (craft) types.push(craft)
        if (t.cuisine) types.push(...t.cuisine.split(';').map(c => c.trim()))

        const addr = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')
        const city = t['addr:city'] || ''
        const state = t['addr:state'] || ''
        const zip = t['addr:postcode'] || ''
        const formattedAddress = [addr, city, state, zip].filter(Boolean).join(', ')

        const osmId = `osm_${el.type}_${el.id}`

        let hours: string[] | undefined
        if (t.opening_hours) {
          hours = [t.opening_hours]
        }

        return {
          id: osmId,
          displayName: { text: t.name },
          formattedAddress,
          location: { latitude: lat, longitude: lon },
          rating: undefined,
          userRatingCount: undefined,
          nationalPhoneNumber: t.phone || t['contact:phone'] || undefined,
          websiteUri: t.website || t['contact:website'] || undefined,
          types,
          primaryType: amenity || shop || tourism || leisure || craft || undefined,
          priceLevel: undefined,
          photos: [],
          regularOpeningHours: hours ? { weekdayDescriptions: hours } : undefined,
        } as GooglePlaceResult
      })
      .filter((p): p is GooglePlaceResult => p !== null)
  } catch (error) {
    console.error('Overpass API fetch failed:', error)
    return []
  }
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
      const isOsm = place.id?.startsWith('osm_') ?? false

      // OSM entries use different type vocabularies — skip the Google-centric
      // type check for them; they were already filtered by the Overpass query.
      if (!isOsm && !isRealBusinessPlaceTypes(types)) continue

      // Skip chains/franchises and big-box/large-format places entirely —
      // Pulse only lists independent small businesses.
      const displayName = place.displayName?.text || ''
      if (!isLikelySmallBusiness({ name: displayName, types, userRatingCount: place.userRatingCount })) {
        continue
      }

      // Map types to internal category — OSM amenity/shop keys first,
      // then fall back to the Google-oriented subtype map.
      let categorySlug: string | undefined
      if (isOsm) {
        for (const t of types) {
          if (OSM_AMENITY_CATEGORY[t]) { categorySlug = OSM_AMENITY_CATEGORY[t]; break }
          if (OSM_SHOP_CATEGORY[t]) { categorySlug = OSM_SHOP_CATEGORY[t]; break }
        }
      }
      if (!categorySlug) {
        categorySlug = mapSubtypeToCategory(types)
      }

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
      const addr = isOsm
        ? { city: place.formattedAddress?.split(', ')[1] || '', state: place.formattedAddress?.split(', ')[2] || '', zip: place.formattedAddress?.split(', ')[3] || '' }
        : parseAddress(place.formattedAddress || '')
      const desc = generateDescription(place)

      const photos = (place.photos || []).slice(0, 3).map((p) => ({
        photo_reference: p.name,
        height: p.heightPx || 0,
        width: p.widthPx || 0,
      }))

      const hours = place.regularOpeningHours?.weekdayDescriptions || []
      const tags = types
        .filter(t => t !== 'establishment' && t !== 'point_of_interest')
        .slice(0, 10)

      const businessData = {
        name,
        slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50)}-${placeId.replace(/[^a-z0-9]/gi, '').substring(0, 30)}`,
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
        data_source: isOsm ? 'osm' as const : 'google' as const,
        is_verified: !isOsm,
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

// Cap markers returned to the client. The map only needs the closest results;
// returning every row in a dense metro (thousands) bloats the payload and makes
// the map laggy (each result is a DOM marker). 250 keeps coverage while staying
// smooth to pan/zoom.
const MAX_NEARBY_RESULTS = 250

// Great-circle distance in meters between two coordinates.
function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
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

    const { data: existingBusinesses, error: dbError } = await query.limit(1000)

    if (dbError) {
      console.error('Database error:', dbError)
    }

    const filteredExistingBusinesses = (existingBusinesses || []).filter((business) =>
      isRealBusinessRecord({
        data_source: business.data_source,
        tags: business.tags,
        name: business.name,
        is_chain: business.is_chain,
        review_count: business.review_count,
      })
    )

    // Fetch from Google Places if we don't have many results for this area,
    // or if the user explicitly requests a refresh.
    // Scale threshold by radius — larger area should have more businesses.
    const expectedForRadius = Math.max(20, Math.round(radius / 500))
    const shouldFetch = forceRefresh || filteredExistingBusinesses.length < expectedForRadius
    let places: GooglePlaceResult[] = []
    if (shouldFetch) {
      // Overpass (OSM) seeds aggressively with an 80km radius — free, no cap.
      // Google Places adds quality data (photos, ratings) for the immediate area.
      const overpassPromise = fetchFromOverpass(location)

      if (category) {
        const [googleResults, osmResults] = await Promise.all([
          fetchFromGooglePlaces(location, radius, category),
          overpassPromise,
        ])
        const seen = new Set<string>()
        for (const p of [...googleResults, ...osmResults]) {
          if (p.id && !seen.has(p.id)) {
            seen.add(p.id)
            places.push(p)
          }
        }
      } else {
        // No category filter: fetch Google across categories for quality data
        // with photos/ratings, plus Overpass for sheer volume and coverage.
        const diverseCategories = Object.keys(CATEGORY_GOOGLE_TYPES)
        const fetchPromises: Promise<GooglePlaceResult[]>[] = [overpassPromise]
        for (const cat of diverseCategories) {
          fetchPromises.push(fetchFromGooglePlaces(location, radius, cat))
        }
        const allResults = await Promise.all(fetchPromises)
        const seen = new Set<string>()
        for (const batch of allResults) {
          for (const p of batch) {
            if (p.id && !seen.has(p.id)) {
              seen.add(p.id)
              places.push(p)
            }
          }
        }
      }
    }

    if (places.length > 0) {
      await syncPlacesToDatabase(places, supabase)
    }

    // Resolve the category id once (if filtering) for the synced fetch below.
    let syncedCategoryId: string | undefined
    if (category) {
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .single()
      syncedCategoryId = categoryData?.id
    }

    // Fetch ALL businesses in the bounding box, paging past the 1000-row cap.
    // A dense metro can hold several thousand rows in the box; a single capped
    // query returns an arbitrary (insertion-order) slice, which silently drops
    // the genuinely-nearest businesses and biases the map to one side. We page
    // through everything, then sort by true distance and keep the closest N.
    const PAGE = 1000
    const MAX_SCAN = 6000 // safety ceiling on rows scanned
    const syncedBusinesses: NonNullable<typeof existingBusinesses> = []
    for (let from = 0; from < MAX_SCAN; from += PAGE) {
      let pageQuery = supabase
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

      if (syncedCategoryId) {
        pageQuery = pageQuery.eq('category_id', syncedCategoryId)
      }

      const { data: pageRows, error: pageError } = await pageQuery.range(from, from + PAGE - 1)
      if (pageError) {
        console.error('Error fetching synced businesses:', pageError)
        // If we already have some rows, return what we've got rather than 500.
        if (syncedBusinesses.length === 0) {
          return NextResponse.json(
            { error: 'Failed to fetch businesses' },
            { status: 500 }
          )
        }
        break
      }
      if (!pageRows || pageRows.length === 0) break
      syncedBusinesses.push(...pageRows)
      if (pageRows.length < PAGE) break
    }

    // Keep only real independent businesses that fall inside the actual search
    // radius (the DB query uses a rectangular box, so its corners reach beyond
    // the requested radius — filter to the true circle here).
    const withinRadius = syncedBusinesses.filter((business) => {
      if (business.latitude == null || business.longitude == null) return false
      if (haversineMeters(lat, lng, business.latitude, business.longitude) > radius) return false
      return isRealBusinessRecord({
        data_source: business.data_source,
        tags: business.tags,
        name: business.name,
        is_chain: business.is_chain,
        review_count: business.review_count,
      })
    })

    // Inject demo business when demo mode is active
    if (isDemoContentEnabled()) {
      const demoBiz = getDemoBusiness()
      const alreadyPresent = withinRadius.some(b => b.id === demoBiz.id)
      if (!alreadyPresent) {
        withinRadius.unshift(demoBiz)
      }
    }

    // Sort by true (great-circle) distance, nearest first, and keep the closest N.
    const sorted = withinRadius
      .sort((a, b) =>
        haversineMeters(lat, lng, a.latitude!, a.longitude!) -
        haversineMeters(lat, lng, b.latitude!, b.longitude!)
      )
      .slice(0, MAX_NEARBY_RESULTS)

    return NextResponse.json(sorted)
  } catch (error) {
    console.error('Error in nearby businesses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
